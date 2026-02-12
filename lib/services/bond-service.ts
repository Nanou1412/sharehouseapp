import { createClient } from '@/lib/supabase/server';
import type { Bond, BondStatus } from '@/types/database';
import type { BondFormData } from '@/zod-schemas';

type BondDeductionType = 'cleaning' | 'damage' | 'rent_arrears' | 'other';
import { format } from 'date-fns';
import { nowInPerth } from '@/lib/utils';

// =====================================================
// BONDS CRUD
// =====================================================

export async function getBonds(filters?: {
  houseId?: string;
  tenantId?: string;
  status?: BondStatus | BondStatus[];
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('bonds')
    .select(`
      *,
      tenant:tenants(
        id,
        first_name,
        last_name
      ),
      lease:leases(
        id,
        bed:beds(
          id,
          bed_number,
          room:rooms(
            id,
            name,
            house:houses(id, name)
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
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
  return data as any[];
}

export async function getBondById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bonds')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function getBondByTenant(tenantId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bonds')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createBond(data: BondFormData) {
  const supabase = await createClient();
  
  const { data: bond, error } = await supabase
    .from('bonds')
    .insert({
      tenant_id: data.tenant_id,
      lease_id: data.lease_id,
      house_id: data.house_id,
      expected_amount: data.expected_amount,
      received_amount: data.received_amount,
      lodged_with: data.lodged_with,
      lodgement_reference: data.lodgement_reference,
      received_date: data.received_date,
      status: data.status || 'pending' as BondStatus,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return bond;
}

export async function updateBond(id: string, data: Partial<BondFormData>) {
  const supabase = await createClient();
  
  const { data: bond, error } = await supabase
    .from('bonds')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return bond;
}

export async function deleteBond(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('bonds')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// BOND OPERATIONS
// =====================================================

export interface BondDeduction {
  type: BondDeductionType;
  amount: number;
  description: string;
}

export async function processBondRelease(
  bondId: string,
  deductions: BondDeduction[] = []
) {
  const supabase = await createClient();
  
  // Get the bond
  const { data: bond, error: getBondError } = await supabase
    .from('bonds')
    .select('*')
    .eq('id', bondId)
    .single();

  if (getBondError) throw getBondError;

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = bond.received_amount - totalDeductions;

  if (refundAmount < 0) {
    throw new Error('Deductions exceed bond received amount');
  }

  const refundDate = format(nowInPerth(), 'yyyy-MM-dd');

  // Update bond status
  const { data: updatedBond, error: updateError } = await supabase
    .from('bonds')
    .update({
      status: (refundAmount === bond.received_amount ? 'refunded' : 'partial') as BondStatus,
      refund_date: refundDate,
      refund_amount: refundAmount,
      total_deductions: totalDeductions,
      deductions: deductions.length > 0 ? deductions : null,
    })
    .eq('id', bondId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedBond;
}

export async function forfeitBond(bondId: string, reason: string) {
  const supabase = await createClient();
  
  const refundDate = format(nowInPerth(), 'yyyy-MM-dd');

  // Get the bond to know the received_amount for total_deductions
  const { data: existingBond, error: getBondError } = await supabase
    .from('bonds')
    .select('received_amount')
    .eq('id', bondId)
    .single();

  if (getBondError) throw getBondError;

  const { data: bond, error } = await supabase
    .from('bonds')
    .update({
      status: 'forfeited' as BondStatus,
      refund_date: refundDate,
      refund_amount: 0,
      total_deductions: existingBond.received_amount,
      deductions: [{ type: 'other' as BondDeductionType, amount: existingBond.received_amount, description: reason }],
    })
    .eq('id', bondId)
    .select()
    .single();

  if (error) throw error;
  return bond;
}

export async function markBondAsDispute(bondId: string, notes?: string) {
  // 'dispute' is not a valid BondStatus (valid: pending, received, partial, refunded, forfeited).
  // Instead, we record the dispute information in the notes field.
  const supabase = await createClient();
  
  const disputeNote = notes ? `[DISPUTE] ${notes}` : '[DISPUTE] Bond is under dispute';

  const { data: bond, error } = await supabase
    .from('bonds')
    .update({
      notes: disputeNote,
    })
    .eq('id', bondId)
    .select()
    .single();

  if (error) throw error;
  return bond;
}

// =====================================================
// BOND REPORTS
// =====================================================

export async function getBondsSummary(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('bonds')
    .select('*');

  // Filter by house_id directly on the bonds table
  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data: bonds, error } = await query;
  if (error) throw error;

  const allBonds = bonds || [];

  const received = allBonds.filter((b) => b.status === 'received');
  const pending = allBonds.filter((b) => b.status === 'pending');
  const refunded = allBonds.filter((b) => b.status === 'refunded' || b.status === 'partial');
  const forfeited = allBonds.filter((b) => b.status === 'forfeited');

  return {
    totalHeld: received.reduce((sum, b) => sum + b.received_amount, 0),
    countHeld: received.length,
    totalPending: pending.reduce((sum, b) => sum + b.expected_amount, 0),
    countPending: pending.length,
    totalRefunded: refunded.reduce((sum, b) => sum + (b.refund_amount || 0), 0),
    countRefunded: refunded.length,
    totalDeducted: refunded.reduce((sum, b) => sum + (b.received_amount - (b.refund_amount || 0)), 0),
    totalForfeited: forfeited.reduce((sum, b) => sum + b.received_amount, 0),
    countForfeited: forfeited.length,
  };
}

export async function getExpiringBonds(daysAhead: number = 14) {
  const supabase = await createClient();
  
  // Get active leases ending soon
  const today = format(nowInPerth(), 'yyyy-MM-dd');
  const futureDate = format(
    new Date(nowInPerth().getTime() + daysAhead * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );

  // Get bonds that have a lease ending soon via lease_id join
  const { data, error } = await supabase
    .from('bonds')
    .select(`
      *,
      tenant:tenants(
        id,
        first_name,
        last_name
      ),
      lease:leases!inner(
        id,
        end_date,
        status,
        bed:beds(
          bed_number,
          room:rooms(
            name,
            house:houses(name)
          )
        )
      )
    `)
    .eq('lease.status', 'active')
    .gte('lease.end_date', today)
    .lte('lease.end_date', futureDate)
    .eq('status', 'received');

  if (error) throw error;
  return (data || []) as any[];
}
