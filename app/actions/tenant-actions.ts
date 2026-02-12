'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as tenantService from '@/lib/services/tenant-service';
import {
  tenantFormSchema,
  type TenantFormData,
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
// TENANT ACTIONS
// =====================================================

export async function getTenants() {
  await requireAuth();
  return tenantService.getTenants();
}

export async function createTenant(formData: TenantFormData) {
  await requireAuth();
  
  const validated = tenantFormSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const tenant = await tenantService.createTenant(validated.data);
    revalidatePath('/tenants');
    return { success: true, data: tenant };
  } catch (error) {
    console.error('Error creating tenant:', error);
    return { error: { _form: ['Failed to create tenant'] } };
  }
}

export async function updateTenant(id: string, formData: Partial<TenantFormData>) {
  await requireAuth();
  
  const validated = tenantFormSchema.partial().safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const tenant = await tenantService.updateTenant(id, validated.data);
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${id}`);
    return { success: true, data: tenant };
  } catch (error) {
    console.error('Error updating tenant:', error);
    return { error: { _form: ['Failed to update tenant'] } };
  }
}

export async function deleteTenant(id: string) {
  await requireAuth();
  
  try {
    // Soft delete - update status to inactive
    await tenantService.updateTenant(id, { status: 'inactive' });
    revalidatePath('/tenants');
    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { error: { _form: ['Failed to delete tenant'] } };
  }
}

export async function archiveTenant(id: string) {
  await requireAuth();
  
  try {
    // Archive by setting status to inactive
    const tenant = await tenantService.updateTenant(id, { status: 'inactive' });
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${id}`);
    return { success: true, data: tenant };
  } catch (error) {
    console.error('Error archiving tenant:', error);
    return { error: { _form: ['Failed to archive tenant'] } };
  }
}

// =====================================================
// TENANT DOCUMENT ACTIONS
// =====================================================

export async function uploadTenantDocument(
  tenantId: string,
  file: File,
  documentType: string,
  expiryDate?: string
) {
  await requireAuth();
  
  try {
    const document = await tenantService.uploadTenantDocument(
      tenantId,
      file,
      documentType,
      expiryDate
    );
    revalidatePath(`/tenants/${tenantId}`);
    return { success: true, data: document };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { error: { _form: ['Failed to upload document'] } };
  }
}

export async function deleteTenantDocument(id: string, tenantId: string) {
  await requireAuth();
  
  try {
    await tenantService.deleteTenantDocument(id);
    revalidatePath(`/tenants/${tenantId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { error: { _form: ['Failed to delete document'] } };
  }
}

// =====================================================
// TENANT NOTES ACTIONS (TODO: add notes table)
// =====================================================

export async function addTenantNote(
  _tenantId: string,
  _content: string,
  _noteType: string = 'general'
) {
  await requireAuth();
  // TODO: Implement notes functionality
  return { error: { _form: ['Notes functionality not yet implemented'] } };
}

export async function deleteTenantNote(_id: string, _tenantId: string) {
  await requireAuth();
  // TODO: Implement notes functionality
  return { error: { _form: ['Notes functionality not yet implemented'] } };
}

// =====================================================
// EMERGENCY CONTACT ACTIONS
// =====================================================

export async function updateEmergencyContact(
  tenantId: string,
  contact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }
) {
  await requireAuth();
  
  try {
    const tenant = await tenantService.updateTenant(tenantId, {
      emergency_contact_name: contact.name,
      emergency_contact_phone: contact.phone,
      emergency_contact_relation: contact.relationship,
    });
    revalidatePath(`/tenants/${tenantId}`);
    return { success: true, data: tenant };
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return { error: { _form: ['Failed to update emergency contact'] } };
  }
}

// =====================================================
// TENANT SEARCH
// =====================================================

export async function searchTenants(searchTerm: string) {
  await requireAuth();
  
  try {
    // Use getTenants with a filter approach
    const tenants = await tenantService.getTenants({ status: 'active' });
    const filtered = tenants?.filter((t: { first_name: string; last_name: string; email: string }) => 
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error searching tenants:', error);
    return { error: { _form: ['Failed to search tenants'] } };
  }
}
