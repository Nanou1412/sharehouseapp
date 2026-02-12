'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as maintenanceService from '@/lib/services/maintenance-service';
import type { TicketStatus } from '@/types/database';
import {
  maintenanceTicketFormSchema,
  type MaintenanceTicketFormData,
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
// TICKET ACTIONS
// =====================================================

export async function createMaintenanceTicket(formData: MaintenanceTicketFormData) {
  await requireAuth();
  
  const validated = maintenanceTicketFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const ticket = await maintenanceService.createMaintenanceTicket(validated.data);
    revalidatePath('/maintenance');
    return { success: true, data: ticket };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { error: { _form: ['Failed to create maintenance ticket'] } };
  }
}

// Alias for createMaintenanceTicket
export const createTicket = createMaintenanceTicket;

export async function updateMaintenanceTicket(
  id: string,
  formData: Partial<MaintenanceTicketFormData>
) {
  await requireAuth();
  
  const validated = maintenanceTicketFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const ticket = await maintenanceService.updateMaintenanceTicket(id, validated.data);
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${id}`);
    return { success: true, data: ticket };
  } catch (error) {
    console.error('Error updating ticket:', error);
    return { error: { _form: ['Failed to update ticket'] } };
  }
}

export async function deleteMaintenanceTicket(id: string) {
  await requireAuth();
  
  try {
    await maintenanceService.deleteMaintenanceTicket(id);
    revalidatePath('/maintenance');
    return { success: true };
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return { error: { _form: ['Failed to delete ticket'] } };
  }
}

// =====================================================
// STATUS ACTIONS
// =====================================================

export async function updateTicketStatus(id: string, status: TicketStatus) {
  await requireAuth();
  
  try {
    const ticket = await maintenanceService.updateTicketStatus(id, status);
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${id}`);
    return { success: true, data: ticket };
  } catch (error) {
    console.error('Error updating status:', error);
    return { error: { _form: ['Failed to update status'] } };
  }
}

export async function assignTicket(id: string, userId: string) {
  await requireAuth();
  
  try {
    const ticket = await maintenanceService.assignTicket(id, userId);
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${id}`);
    return { success: true, data: ticket };
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return { error: { _form: ['Failed to assign ticket'] } };
  }
}

export async function completeTicket(id: string) {
  await requireAuth();
  
  try {
    const ticket = await maintenanceService.updateTicketStatus(id, 'completed');
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${id}`);
    return { success: true, data: ticket };
  } catch (error) {
    console.error('Error completing ticket:', error);
    return { error: { _form: ['Failed to complete ticket'] } };
  }
}

// =====================================================
// PHOTO ACTIONS
// =====================================================

export async function uploadMaintenancePhoto(
  ticketId: string,
  file: File,
  photoType: string = 'issue',
  description?: string
) {
  await requireAuth();
  
  try {
    const photo = await maintenanceService.uploadMaintenancePhoto(
      ticketId,
      file,
      photoType,
      description
    );
    revalidatePath(`/maintenance/${ticketId}`);
    return { success: true, data: photo };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { error: { _form: ['Failed to upload photo'] } };
  }
}

export async function deleteMaintenancePhoto(id: string, ticketId: string) {
  await requireAuth();
  
  try {
    await maintenanceService.deleteMaintenancePhoto(id);
    revalidatePath(`/maintenance/${ticketId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { error: { _form: ['Failed to delete photo'] } };
  }
}
