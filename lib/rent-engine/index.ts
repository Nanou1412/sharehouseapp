import { createClient } from '@/lib/supabase/server';
import type { RentCharge, ChargeStatus, Lease, LeaseParticipant, House } from '@/types/database';
import { 
  getWeekStart, 
  getWeekEnd, 
  getDaysOccupiedInWeek, 
  calculateProrata,
  nowInPerth,
  formatDate,
} from '@/lib/utils';
import { addDays, parseISO, startOfWeek, format, isBefore, isAfter, addWeeks } from 'date-fns';

// =====================================================
// RENT ENGINE
// Weekly rent charge generation and management
// =====================================================

interface LeaseWithDetails {
  id: string;
  house_id: string;
  room_id: string | null;
  bed_id: string | null;
  start_date: string;
  end_date: string | null;
  weekly_rent: number;
  status: string;
  is_couple: boolean;
  house: Array<{ id: string; prorate_move_in: boolean; prorate_move_out: boolean }>;
  participants: Array<{ id: string; tenant_id: string; rent_share_percent: number; is_primary: boolean; moved_in_at: string | null; moved_out_at: string | null; tenant: Array<{ id: string; first_name: string; last_name: string }> }>;
}

// Generate rent charges for a specific week
export async function generateWeeklyRentCharges(weekStart: Date): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  // Ensure weekStart is a Monday
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  
  const weekStartStr = format(monday, 'yyyy-MM-dd');
  const weekEndStr = format(sunday, 'yyyy-MM-dd');

  // Get all active leases
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select(`
      id,
      house_id,
      room_id,
      bed_id,
      start_date,
      end_date,
      weekly_rent,
      status,
      is_couple,
      house:houses!inner(
        id,
        prorate_move_in,
        prorate_move_out
      ),
      participants:lease_participants(
        id,
        tenant_id,
        rent_share_percent,
        is_primary,
        moved_in_at,
        moved_out_at,
        tenant:tenants(id, first_name, last_name)
      )
    `)
    .in('status', ['active', 'ending'])
    .lte('start_date', weekEndStr)
    .or(`end_date.is.null,end_date.gte.${weekStartStr}`);

  if (leasesError) {
    errors.push(`Failed to fetch leases: ${leasesError.message}`);
    return { created, skipped, errors };
  }

  for (const lease of (leases || []) as LeaseWithDetails[]) {
    try {
      // Check if charge already exists (idempotent)
      const { data: existing } = await supabase
        .from('rent_charges')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('week_start', weekStartStr)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      const house = lease.house[0];
      if (!house) {
        errors.push(`No house found for lease ${lease.id}`);
        continue;
      }
      const leaseStart = parseISO(lease.start_date);
      const leaseEnd = lease.end_date ? parseISO(lease.end_date) : null;

      // Calculate days occupied
      const daysOccupied = getDaysOccupiedInWeek(
        monday,
        sunday,
        leaseStart,
        leaseEnd,
        house.prorate_move_in,
        house.prorate_move_out
      );

      if (daysOccupied === 0) {
        skipped++;
        continue;
      }

      const isProrated = daysOccupied < 7;
      const baseAmount = lease.weekly_rent;
      const prorataAmount = isProrated 
        ? calculateProrata(baseAmount, daysOccupied) 
        : baseAmount;

      // Check for advance credit
      const credit = await getAvailableCredit(lease.id);
      const creditToApply = Math.min(credit, prorataAmount);
      const amountDue = prorataAmount - creditToApply;

      // Due date is the Monday of this week at 09:00 Perth time
      const dueDate = weekStartStr;

      let prorateReason: string | null = null;
      if (isProrated) {
        if (leaseStart > monday && leaseStart <= sunday) {
          prorateReason = `Move-in on ${formatDate(leaseStart)}`;
        }
        if (leaseEnd && leaseEnd >= monday && leaseEnd < sunday) {
          prorateReason = prorateReason 
            ? `${prorateReason}, Move-out on ${formatDate(leaseEnd)}`
            : `Move-out on ${formatDate(leaseEnd)}`;
        }
      }

      // Create rent charge
      const { error: insertError } = await supabase
        .from('rent_charges')
        .insert({
          lease_id: lease.id,
          house_id: lease.house_id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          days_charged: daysOccupied,
          base_amount: baseAmount,
          prorata_amount: prorataAmount,
          credit_applied: creditToApply,
          amount_due: amountDue,
          amount_paid: 0,
          status: amountDue === 0 ? 'paid' : 'pending',
          due_date: dueDate,
          is_prorated: isProrated,
          prorate_reason: prorateReason,
        });

      if (insertError) {
        errors.push(`Failed to create charge for lease ${lease.id}: ${insertError.message}`);
      } else {
        created++;

        // Deduct credit if applied
        if (creditToApply > 0) {
          await deductCredit(lease.id, creditToApply);
        }
      }
    } catch (err) {
      errors.push(`Error processing lease ${lease.id}: ${String(err)}`);
    }
  }

  return { created, skipped, errors };
}

// Get available credit for a lease (from advance payments)
async function getAvailableCredit(leaseId: string): Promise<number> {
  const supabase = await createClient();
  
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('lease_id', leaseId)
    .eq('is_advance_payment', true);

  const { data: appliedCredits } = await supabase
    .from('rent_charges')
    .select('credit_applied')
    .eq('lease_id', leaseId);

  const totalAdvance = payments?.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) || 0;
  const totalApplied = appliedCredits?.reduce((sum: number, c: { credit_applied: number }) => sum + c.credit_applied, 0) || 0;

  return Math.max(0, totalAdvance - totalApplied);
}

// Deduct credit (track it's been used)
async function deductCredit(leaseId: string, amount: number): Promise<void> {
  // Credit is tracked by summing credit_applied on rent_charges
  // No additional action needed as it's already recorded
}

// =====================================================
// CHARGE STATUS UPDATES
// =====================================================

export async function updateChargeStatus(chargeId: string): Promise<RentCharge> {
  const supabase = await createClient();
  
  const { data: charge, error: getError } = await supabase
    .from('rent_charges')
    .select('*')
    .eq('id', chargeId)
    .single();

  if (getError) throw getError;

  let newStatus: ChargeStatus;
  const now = nowInPerth();
  const dueDate = parseISO(charge.due_date);

  if (charge.amount_paid >= charge.amount_due) {
    newStatus = 'paid';
  } else if (charge.amount_paid > 0) {
    newStatus = 'partial';
  } else if (isAfter(now, addDays(dueDate, 7))) {
    newStatus = 'overdue';
  } else {
    newStatus = 'pending';
  }

  if (newStatus !== charge.status) {
    const { data, error } = await supabase
      .from('rent_charges')
      .update({ status: newStatus })
      .eq('id', chargeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  return charge;
}

// Update all overdue charges
export async function markOverdueCharges(): Promise<number> {
  const supabase = await createClient();
  
  const now = nowInPerth();
  const overdueDate = format(addDays(now, -7), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('rent_charges')
    .update({ status: 'overdue' })
    .in('status', ['pending', 'partial'])
    .lt('due_date', overdueDate)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}

// =====================================================
// PAYMENT PROCESSING
// =====================================================

export async function recordPayment(
  chargeId: string,
  amount: number,
  paymentMethod: string,
  reference?: string
): Promise<{ charge: RentCharge; payment: unknown }> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Get charge details
  const { data: charge, error: getError } = await supabase
    .from('rent_charges')
    .select(`
      *,
      lease:leases(
        tenant_id:lease_participants(tenant_id)
      )
    `)
    .eq('id', chargeId)
    .single();

  if (getError) throw getError;

  const tenantId = charge.lease?.tenant_id?.[0]?.tenant_id;
  if (!tenantId) throw new Error('No tenant found for this charge');

  const isPartial = amount < (charge.amount_due - charge.amount_paid);
  const newAmountPaid = charge.amount_paid + amount;

  // Create payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      house_id: charge.house_id,
      tenant_id: tenantId,
      lease_id: charge.lease_id,
      rent_charge_id: chargeId,
      amount,
      payment_method: paymentMethod,
      payment_date: format(nowInPerth(), 'yyyy-MM-dd'),
      reference,
      is_partial: isPartial,
      recorded_by: user?.id,
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // Update charge
  const { data: updatedCharge, error: updateError } = await supabase
    .from('rent_charges')
    .update({
      amount_paid: newAmountPaid,
      status: newAmountPaid >= charge.amount_due ? 'paid' : 'partial',
    })
    .eq('id', chargeId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update arrears tracking
  await updateArrearsStatus(charge.lease_id);

  return { charge: updatedCharge, payment };
}

// Record advance payment (credit)
export async function recordAdvancePayment(
  leaseId: string,
  tenantId: string,
  houseId: string,
  amount: number,
  paymentMethod: string,
  reference?: string
): Promise<unknown> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      house_id: houseId,
      tenant_id: tenantId,
      lease_id: leaseId,
      amount,
      payment_method: paymentMethod,
      payment_date: format(nowInPerth(), 'yyyy-MM-dd'),
      reference,
      is_advance_payment: true,
      recorded_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return payment;
}

// =====================================================
// ARREARS TRACKING
// =====================================================

export async function updateArrearsStatus(leaseId: string): Promise<void> {
  const supabase = await createClient();
  
  // Get unpaid charges
  const { data: charges } = await supabase
    .from('rent_charges')
    .select('*')
    .eq('lease_id', leaseId)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('week_start');

  const totalArrears = charges?.reduce((sum: number, c: { amount_due: number; amount_paid: number }) => sum + (c.amount_due - c.amount_paid), 0) || 0;
  const overdueCharges = charges?.filter((c: { status: string }) => c.status === 'overdue') || [];
  const weeksOverdue = overdueCharges.length;

  // Get primary tenant
  const { data: participant } = await supabase
    .from('lease_participants')
    .select('tenant_id')
    .eq('lease_id', leaseId)
    .eq('is_primary', true)
    .single();

  if (!participant) return;

  // Check existing arrears record
  const { data: existing } = await supabase
    .from('tenant_arrears')
    .select('*')
    .eq('lease_id', leaseId)
    .single();

  let status: string = 'current';
  if (totalArrears > 0) {
    if (weeksOverdue >= 4) {
      status = 'default';
    } else if (existing?.payment_plan_active) {
      status = 'payment_plan';
    } else if (existing?.reminder_count && existing.reminder_count > 0) {
      status = 'reminder_sent';
    } else if (weeksOverdue >= 1) {
      status = 'late';
    }
  }

  if (existing) {
    await supabase
      .from('tenant_arrears')
      .update({
        total_arrears: totalArrears,
        weeks_behind: weeksOverdue,
        status,
      })
      .eq('id', existing.id);
  } else if (totalArrears > 0) {
    await supabase
      .from('tenant_arrears')
      .insert({
        tenant_id: participant.tenant_id,
        lease_id: leaseId,
        total_arrears: totalArrears,
        weeks_behind: weeksOverdue,
        status,
      });
  }
}

// =====================================================
// RENT QUERIES
// =====================================================

export async function getRentCharges(filters: {
  leaseId?: string;
  houseId?: string;
  status?: ChargeStatus | ChargeStatus[];
  weekStart?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('rent_charges')
    .select(`
      *,
      lease:leases(
        id,
        room:rooms(id, name),
        bed:beds(id, bed_number),
        participants:lease_participants(
          tenant:tenants(id, first_name, last_name)
        )
      )
    `)
    .order('week_start', { ascending: false });

  if (filters.leaseId) {
    query = query.eq('lease_id', filters.leaseId);
  }

  if (filters.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters.weekStart) {
    query = query.eq('week_start', filters.weekStart);
  }

  if (filters.fromDate) {
    query = query.gte('week_start', filters.fromDate);
  }

  if (filters.toDate) {
    query = query.lte('week_start', filters.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function getArrearsDetails(leaseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('tenant_arrears')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name, email, phone),
      lease:leases(
        id,
        house:houses(id, name),
        room:rooms(id, name),
        bed:beds(id, bed_number)
      )
    `)
    .order('total_arrears', { ascending: false });

  if (leaseId) {
    query = query.eq('lease_id', leaseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

// =====================================================
// WAIVE CHARGE
// =====================================================

export async function waiveCharge(chargeId: string, reason: string): Promise<RentCharge> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('rent_charges')
    .update({
      status: 'waived',
      notes: reason,
    })
    .eq('id', chargeId)
    .select()
    .single();

  if (error) throw error;

  // Update arrears
  if (data) {
    await updateArrearsStatus(data.lease_id);
  }

  return data;
}

// =====================================================
// GENERATE NEXT WEEK'S CHARGES
// Used by cron job
// =====================================================

export async function generateNextWeekCharges(): Promise<{ created: number; skipped: number; errors: string[] }> {
  const now = nowInPerth();
  const nextMonday = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  return generateWeeklyRentCharges(nextMonday);
}

// Generate for current week
export async function generateCurrentWeekCharges(): Promise<{ created: number; skipped: number; errors: string[] }> {
  const now = nowInPerth();
  const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
  return generateWeeklyRentCharges(thisMonday);
}
