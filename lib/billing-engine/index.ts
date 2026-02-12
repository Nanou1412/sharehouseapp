import { createClient } from '@/lib/supabase/server';
import type { Bill, BillAllocation, BillSplitMode, BillStatus } from '@/types/database';
import type { BillFormData } from '@/zod-schemas';
import { parseISO, differenceInDays, format, isWithinInterval } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

// =====================================================
// BILLING ENGINE
// Bill allocation and split calculations
// =====================================================

interface OccupantInfo {
  tenantId: string;
  leaseId: string;
  daysInPeriod: number;
  bedCount: number; // For per_bed split
}

// =====================================================
// BILLS CRUD
// =====================================================

export async function getBills(filters?: {
  houseId?: string;
  billType?: string;
  status?: BillStatus;
  fromDate?: string;
  toDate?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('bills')
    .select(`
      *,
      house:houses(id, name),
      allocations:bill_allocations(
        *,
        tenant:tenants(id, first_name, last_name)
      )
    `)
    .order('period_end', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.billType) {
    query = query.eq('bill_type', filters.billType);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.fromDate) {
    query = query.gte('period_start', filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte('period_end', filters.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function getBillById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      house:houses(*),
      allocations:bill_allocations(
        *,
        tenant:tenants(*),
        lease:leases(
          id,
          room:rooms(id, name),
          bed:beds(id, bed_number)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createBill(data: BillFormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bill, error } = await supabase
    .from('bills')
    .insert({
      ...data,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return bill;
}

export async function updateBill(id: string, data: Partial<BillFormData>) {
  const supabase = await createClient();
  
  const { data: bill, error } = await supabase
    .from('bills')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return bill;
}

export async function deleteBill(id: string) {
  const supabase = await createClient();
  
  // Delete allocations first
  await supabase
    .from('bill_allocations')
    .delete()
    .eq('bill_id', id);

  // Delete bill
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// BILL ALLOCATION CALCULATION
// =====================================================

export async function calculateBillAllocations(billId: string): Promise<BillAllocation[]> {
  const supabase = await createClient();
  
  // Get bill details
  const bill = await getBillById(billId);
  if (!bill) throw new Error('Bill not found');

  // If split mode is 'included', no allocations needed
  if (bill.split_mode === 'included') {
    return [];
  }

  // Get occupants during bill period
  const occupants = await getOccupantsForPeriod(
    bill.house_id,
    bill.period_start,
    bill.period_end
  );

  if (occupants.length === 0) {
    throw new Error('No occupants found for this billing period');
  }

  const allocations = calculateAllocations(
    bill.total_amount,
    bill.split_mode,
    occupants,
    bill.period_start,
    bill.period_end
  );

  return allocations.map(a => ({
    id: '',
    bill_id: billId,
    tenant_id: a.tenantId,
    lease_id: a.leaseId,
    days_in_period: a.daysInPeriod,
    occupant_count: a.bedCount,
    allocated_amount: a.amount,
    is_paid: false,
    paid_date: null,
    notes: null,
    created_at: new Date().toISOString(),
  }));
}

function calculateAllocations(
  totalAmount: number,
  splitMode: BillSplitMode,
  occupants: OccupantInfo[],
  periodStart: string,
  periodEnd: string
): (OccupantInfo & { amount: number })[] {
  const totalDays = differenceInDays(parseISO(periodEnd), parseISO(periodStart)) + 1;
  
  switch (splitMode) {
    case 'equal_per_occupant': {
      // Equal split among all occupants
      const perPerson = totalAmount / occupants.length;
      return occupants.map(o => ({
        ...o,
        amount: Math.round(perPerson * 100) / 100,
      }));
    }

    case 'per_bed': {
      // Split based on bed count
      const totalBeds = occupants.reduce((sum, o) => sum + o.bedCount, 0);
      const perBed = totalAmount / totalBeds;
      return occupants.map(o => ({
        ...o,
        amount: Math.round(perBed * o.bedCount * 100) / 100,
      }));
    }

    case 'prorata_days': {
      // Split based on days occupied
      const totalOccupantDays = occupants.reduce((sum, o) => sum + o.daysInPeriod, 0);
      const perDay = totalAmount / totalOccupantDays;
      return occupants.map(o => ({
        ...o,
        amount: Math.round(perDay * o.daysInPeriod * 100) / 100,
      }));
    }

    case 'flat_weekly_per_person': {
      // Calculate weekly rate and charge based on weeks in period
      const weeks = totalDays / 7;
      const weeklyPerPerson = totalAmount / weeks / occupants.length;
      return occupants.map(o => {
        const occupantWeeks = o.daysInPeriod / 7;
        return {
          ...o,
          amount: Math.round(weeklyPerPerson * occupantWeeks * 100) / 100,
        };
      });
    }

    default:
      throw new Error(`Unknown split mode: ${splitMode}`);
  }
}

async function getOccupantsForPeriod(
  houseId: string,
  periodStart: string,
  periodEnd: string
): Promise<OccupantInfo[]> {
  const supabase = await createClient();
  
  // Get all active leases during this period
  const { data: leases, error } = await supabase
    .from('leases')
    .select(`
      id,
      start_date,
      end_date,
      room_id,
      bed_id,
      participants:lease_participants(
        tenant_id,
        moved_in_at,
        moved_out_at
      )
    `)
    .eq('house_id', houseId)
    .in('status', ['active', 'ending', 'ended'])
    .lte('start_date', periodEnd)
    .or(`end_date.is.null,end_date.gte.${periodStart}`);

  if (error) throw error;

  const periodStartDate = parseISO(periodStart);
  const periodEndDate = parseISO(periodEnd);
  const occupants: OccupantInfo[] = [];

  for (const lease of leases || []) {
    const leaseStart = parseISO(lease.start_date);
    const leaseEnd = lease.end_date ? parseISO(lease.end_date) : periodEndDate;

    // Calculate overlap
    const effectiveStart = leaseStart > periodStartDate ? leaseStart : periodStartDate;
    const effectiveEnd = leaseEnd < periodEndDate ? leaseEnd : periodEndDate;
    const daysInPeriod = differenceInDays(effectiveEnd, effectiveStart) + 1;

    if (daysInPeriod <= 0) continue;

    for (const participant of lease.participants || []) {
      // Check participant's actual move in/out dates
      const movedIn = participant.moved_in_at 
        ? parseISO(participant.moved_in_at) 
        : leaseStart;
      const movedOut = participant.moved_out_at 
        ? parseISO(participant.moved_out_at) 
        : leaseEnd;

      const participantStart = movedIn > effectiveStart ? movedIn : effectiveStart;
      const participantEnd = movedOut < effectiveEnd ? movedOut : effectiveEnd;
      const participantDays = differenceInDays(participantEnd, participantStart) + 1;

      if (participantDays > 0) {
        occupants.push({
          tenantId: participant.tenant_id,
          leaseId: lease.id,
          daysInPeriod: participantDays,
          bedCount: 1, // Could be expanded for couples
        });
      }
    }
  }

  return occupants;
}

// =====================================================
// SAVE ALLOCATIONS
// =====================================================

export async function allocateBill(billId: string): Promise<Bill> {
  const supabase = await createClient();
  
  const allocations = await calculateBillAllocations(billId);

  // Delete existing allocations
  await supabase
    .from('bill_allocations')
    .delete()
    .eq('bill_id', billId);

  // Insert new allocations
  if (allocations.length > 0) {
    const { error: insertError } = await supabase
      .from('bill_allocations')
      .insert(allocations.map(a => ({
        bill_id: billId,
        tenant_id: a.tenant_id,
        lease_id: a.lease_id,
        days_in_period: a.days_in_period,
        occupant_count: a.occupant_count,
        allocated_amount: a.allocated_amount,
      })));

    if (insertError) throw insertError;
  }

  // Update bill status
  const { data: bill, error } = await supabase
    .from('bills')
    .update({ status: 'allocated' })
    .eq('id', billId)
    .select()
    .single();

  if (error) throw error;
  return bill;
}

// =====================================================
// MARK ALLOCATION PAID
// =====================================================

export async function markAllocationPaid(allocationId: string): Promise<BillAllocation> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bill_allocations')
    .update({
      is_paid: true,
      paid_date: format(new Date(), 'yyyy-MM-dd'),
    })
    .eq('id', allocationId)
    .select()
    .single();

  if (error) throw error;

  // Check if all allocations are paid
  const { data: allAllocations } = await supabase
    .from('bill_allocations')
    .select('is_paid')
    .eq('bill_id', data.bill_id);

  const allPaid = allAllocations?.every((a: { is_paid: boolean }) => a.is_paid);

  if (allPaid) {
    await supabase
      .from('bills')
      .update({
        status: 'paid',
        paid_date: format(new Date(), 'yyyy-MM-dd'),
      })
      .eq('id', data.bill_id);
  }

  return data as any;
}

// =====================================================
// BILL SUMMARY
// =====================================================

export async function getBillSummary(houseId: string, months: number = 12) {
  const supabase = await createClient();
  
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);

  const { data: bills, error } = await supabase
    .from('bills')
    .select('bill_type, total_amount, period_start')
    .eq('house_id', houseId)
    .gte('period_start', format(fromDate, 'yyyy-MM-dd'))
    .order('period_start');

  if (error) throw error;

  // Group by bill type
  const byType: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const bill of bills || []) {
    // By type
    byType[bill.bill_type] = (byType[bill.bill_type] || 0) + bill.total_amount;

    // By month
    const month = format(parseISO(bill.period_start), 'yyyy-MM');
    byMonth[month] = (byMonth[month] || 0) + bill.total_amount;
  }

  const total = Object.values(byType).reduce((sum, v) => sum + v, 0);

  return {
    total,
    byType,
    byMonth,
    monthlyAverage: total / months,
  };
}
