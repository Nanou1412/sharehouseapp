'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as propertyService from '@/lib/services/property-service';
import {
  houseFormSchema,
  roomFormSchema,
  bedFormSchema,
  type HouseFormData,
  type RoomFormData,
  type BedFormData,
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

async function requireAdmin() {
  const user = await requireAuth();
  const supabase = await createClient();
  
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return user;
}

// =====================================================
// HOUSE ACTIONS
// =====================================================

export async function createHouse(formData: HouseFormData) {
  await requireAdmin();
  
  const validated = houseFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const house = await propertyService.createHouse(validated.data);
    revalidatePath('/houses');
    return { success: true, data: house };
  } catch (error) {
    console.error('Error creating house:', error);
    return { error: { _form: ['Failed to create house'] } };
  }
}

export async function updateHouse(id: string, formData: Partial<HouseFormData>) {
  await requireAdmin();
  
  const validated = houseFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const house = await propertyService.updateHouse(id, validated.data);
    revalidatePath('/houses');
    revalidatePath(`/houses/${id}`);
    return { success: true, data: house };
  } catch (error) {
    console.error('Error updating house:', error);
    return { error: { _form: ['Failed to update house'] } };
  }
}

export async function deleteHouse(id: string) {
  await requireAdmin();
  
  try {
    await propertyService.deleteHouse(id);
    revalidatePath('/houses');
    return { success: true };
  } catch (error) {
    console.error('Error deleting house:', error);
    return { error: { _form: ['Failed to delete house'] } };
  }
}

export async function getHouses() {
  await requireAuth();
  
  try {
    const houses = await propertyService.getHouses();
    return { success: true, data: houses };
  } catch (error) {
    console.error('Error getting houses:', error);
    return { error: { _form: ['Failed to get houses'] } };
  }
}

// =====================================================
// ROOM ACTIONS
// =====================================================

export async function createRoom(formData: RoomFormData) {
  await requireAuth();
  
  const validated = roomFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const room = await propertyService.createRoom(validated.data);
    revalidatePath('/houses');
    revalidatePath(`/houses/${formData.house_id}`);
    return { success: true, data: room };
  } catch (error) {
    console.error('Error creating room:', error);
    return { error: { _form: ['Failed to create room'] } };
  }
}

export async function updateRoom(id: string, formData: Partial<RoomFormData>) {
  await requireAuth();
  
  const validated = roomFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const room = await propertyService.updateRoom(id, validated.data);
    revalidatePath('/houses');
    revalidatePath(`/rooms/${id}`);
    return { success: true, data: room };
  } catch (error) {
    console.error('Error updating room:', error);
    return { error: { _form: ['Failed to update room'] } };
  }
}

export async function deleteRoom(id: string) {
  await requireAuth();
  
  try {
    await propertyService.deleteRoom(id);
    revalidatePath('/houses');
    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { error: { _form: ['Failed to delete room'] } };
  }
}

// =====================================================
// BED ACTIONS
// =====================================================

export async function createBed(formData: BedFormData) {
  await requireAuth();
  
  const validated = bedFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const bed = await propertyService.createBed(validated.data);
    revalidatePath('/houses');
    revalidatePath(`/rooms/${formData.room_id}`);
    return { success: true, data: bed };
  } catch (error) {
    console.error('Error creating bed:', error);
    return { error: { _form: ['Failed to create bed'] } };
  }
}

export async function updateBed(id: string, formData: Partial<BedFormData>) {
  await requireAuth();
  
  const validated = bedFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const bed = await propertyService.updateBed(id, validated.data);
    revalidatePath('/houses');
    revalidatePath(`/beds/${id}`);
    return { success: true, data: bed };
  } catch (error) {
    console.error('Error updating bed:', error);
    return { error: { _form: ['Failed to update bed'] } };
  }
}

export async function deleteBed(id: string) {
  await requireAuth();
  
  try {
    await propertyService.deleteBed(id);
    revalidatePath('/houses');
    return { success: true };
  } catch (error) {
    console.error('Error deleting bed:', error);
    return { error: { _form: ['Failed to delete bed'] } };
  }
}

// =====================================================
// HOUSE COSTS ACTIONS (TODO: implement in property-service)
// =====================================================

export async function createHouseCost(_formData: {
  house_id: string;
  cost_type: string;
  amount: number;
  frequency: string;
  description?: string;
}) {
  await requireAuth();
  // TODO: Implement createHouseCost in property-service
  return { error: { _form: ['House cost management not yet implemented'] } };
}

export async function updateHouseCost(_id: string, _formData: {
  cost_type?: string;
  amount?: number;
  frequency?: string;
  description?: string;
}) {
  await requireAuth();
  // TODO: Implement updateHouseCost in property-service
  return { error: { _form: ['House cost management not yet implemented'] } };
}

export async function deleteHouseCost(_id: string) {
  await requireAuth();
  // TODO: Implement deleteHouseCost in property-service
  return { error: { _form: ['House cost management not yet implemented'] } };
}
