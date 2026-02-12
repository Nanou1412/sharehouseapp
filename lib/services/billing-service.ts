import { createClient } from '@/lib/supabase/server';
import type { Bill, BillAllocation, BillType, BillSplitMode } from '@/types/database';

// =====================================================
// BILLS SERVICE
// =====================================================

export async function getBills(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('bills')
    .select(`
      *,
      house:houses (
        id,
        address,
        suburb
      )
    `)
    .order('due_date', { ascending: false });

  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBillById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      house:houses (
        id,
        address,
        suburb
      ),
      allocations:bill_allocations (
        *,
        tenant:tenants (
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createBill(data: {
  house_id: string;
  bill_type: BillType;
  total_amount: number;
  period_start: string;
  period_end: string;
  due_date: string;
  split_mode: BillSplitMode;
  status?: string;
  provider?: string;
  account_number?: string;
}) {
  const supabase = await createClient();
  
  const { data: bill, error } = await supabase
    .from('bills')
    .insert({
      ...data,
      status: data.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return bill;
}

export async function updateBill(id: string, data: Partial<Bill>) {
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
  
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// BILL ALLOCATIONS
// =====================================================

export async function getBillAllocations(billId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bill_allocations')
    .select(`
      *,
      tenant:tenants (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('bill_id', billId);

  if (error) throw error;
  return data;
}

export async function createBillAllocation(data: {
  bill_id: string;
  tenant_id: string;
  lease_id?: string;
  allocated_amount: number;
  days_in_period: number;
  occupant_count?: number;
  is_paid?: boolean;
  notes?: string;
}) {
  const supabase = await createClient();
  
  const { data: allocation, error } = await supabase
    .from('bill_allocations')
    .insert({
      bill_id: data.bill_id,
      tenant_id: data.tenant_id,
      lease_id: data.lease_id ?? null,
      allocated_amount: data.allocated_amount,
      days_in_period: data.days_in_period,
      occupant_count: data.occupant_count ?? 1,
      is_paid: data.is_paid || false,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return allocation;
}

export async function updateBillAllocation(id: string, data: Partial<BillAllocation>) {
  const supabase = await createClient();
  
  const { data: allocation, error } = await supabase
    .from('bill_allocations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return allocation;
}

export async function markAllocationPaid(id: string, paidAt?: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bill_allocations')
    .update({
      is_paid: true,
      paid_date: paidAt || new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// BILL SPLITTING UTILITIES
// =====================================================

export async function calculateBillSplit(
  billId: string,
  splitMode: BillSplitMode
): Promise<{ tenant_id: string; amount: number }[]> {
  const supabase = await createClient();
  
  // Get bill details
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .single();

  if (billError) throw billError;

  // Get active leases in this house with their participants/tenants
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select(`
      *,
      participants:lease_participants (
        tenant_id,
        tenant:tenants (id)
      )
    `)
    .eq('house_id', bill.house_id)
    .eq('status', 'active');

  if (leasesError) throw leasesError;

  // Flatten to get unique tenant entries from lease participants
  const houseLeases = (leases || []).flatMap((lease: any) =>
    (lease.participants || []).map((p: any) => ({
      ...lease,
      tenant: p.tenant,
      tenant_id: p.tenant_id,
    }))
  );

  if (houseLeases.length === 0) {
    return [];
  }

  const allocations: { tenant_id: string; amount: number }[] = [];

  switch (splitMode) {
    case 'equal_per_occupant':
      const equalAmount = bill.total_amount / houseLeases.length;
      houseLeases.forEach((lease: any) => {
        allocations.push({
          tenant_id: lease.tenant.id,
          amount: Math.round(equalAmount * 100) / 100,
        });
      });
      break;

    case 'prorata_days':
      const totalRent = houseLeases.reduce((sum: number, l: any) => sum + l.weekly_rent, 0);
      houseLeases.forEach((lease: any) => {
        const proportion = lease.weekly_rent / totalRent;
        allocations.push({
          tenant_id: lease.tenant.id,
          amount: Math.round(bill.total_amount * proportion * 100) / 100,
        });
      });
      break;

    case 'per_bed':
      // For per_bed, we count beds per tenant (usually 1)
      const perBed = bill.total_amount / houseLeases.length;
      houseLeases.forEach((lease: any) => {
        allocations.push({
          tenant_id: lease.tenant.id,
          amount: Math.round(perBed * 100) / 100,
        });
      });
      break;

    default:
      // For custom and usage, allocations are set manually
      break;
  }

  // Adjust for rounding errors
  if (allocations.length > 0) {
    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    const diff = bill.total_amount - total;
    if (Math.abs(diff) > 0.001) {
      allocations[0].amount += diff;
    }
  }

  return allocations;
}

export async function generateBillAllocations(billId: string, splitMode: BillSplitMode) {
  const allocations = await calculateBillSplit(billId, splitMode);
  
  // Get the bill to calculate days_in_period
  const supabase = await createClient();
  const { data: bill } = await supabase
    .from('bills')
    .select('period_start, period_end')
    .eq('id', billId)
    .single();

  const daysInPeriod = bill
    ? Math.ceil((new Date(bill.period_end).getTime() - new Date(bill.period_start).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  for (const allocation of allocations) {
    await createBillAllocation({
      bill_id: billId,
      tenant_id: allocation.tenant_id,
      allocated_amount: allocation.amount,
      days_in_period: daysInPeriod,
    });
  }

  return allocations;
}

// =====================================================
// BILL STATISTICS
// =====================================================

export async function getBillStats(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('bills')
    .select('*');

  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data: bills, error } = await query;
  if (error) throw error;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthlyBills = bills?.filter(b => {
    const billDate = new Date(b.period_start);
    return billDate.getMonth() === thisMonth && billDate.getFullYear() === thisYear;
  }) || [];

  const pendingBills = bills?.filter(b => b.status === 'pending') || [];
  const overdueBills = pendingBills.filter(b => new Date(b.due_date) < now);

  return {
    totalBills: bills?.length || 0,
    pendingCount: pendingBills.length,
    overdueCount: overdueBills.length,
    thisMonthTotal: monthlyBills.reduce((sum, b) => sum + b.total_amount, 0),
    pendingAmount: pendingBills.reduce((sum, b) => sum + b.total_amount, 0),
    overdueAmount: overdueBills.reduce((sum, b) => sum + b.total_amount, 0),
  };
}
