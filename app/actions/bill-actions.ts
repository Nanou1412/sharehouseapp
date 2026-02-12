'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as billingEngine from '@/lib/billing-engine';
import type { BillFormData } from '@/zod-schemas';

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
// BILL ACTIONS
// =====================================================

export async function createBill(formData: BillFormData) {
  await requireAuth();
  
  try {
    // Create the bill first
    const bill = await billingEngine.createBill(formData);
    // Then allocate it to tenants
    const allocatedBill = await billingEngine.allocateBill(bill.id);
    revalidatePath('/bills');
    revalidatePath('/tenants');
    return { success: true, data: allocatedBill };
  } catch (error) {
    console.error('Error creating bill:', error);
    const message = error instanceof Error ? error.message : 'Failed to create bill';
    return { error: { _form: [message] } };
  }
}

export async function updateBill(id: string, formData: Partial<BillFormData>) {
  await requireAuth();
  
  const supabase = await createClient();
  
  try {
    const { data: bill, error } = await supabase
      .from('bills')
      .update({
        ...(formData.provider !== undefined && { provider: formData.provider }),
        ...(formData.bill_type !== undefined && { bill_type: formData.bill_type }),
        ...(formData.total_amount !== undefined && { total_amount: formData.total_amount }),
        ...(formData.due_date !== undefined && { due_date: formData.due_date }),
        ...(formData.period_start !== undefined && { period_start: formData.period_start }),
        ...(formData.period_end !== undefined && { period_end: formData.period_end }),
        ...(formData.notes !== undefined && { notes: formData.notes }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/bills');
    revalidatePath(`/bills/${id}`);
    return { success: true, data: bill };
  } catch (error) {
    console.error('Error updating bill:', error);
    return { error: { _form: ['Failed to update bill'] } };
  }
}

export async function deleteBill(id: string) {
  await requireAuth();
  
  const supabase = await createClient();
  
  try {
    // Delete allocations first
    await supabase
      .from('bill_allocations')
      .delete()
      .eq('bill_id', id);

    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/bills');
    return { success: true };
  } catch (error) {
    console.error('Error deleting bill:', error);
    return { error: { _form: ['Failed to delete bill'] } };
  }
}

// =====================================================
// BILL ALLOCATION ACTIONS
// =====================================================

export async function recalculateAllocations(billId: string) {
  await requireAuth();
  
  const supabase = await createClient();
  
  try {
    // Get bill details
    const { data: bill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (!bill) {
      throw new Error('Bill not found');
    }

    // Delete existing allocations
    await supabase
      .from('bill_allocations')
      .delete()
      .eq('bill_id', billId);

    // Reallocate the bill
    const allocatedBill = await billingEngine.allocateBill(billId);

    revalidatePath('/bills');
    revalidatePath(`/bills/${billId}`);
    return { success: true, data: allocatedBill };
  } catch (error) {
    console.error('Error recalculating allocations:', error);
    return { error: { _form: ['Failed to recalculate allocations'] } };
  }
}

export async function markBillAllocationPaid(allocationId: string) {
  await requireAuth();
  
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('bill_allocations')
      .update({
        is_paid: true,
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', allocationId)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/bills');
    return { success: true, data };
  } catch (error) {
    console.error('Error marking allocation paid:', error);
    return { error: { _form: ['Failed to mark as paid'] } };
  }
}

// =====================================================
// BILL UPLOAD ACTIONS
// =====================================================

export async function uploadBillDocument(
  billId: string,
  file: File
) {
  await requireAuth();
  
  const supabase = await createClient();
  
  try {
    const fileName = `bills/${billId}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('bills')
      .update({ file_path: fileName })
      .eq('id', billId)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath(`/bills/${billId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error uploading bill document:', error);
    return { error: { _form: ['Failed to upload document'] } };
  }
}
