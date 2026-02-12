'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as paymentService from '@/lib/services/payment-service';
import {
  paymentFormSchema,
  type PaymentFormData,
} from '@/zod-schemas';

// =====================================================
// AUTH HELPERS
// =====================================================

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/login');
  }
  return user;
}

// =====================================================
// PAYMENT ACTIONS
// =====================================================

export async function createPayment(formData: PaymentFormData) {
  await requireAuth();
  
  const validated = paymentFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const payment = await paymentService.createPayment(validated.data);
    revalidatePath('/payments');
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${formData.tenant_id}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { error: { _form: ['Failed to create payment'] } };
  }
}

// Alias for createPayment
export const recordPayment = createPayment;

export async function updatePayment(id: string, formData: Partial<PaymentFormData>) {
  await requireAuth();
  
  const validated = paymentFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const payment = await paymentService.updatePayment(id, validated.data);
    revalidatePath('/payments');
    revalidatePath(`/payments/${id}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { error: { _form: ['Failed to update payment'] } };
  }
}

export async function deletePayment(id: string) {
  await requireAuth();
  
  try {
    await paymentService.deletePayment(id);
    revalidatePath('/payments');
    revalidatePath('/tenants');
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return { error: { _form: ['Failed to delete payment'] } };
  }
}

// =====================================================
// PAYMENT ALLOCATION ACTIONS
// =====================================================

export async function allocateToRent(
  paymentId: string,
  rentChargeId: string,
  amount: number
) {
  await requireAuth();
  
  try {
    const allocation = await paymentService.allocatePaymentToRent(
      paymentId,
      rentChargeId,
      amount
    );
    revalidatePath('/payments');
    revalidatePath(`/payments/${paymentId}`);
    revalidatePath('/tenants');
    return { success: true, data: allocation };
  } catch (error) {
    console.error('Error allocating to rent:', error);
    return { error: { _form: ['Failed to allocate payment'] } };
  }
}

export async function allocateToBill(
  paymentId: string,
  billAllocationId: string,
  amount: number
) {
  await requireAuth();
  
  try {
    const allocation = await paymentService.allocatePaymentToBill(
      paymentId,
      billAllocationId,
      amount
    );
    revalidatePath('/payments');
    revalidatePath(`/payments/${paymentId}`);
    revalidatePath('/bills');
    return { success: true, data: allocation };
  } catch (error) {
    console.error('Error allocating to bill:', error);
    return { error: { _form: ['Failed to allocate payment'] } };
  }
}

export async function autoAllocate(paymentId: string) {
  await requireAuth();
  
  try {
    const result = await paymentService.autoAllocatePayment(paymentId);
    revalidatePath('/payments');
    revalidatePath(`/payments/${paymentId}`);
    revalidatePath('/tenants');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error auto-allocating payment:', error);
    return { error: { _form: ['Failed to auto-allocate payment'] } };
  }
}

// =====================================================
// RECONCILIATION ACTIONS
// =====================================================

export async function reconcilePayment(paymentId: string) {
  await requireAuth();
  
  try {
    const payment = await paymentService.reconcilePayment(paymentId);
    revalidatePath('/payments');
    revalidatePath(`/payments/${paymentId}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error reconciling payment:', error);
    return { error: { _form: ['Failed to reconcile payment'] } };
  }
}

export async function bulkReconcile(paymentIds: string[]) {
  await requireAuth();
  
  try {
    const payments = await paymentService.bulkReconcilePayments(paymentIds);
    revalidatePath('/payments');
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error bulk reconciling payments:', error);
    return { error: { _form: ['Failed to reconcile payments'] } };
  }
}

// =====================================================
// RECEIPT ACTIONS
// =====================================================

export async function getReceipt(paymentId: string) {
  await requireAuth();
  
  try {
    const receipt = await paymentService.generateReceipt(paymentId);
    return { success: true, data: receipt };
  } catch (error) {
    console.error('Error generating receipt:', error);
    return { error: { _form: ['Failed to generate receipt'] } };
  }
}
