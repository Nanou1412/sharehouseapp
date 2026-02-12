'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as leaseService from '@/lib/services/lease-service';
import {
  leaseFormSchema,
  reservationFormSchema,
  type LeaseFormData,
  type ReservationFormData,
} from '@/zod-schemas';

// Partial schema for lease updates (without the refine validation)
const leaseUpdateSchema = leaseFormSchema.innerType().partial();

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
// LEASE ACTIONS
// =====================================================

export async function createLease(formData: LeaseFormData & { tenant_id: string }) {
  await requireAuth();
  
  const validated = leaseFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const lease = await leaseService.createLease(validated.data, formData.tenant_id);
    revalidatePath('/leases');
    revalidatePath('/tenants');
    revalidatePath('/houses');
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error creating lease:', error);
    const message = error instanceof Error ? error.message : 'Failed to create lease';
    return { error: { _form: [message] } };
  }
}

export async function updateLease(id: string, formData: Partial<LeaseFormData>) {
  await requireAuth();
  
  const validated = leaseUpdateSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const lease = await leaseService.updateLease(id, validated.data);
    revalidatePath('/leases');
    revalidatePath(`/leases/${id}`);
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error updating lease:', error);
    return { error: { _form: ['Failed to update lease'] } };
  }
}

export async function deleteLease(id: string) {
  await requireAuth();
  
  try {
    // Soft delete - update status to ended
    await leaseService.updateLease(id, { status: 'ended' });
    revalidatePath('/leases');
    revalidatePath('/houses');
    return { success: true };
  } catch (error) {
    console.error('Error deleting lease:', error);
    return { error: { _form: ['Failed to delete lease'] } };
  }
}

// =====================================================
// LEASE STATUS ACTIONS
// =====================================================

export async function activateLease(id: string) {
  await requireAuth();
  
  try {
    const lease = await leaseService.activateLease(id);
    revalidatePath('/leases');
    revalidatePath(`/leases/${id}`);
    revalidatePath('/houses');
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error activating lease:', error);
    return { error: { _form: ['Failed to activate lease'] } };
  }
}

export async function terminateLease(id: string, endDate: string, reason?: string) {
  await requireAuth();
  
  try {
    const lease = await leaseService.endLease(id, endDate, reason);
    revalidatePath('/leases');
    revalidatePath(`/leases/${id}`);
    revalidatePath('/houses');
    revalidatePath('/tenants');
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error terminating lease:', error);
    return { error: { _form: ['Failed to terminate lease'] } };
  }
}

export async function renewLease(
  id: string,
  newEndDate: string,
  newWeeklyRent?: number
) {
  await requireAuth();
  
  try {
    const updateData: { end_date: string; weekly_rent?: number } = { end_date: newEndDate };
    if (newWeeklyRent !== undefined) {
      updateData.weekly_rent = newWeeklyRent;
    }
    const lease = await leaseService.updateLease(id, updateData);
    revalidatePath('/leases');
    revalidatePath(`/leases/${id}`);
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error renewing lease:', error);
    return { error: { _form: ['Failed to renew lease'] } };
  }
}

// =====================================================
// RESERVATION ACTIONS
// =====================================================

export async function createReservation(formData: ReservationFormData) {
  await requireAuth();
  
  const validated = reservationFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const reservation = await leaseService.createReservation(validated.data);
    revalidatePath('/leases');
    revalidatePath('/houses');
    return { success: true, data: reservation };
  } catch (error) {
    console.error('Error creating reservation:', error);
    const message = error instanceof Error ? error.message : 'Failed to create reservation';
    return { error: { _form: [message] } };
  }
}

export async function confirmReservation(id: string) {
  await requireAuth();
  
  try {
    const lease = await leaseService.convertReservationToLease(id);
    revalidatePath('/leases');
    revalidatePath(`/leases/${id}`);
    revalidatePath('/houses');
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return { error: { _form: ['Failed to confirm reservation'] } };
  }
}

export async function cancelReservation(id: string, _reason?: string) {
  await requireAuth();
  
  try {
    const lease = await leaseService.cancelReservation(id);
    revalidatePath('/leases');
    revalidatePath('/houses');
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return { error: { _form: ['Failed to cancel reservation'] } };
  }
}

// =====================================================
// RENT ADJUSTMENT ACTIONS
// =====================================================

export async function adjustRent(
  leaseId: string,
  newWeeklyRent: number,
  _effectiveDate: string,
  _reason?: string
) {
  await requireAuth();
  
  try {
    // Simplified: just update the weekly rent
    const lease = await leaseService.updateLease(leaseId, { weekly_rent: newWeeklyRent });
    revalidatePath('/leases');
    revalidatePath(`/leases/${leaseId}`);
    return { success: true, data: lease };
  } catch (error) {
    console.error('Error adjusting rent:', error);
    return { error: { _form: ['Failed to adjust rent'] } };
  }
}

// =====================================================
// BED TRANSFER ACTIONS
// =====================================================

export async function transferToBed(
  _leaseId: string,
  _newBedId: string,
  _effectiveDate: string,
  _newWeeklyRent?: number
) {
  await requireAuth();
  
  // TODO: Implement bed transfer functionality
  return { error: { _form: ['Bed transfer functionality not yet implemented'] } };
}
