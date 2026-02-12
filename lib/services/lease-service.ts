import { createClient } from '@/lib/supabase/server';
import type { Reservation, Lease, LeaseParticipant, LeaseStatus, ReservationStatus } from '@/types/database';
import type { ReservationFormData, LeaseFormData, LeaseParticipantFormData } from '@/zod-schemas';
import { updateBedStatus } from './property-service';

// =====================================================
// RESERVATIONS SERVICE
// =====================================================

export async function getReservations(filters?: {
  houseId?: string;
  status?: ReservationStatus;
  fromDate?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('reservations')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      bed:beds(id, bed_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .order('start_date', { ascending: true });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getReservationById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      house:houses(*),
      room:rooms(*),
      bed:beds(*),
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createReservation(data: ReservationFormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      ...data,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Update bed status to reserved
  if (data.bed_id) {
    await updateBedStatus(data.bed_id, 'reserved');
  }

  return reservation;
}

export async function updateReservation(id: string, data: Partial<ReservationFormData>) {
  const supabase = await createClient();
  
  const { data: reservation, error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return reservation;
}

export async function cancelReservation(id: string) {
  const supabase = await createClient();
  
  // Get reservation to check bed
  const { data: reservation, error: getError } = await supabase
    .from('reservations')
    .select('bed_id')
    .eq('id', id)
    .single();

  if (getError) throw getError;

  // Update status
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' as ReservationStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Free up bed
  if (reservation.bed_id) {
    await updateBedStatus(reservation.bed_id, 'available');
  }

  return data;
}

export async function convertReservationToLease(reservationId: string) {
  const supabase = await createClient();
  
  // Get reservation
  const reservation = await getReservationById(reservationId);
  if (!reservation) throw new Error('Reservation not found');

  const { data: { user } } = await supabase.auth.getUser();

  // Create lease
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .insert({
      reservation_id: reservationId,
      house_id: reservation.house_id,
      room_id: reservation.room_id,
      bed_id: reservation.bed_id,
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      weekly_rent: reservation.weekly_rent,
      bond_amount: reservation.bond_amount,
      status: 'active' as LeaseStatus,
      created_by: user?.id,
    })
    .select()
    .single();

  if (leaseError) throw leaseError;

  // Create lease participant
  const { error: participantError } = await supabase
    .from('lease_participants')
    .insert({
      lease_id: lease.id,
      tenant_id: reservation.tenant_id,
      rent_share_percent: 100,
      is_primary: true,
      moved_in_at: reservation.start_date,
    });

  if (participantError) throw participantError;

  // Update reservation status
  const { error: updateError } = await supabase
    .from('reservations')
    .update({ status: 'converted' as ReservationStatus })
    .eq('id', reservationId);

  if (updateError) throw updateError;

  // Update bed status
  if (reservation.bed_id) {
    await updateBedStatus(reservation.bed_id, 'occupied');
  }

  // Update tenant status
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', reservation.tenant_id);

  if (tenantError) throw tenantError;

  return lease;
}

// =====================================================
// LEASES SERVICE
// =====================================================

export async function getLeases(filters?: {
  houseId?: string;
  status?: LeaseStatus | LeaseStatus[];
  tenantId?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('leases')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      bed:beds(id, bed_number),
      participants:lease_participants(
        *,
        tenant:tenants(id, first_name, last_name, email, phone)
      )
    `)
    .order('start_date', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.tenantId) {
    // This requires a different approach - join through participants
    const { data: participantLeases, error: pError } = await supabase
      .from('lease_participants')
      .select('lease_id')
      .eq('tenant_id', filters.tenantId);

    if (pError) throw pError;
    
    const leaseIds = participantLeases?.map((p: { lease_id: string }) => p.lease_id) || [];
    if (leaseIds.length > 0) {
      query = query.in('id', leaseIds);
    } else {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getLeaseById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      house:houses(*),
      room:rooms(*),
      bed:beds(*),
      participants:lease_participants(
        *,
        tenant:tenants(*)
      ),
      reservation:reservations(*),
      rent_charges(*),
      bonds(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createLease(data: LeaseFormData, tenantId: string, rentSharePercent: number = 100) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Create lease
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .insert({
      ...data,
      created_by: user?.id,
    })
    .select()
    .single();

  if (leaseError) throw leaseError;

  // Create lease participant
  const { error: participantError } = await supabase
    .from('lease_participants')
    .insert({
      lease_id: lease.id,
      tenant_id: tenantId,
      rent_share_percent: rentSharePercent,
      is_primary: true,
      moved_in_at: data.start_date,
    });

  if (participantError) throw participantError;

  // Update bed status
  if (data.bed_id && data.status === 'active') {
    await updateBedStatus(data.bed_id, 'occupied');
  }

  // Update tenant status
  if (data.status === 'active') {
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId);

    if (tenantError) throw tenantError;
  }

  return lease;
}

export async function updateLease(id: string, data: Partial<LeaseFormData>) {
  const supabase = await createClient();
  
  const { data: lease, error } = await supabase
    .from('leases')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return lease;
}

export async function activateLease(id: string) {
  const supabase = await createClient();
  
  const lease = await getLeaseById(id);
  if (!lease) throw new Error('Lease not found');

  // Update lease status
  const { data, error } = await supabase
    .from('leases')
    .update({ status: 'active' as LeaseStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update bed status
  if (lease.bed_id) {
    await updateBedStatus(lease.bed_id, 'occupied');
  }

  // Update tenant status
  const participants = lease.participants || [];
  for (const p of participants) {
    await supabase
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', p.tenant_id);
  }

  return data;
}

export async function endLease(id: string, terminationDate: string, reason?: string) {
  const supabase = await createClient();
  
  const lease = await getLeaseById(id);
  if (!lease) throw new Error('Lease not found');

  // Update lease
  const { data, error } = await supabase
    .from('leases')
    .update({
      status: 'ended' as LeaseStatus,
      termination_date: terminationDate,
      termination_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update participants
  await supabase
    .from('lease_participants')
    .update({ moved_out_at: terminationDate })
    .eq('lease_id', id)
    .is('moved_out_at', null);

  // Update bed status
  if (lease.bed_id) {
    await updateBedStatus(lease.bed_id, 'available');
  }

  // Update tenant status if no other active leases
  const participants = lease.participants || [];
  for (const p of participants) {
    const { data: otherLeases } = await supabase
      .from('lease_participants')
      .select('lease:leases!inner(status)')
      .eq('tenant_id', p.tenant_id)
      .neq('lease_id', id)
      .in('lease.status', ['active', 'ending']);

    if (!otherLeases?.length) {
      await supabase
        .from('tenants')
        .update({ status: 'inactive' })
        .eq('id', p.tenant_id);
    }
  }

  return data;
}

export async function breakLease(id: string, terminationDate: string, reason: string) {
  const supabase = await createClient();
  
  const lease = await getLeaseById(id);
  if (!lease) throw new Error('Lease not found');

  // Update lease
  const { data, error } = await supabase
    .from('leases')
    .update({
      status: 'broken' as LeaseStatus,
      termination_date: terminationDate,
      termination_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Same as end lease for bed and tenant updates
  await supabase
    .from('lease_participants')
    .update({ moved_out_at: terminationDate })
    .eq('lease_id', id)
    .is('moved_out_at', null);

  if (lease.bed_id) {
    await updateBedStatus(lease.bed_id, 'available');
  }

  return data;
}

// =====================================================
// LEASE PARTICIPANTS
// =====================================================

export async function addLeaseParticipant(data: LeaseParticipantFormData) {
  const supabase = await createClient();
  
  const { data: participant, error } = await supabase
    .from('lease_participants')
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  // Update lease is_couple if needed
  const { data: allParticipants } = await supabase
    .from('lease_participants')
    .select('id')
    .eq('lease_id', data.lease_id);

  if (allParticipants && allParticipants.length > 1) {
    await supabase
      .from('leases')
      .update({ is_couple: true })
      .eq('id', data.lease_id);
  }

  // Update tenant status
  const { data: lease } = await supabase
    .from('leases')
    .select('status')
    .eq('id', data.lease_id)
    .single();

  if (lease?.status === 'active') {
    await supabase
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', data.tenant_id);
  }

  return participant;
}

export async function removeLeaseParticipant(id: string, moveOutDate: string) {
  const supabase = await createClient();
  
  const { data: participant, error } = await supabase
    .from('lease_participants')
    .update({ moved_out_at: moveOutDate })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return participant;
}

export async function updateRentShares(leaseId: string, shares: { participantId: string; percent: number }[]) {
  const supabase = await createClient();
  
  // Validate total is 100%
  const total = shares.reduce((sum, s) => sum + s.percent, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error('Rent shares must total 100%');
  }

  for (const share of shares) {
    const { error } = await supabase
      .from('lease_participants')
      .update({ rent_share_percent: share.percent })
      .eq('id', share.participantId);

    if (error) throw error;
  }
}

// =====================================================
// ACTIVE LEASES
// =====================================================

export async function getActiveLeasesByHouse(houseId: string) {
  return getLeases({
    houseId,
    status: ['active', 'ending'],
  });
}

export async function getExpiringLeases(daysAhead: number = 30) {
  const supabase = await createClient();
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      bed:beds(id, bed_number),
      participants:lease_participants(
        *,
        tenant:tenants(id, first_name, last_name, email, phone)
      )
    `)
    .in('status', ['active', 'ending'])
    .not('end_date', 'is', null)
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .order('end_date');

  if (error) throw error;
  return data;
}

// Convenience wrapper for getting leases by tenant
export async function getLeasesByTenantId(tenantId: string) {
  return getLeases({ tenantId });
}
