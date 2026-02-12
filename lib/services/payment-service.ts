import { createClient } from '@/lib/supabase/server';
import type { Payment, PaymentMethod, ChargeStatus } from '@/types/database';
import type { PaymentFormData } from '@/zod-schemas';
import { format, subDays } from 'date-fns';
import { nowInPerth } from '@/lib/utils';

// =====================================================
// PAYMENTS CRUD
// =====================================================

export async function getPayments(filters?: {
  tenantId?: string;
  houseId?: string;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select(`
      *,
      tenant:tenants(
        id,
        first_name,
        last_name
      ),
      lease:leases(id, house_id, bed_id),
      rent_charge:rent_charges(id, week_start, week_end, amount_due, amount_paid, status)
    `)
    .order('payment_date', { ascending: false });

  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.method) {
    query = query.eq('payment_method', filters.method);
  }

  if (filters?.startDate) {
    query = query.gte('payment_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('payment_date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getPaymentById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      tenant:tenants(*),
      lease:leases(id, house_id, bed_id),
      rent_charge:rent_charges(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPayment(data: PaymentFormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      house_id: data.house_id,
      tenant_id: data.tenant_id,
      lease_id: data.lease_id ?? null,
      rent_charge_id: data.rent_charge_id ?? null,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      reference: data.reference ?? null,
      is_advance_payment: data.is_advance_payment ?? false,
      is_partial: data.is_partial ?? false,
      notes: data.notes ?? null,
      recorded_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // If a specific rent_charge_id was provided, update that charge directly
  if (data.rent_charge_id) {
    await applyPaymentToRentCharge(data.rent_charge_id, data.amount);
  }

  return payment;
}

export async function updatePayment(id: string, data: Partial<PaymentFormData>) {
  const supabase = await createClient();

  // Get original payment to potentially reverse charge updates
  const { data: original } = await supabase
    .from('payments')
    .select('amount, tenant_id, rent_charge_id')
    .eq('id', id)
    .single();

  const updateData: Record<string, unknown> = {};
  if (data.house_id !== undefined) updateData.house_id = data.house_id;
  if (data.tenant_id !== undefined) updateData.tenant_id = data.tenant_id;
  if (data.lease_id !== undefined) updateData.lease_id = data.lease_id ?? null;
  if (data.rent_charge_id !== undefined) updateData.rent_charge_id = data.rent_charge_id ?? null;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
  if (data.payment_date !== undefined) updateData.payment_date = data.payment_date;
  if (data.reference !== undefined) updateData.reference = data.reference ?? null;
  if (data.is_advance_payment !== undefined) updateData.is_advance_payment = data.is_advance_payment;
  if (data.is_partial !== undefined) updateData.is_partial = data.is_partial;
  if (data.notes !== undefined) updateData.notes = data.notes ?? null;

  const { data: payment, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // If amount changed and the payment was linked to a rent charge, adjust the charge
  if (original && data.amount && data.amount !== original.amount && original.rent_charge_id) {
    const difference = data.amount - original.amount;
    await applyPaymentToRentCharge(original.rent_charge_id, difference);
  }

  return payment;
}

export async function deletePayment(id: string) {
  const supabase = await createClient();

  // Get payment to reverse any charge updates
  const { data: payment } = await supabase
    .from('payments')
    .select('amount, tenant_id, rent_charge_id')
    .eq('id', id)
    .single();

  // Reverse the rent charge amount_paid if linked
  if (payment?.rent_charge_id) {
    await applyPaymentToRentCharge(payment.rent_charge_id, -payment.amount);
  }

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// PAYMENT ALLOCATION (directly updates rent_charges / bill_allocations)
// =====================================================

/**
 * Apply a payment amount to a specific rent charge.
 * Updates `amount_paid` and `status` on the rent_charges row.
 */
async function applyPaymentToRentCharge(rentChargeId: string, amount: number) {
  const supabase = await createClient();

  const { data: charge } = await supabase
    .from('rent_charges')
    .select('amount_due, amount_paid')
    .eq('id', rentChargeId)
    .single();

  if (!charge) return;

  const newPaid = Math.max(0, (charge.amount_paid || 0) + amount);
  let status: ChargeStatus = 'pending';
  if (newPaid >= charge.amount_due) {
    status = 'paid';
  } else if (newPaid > 0) {
    status = 'partial';
  }

  await supabase
    .from('rent_charges')
    .update({ amount_paid: newPaid, status })
    .eq('id', rentChargeId);
}

export async function allocatePaymentToRent(
  paymentId: string,
  rentChargeId: string,
  amount: number
) {
  const supabase = await createClient();

  // Link the payment to this rent charge
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ rent_charge_id: rentChargeId })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  // Update the rent charge
  await applyPaymentToRentCharge(rentChargeId, amount);

  return payment;
}

export async function allocatePaymentToBill(
  paymentId: string,
  billAllocationId: string,
  amount: number
) {
  const supabase = await createClient();

  // Get current bill allocation
  const { data: billAlloc } = await supabase
    .from('bill_allocations')
    .select('allocated_amount, is_paid')
    .eq('id', billAllocationId)
    .single();

  if (!billAlloc) throw new Error('Bill allocation not found');

  const isPaid = amount >= billAlloc.allocated_amount;

  await supabase
    .from('bill_allocations')
    .update({
      is_paid: isPaid,
      paid_date: isPaid ? format(nowInPerth(), 'yyyy-MM-dd') : null,
    })
    .eq('id', billAllocationId);

  return { paymentId, billAllocationId, amount, isPaid };
}

export async function autoAllocatePayment(paymentId: string) {
  const supabase = await createClient();

  // Get payment details
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentError) throw paymentError;

  let remainingAmount = payment.amount;

  // Get unpaid/partial rent charges for this tenant (oldest first)
  // Use house_id to scope if lease_id is not set
  let rentQuery = supabase
    .from('rent_charges')
    .select('id, amount_due, amount_paid, status')
    .in('status', ['pending', 'partial', 'overdue'] as ChargeStatus[])
    .order('week_start', { ascending: true });

  if (payment.lease_id) {
    rentQuery = rentQuery.eq('lease_id', payment.lease_id);
  } else {
    rentQuery = rentQuery.eq('house_id', payment.house_id);
  }

  const { data: unpaidRent } = await rentQuery;

  // Allocate to rent charges first
  for (const charge of unpaidRent || []) {
    if (remainingAmount <= 0) break;

    const owed = charge.amount_due - (charge.amount_paid || 0);
    const toAllocate = Math.min(remainingAmount, owed);

    if (toAllocate > 0) {
      await applyPaymentToRentCharge(charge.id, toAllocate);
      remainingAmount -= toAllocate;
    }
  }

  // Then allocate to unpaid bill allocations for this tenant
  const { data: unpaidBills } = await supabase
    .from('bill_allocations')
    .select('id, allocated_amount, is_paid')
    .eq('tenant_id', payment.tenant_id)
    .eq('is_paid', false)
    .order('created_at', { ascending: true });

  for (const bill of unpaidBills || []) {
    if (remainingAmount <= 0) break;

    const owed = bill.allocated_amount;
    const toAllocate = Math.min(remainingAmount, owed);

    if (toAllocate > 0) {
      const isPaid = toAllocate >= bill.allocated_amount;
      await supabase
        .from('bill_allocations')
        .update({
          is_paid: isPaid,
          paid_date: isPaid ? format(nowInPerth(), 'yyyy-MM-dd') : null,
        })
        .eq('id', bill.id);
      remainingAmount -= toAllocate;
    }
  }

  return { allocatedAmount: payment.amount - remainingAmount, remainingAmount };
}

// =====================================================
// RECONCILIATION (stubs — is_reconciled column does not exist on payments)
// Kept to preserve the exported API used by payment-actions.ts
// =====================================================

export async function reconcilePayment(paymentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error) throw error;
  return data;
}

export async function bulkReconcilePayments(paymentIds: string[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('id', paymentIds);

  if (error) throw error;
  return data;
}

// =====================================================
// PAYMENT REPORTS
// =====================================================

export async function getPaymentSummary(
  startDate: string,
  endDate: string,
  houseId?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select('amount, payment_method, house_id')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);

  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data: payments, error } = await query;
  if (error) throw error;

  const summary = {
    totalAmount: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
    count: payments?.length || 0,
    byMethod: {} as Record<string, { amount: number; count: number }>,
  };

  for (const p of payments || []) {
    if (!summary.byMethod[p.payment_method]) {
      summary.byMethod[p.payment_method] = { amount: 0, count: 0 };
    }
    summary.byMethod[p.payment_method].amount += p.amount;
    summary.byMethod[p.payment_method].count++;
  }

  return summary;
}

export async function getRecentPayments(days: number = 7, limit: number = 20) {
  const supabase = await createClient();

  const startDate = format(subDays(nowInPerth(), days), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name)
    `)
    .gte('payment_date', startDate)
    .order('payment_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// =====================================================
// RECEIPT GENERATION
// =====================================================

export interface Receipt {
  paymentId: string;
  receiptNumber: string;
  date: string;
  tenant: {
    name: string;
    email?: string;
  };
  amount: number;
  paymentMethod: string;
  reference?: string;
  rentCharge?: {
    weekStart: string;
    weekEnd: string;
    amountDue: number;
  };
}

export async function generateReceipt(paymentId: string): Promise<Receipt> {
  const supabase = await createClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      tenant:tenants(first_name, last_name, email),
      rent_charge:rent_charges(week_start, week_end, amount_due)
    `)
    .eq('id', paymentId)
    .single();

  if (error) throw error;

  const tenant = payment.tenant as { first_name: string; last_name: string; email?: string } | null;
  const rentCharge = payment.rent_charge as { week_start: string; week_end: string; amount_due: number } | null;

  return {
    paymentId: payment.id,
    receiptNumber: `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
    date: payment.payment_date,
    tenant: {
      name: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
      email: tenant?.email ?? undefined,
    },
    amount: payment.amount,
    paymentMethod: payment.payment_method,
    reference: payment.reference ?? undefined,
    rentCharge: rentCharge
      ? {
          weekStart: rentCharge.week_start,
          weekEnd: rentCharge.week_end,
          amountDue: rentCharge.amount_due,
        }
      : undefined,
  };
}

// Convenience wrapper for getting payments by tenant
export async function getPaymentsByTenantId(tenantId: string) {
  return getPayments({ tenantId });
}
