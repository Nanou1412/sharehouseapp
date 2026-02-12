import { createClient } from '@/lib/supabase/server';
import type { Candidate, CandidateStatus } from '@/types/database';
import type { CandidateFormData } from '@/zod-schemas';

// =====================================================
// CANDIDATES CRUD
// =====================================================

export async function getCandidates(filters?: {
  houseId?: string;
  bedId?: string;
  status?: CandidateStatus | CandidateStatus[];
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('candidates')
    .select(`
      *,
      bed:beds(
        id,
        bed_number,
        weekly_rent,
        room:rooms(
          id,
          name,
          house:houses(id, name)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.bedId) {
    query = query.eq('bed_id', filters.bedId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  // Filter by house if needed (post-processing due to nested relation)
  type CandidateWithBed = { bed?: { room?: { house?: { id?: string } } } };
  if (filters?.houseId) {
    return (data as any[])?.filter((c: CandidateWithBed) => 
      c.bed?.room?.house?.id === filters.houseId
    ) || [];
  }

  return data as any[];
}

export async function getCandidateById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      *,
      bed:beds(
        *,
        room:rooms(
          *,
          house:houses(*)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createCandidate(data: CandidateFormData) {
  const supabase = await createClient();
  
  const { data: candidate, error } = await supabase
    .from('candidates')
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      preferred_move_in: data.preferred_move_in,
      bed_id: data.bed_id,
      source: data.source,
      status: 'new' as CandidateStatus,
    })
    .select()
    .single();

  if (error) throw error;
  return candidate;
}

export async function updateCandidate(id: string, data: Partial<CandidateFormData>) {
  const supabase = await createClient();
  
  const { data: candidate, error } = await supabase
    .from('candidates')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return candidate;
}

export async function deleteCandidate(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// CANDIDATE STATUS MANAGEMENT
// =====================================================

export async function updateCandidateStatus(id: string, status: CandidateStatus) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function scheduleViewing(
  candidateId: string,
  viewingDate: string,
  viewingTime?: string,
  notes?: string
) {
  const supabase = await createClient();
  
  // Store viewing info in screening_notes since dedicated fields don't exist
  const viewingInfo = `Viewing scheduled: ${viewingDate} at ${viewingTime}${notes ? ` - ${notes}` : ''}`;
  
  const { data, error } = await supabase
    .from('candidates')
    .update({
      screening_notes: viewingInfo,
    })
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateCandidateNotes(id: string, notes: string) {
  const supabase = await createClient();
  
  const updateData: Partial<Candidate> = { screening_notes: notes };

  const { data, error } = await supabase
    .from('candidates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function approveCandidate(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('candidates')
    .update({
      status: 'approved' as CandidateStatus,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function rejectCandidate(id: string, reason?: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('candidates')
    .update({
      status: 'rejected' as CandidateStatus,
      screening_notes: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

// =====================================================
// CONVERT CANDIDATE TO TENANT
// =====================================================

export async function convertCandidateToTenant(
  candidateId: string,
  leaseData: {
    startDate: string;
    endDate?: string;
    weeklyRent: number;
    bondAmount?: number;
  }
) {
  const supabase = await createClient();
  
  // Get candidate details
  const { data: candidate, error: getError } = await supabase
    .from('candidates')
    .select(`
      *,
      bed:beds(
        id,
        room:rooms(house_id)
      )
    `)
    .eq('id', candidateId)
    .single();

  if (getError) throw getError;

  // Resolve house_id from the bed relation
  const houseId = (candidate.bed as any)?.room?.house_id;
  if (!houseId) throw new Error('Cannot determine house_id from candidate bed');

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      status: 'active',
      risk_score: 0,
    })
    .select()
    .single();

  if (tenantError) throw tenantError;

  // Create lease
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .insert({
      house_id: houseId,
      bed_id: candidate.bed_id,
      start_date: leaseData.startDate,
      end_date: leaseData.endDate,
      weekly_rent: leaseData.weeklyRent,
      bond_amount: leaseData.bondAmount || 0,
      status: 'active',
    })
    .select()
    .single();

  if (leaseError) throw leaseError;

  // Create lease participant to link tenant to lease
  const { error: participantError } = await supabase
    .from('lease_participants')
    .insert({
      lease_id: lease.id,
      tenant_id: tenant.id,
      rent_share_percent: 100,
      is_primary: true,
      moved_in_at: leaseData.startDate,
    });

  if (participantError) throw participantError;

  // Create bond if specified
  if (leaseData.bondAmount) {
    await supabase
      .from('bonds')
      .insert({
        lease_id: lease.id,
        tenant_id: tenant.id,
        house_id: houseId,
        expected_amount: leaseData.bondAmount,
        received_amount: 0,
        status: 'pending',
      });
  }

  // Update bed status
  await supabase
    .from('beds')
    .update({ status: 'occupied' })
    .eq('id', candidate.bed_id);

  // Update candidate as converted
  await supabase
    .from('candidates')
    .update({
      status: 'approved' as CandidateStatus,
      converted_to_tenant: tenant.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  return { tenant, lease };
}

// =====================================================
// CANDIDATE PIPELINE
// =====================================================

export async function getCandidatePipeline(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('candidates')
    .select(`
      status,
      bed:beds(
        room:rooms(house_id)
      )
    `)
    .not('status', 'eq', 'rejected');

  const { data, error } = await query;
  if (error) throw error;

  // Filter by house if needed
  type CandidateWithStatus = { status: string; bed?: Array<{ room?: Array<{ house_id?: string }> }> };
  let candidates = data;
  if (houseId) {
    candidates = data?.filter((c: CandidateWithStatus) => 
      c.bed?.[0]?.room?.[0]?.house_id === houseId
    ) || [];
  }

  const pipeline = {
    new: candidates?.filter((c: CandidateWithStatus) => c.status === 'new').length || 0,
    screening: candidates?.filter((c: CandidateWithStatus) => c.status === 'screening').length || 0,
    approved: candidates?.filter((c: CandidateWithStatus) => c.status === 'approved').length || 0,
    rejected: candidates?.filter((c: CandidateWithStatus) => c.status === 'rejected').length || 0,
    waitlist: candidates?.filter((c: CandidateWithStatus) => c.status === 'waitlist').length || 0,
    total: candidates?.length || 0,
  };

  return pipeline;
}

/**
 * Get upcoming viewings. Since the candidates table has no dedicated
 * viewing_scheduled / viewing_status columns, this returns an empty array.
 * Viewing info is stored as free-text in screening_notes.
 */
export async function getUpcomingViewings(_days: number = 7) {
  return [];
}

// =====================================================
// CANDIDATE SEARCH & MATCH
// =====================================================

export async function findCandidatesForBed(bedId: string) {
  const supabase = await createClient();
  
  // Get bed details
  const { data: bed, error: bedError } = await supabase
    .from('beds')
    .select(`
      weekly_rent,
      room:rooms(
        house:houses(suburb)
      )
    `)
    .eq('id', bedId)
    .single();

  if (bedError) throw bedError;

  // Find candidates who might be interested
  // Those without a specific bed preference or with matching criteria
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .in('status', ['new', 'screening'])
    .or(`bed_id.is.null,bed_id.eq.${bedId}`);

  if (error) throw error;
  return data as any;
}

export async function getCandidateHistory(candidateId: string) {
  const supabase = await createClient();
  
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select(`
      *,
      bed:beds(
        bed_number,
        room:rooms(
          name,
          house:houses(name)
        )
      )
    `)
    .eq('id', candidateId)
    .single();

  if (error) throw error;

  // Build timeline from data
  const timeline: { date: string; event: string; status: string }[] = [];
  
  timeline.push({
    date: candidate.created_at,
    event: 'Application received',
    status: 'new',
  });

  if (candidate.status !== 'new') {
    timeline.push({
      date: candidate.updated_at,
      event: `Status changed to ${candidate.status}`,
      status: candidate.status,
    });
  }

  if (candidate.converted_at) {
    timeline.push({
      date: candidate.converted_at,
      event: 'Converted to tenant',
      status: 'approved',
    });
  }

  return {
    candidate,
    timeline: timeline.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
  };
}

// =====================================================
// CANDIDATE SOURCES
// =====================================================

export async function getCandidateSourceStats() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('candidates')
    .select('source, status, converted_to_tenant');

  if (error) throw error;

  const stats: Record<string, { 
    total: number; 
    converted: number; 
    rejected: number;
    conversionRate: number;
  }> = {};

  for (const candidate of data || []) {
    const source = candidate.source || 'unknown';
    if (!stats[source]) {
      stats[source] = { total: 0, converted: 0, rejected: 0, conversionRate: 0 };
    }
    stats[source].total++;
    if (candidate.converted_to_tenant != null) stats[source].converted++;
    if (candidate.status === 'rejected') stats[source].rejected++;
  }

  // Calculate conversion rates
  for (const source of Object.keys(stats)) {
    const completed = stats[source].converted + stats[source].rejected;
    stats[source].conversionRate = completed > 0 
      ? (stats[source].converted / completed) * 100 
      : 0;
  }

  return stats;
}
