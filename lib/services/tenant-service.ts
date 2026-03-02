import { createClient } from '@/lib/supabase/server';
import type { Tenant, TenantDocument, TenantStatus } from '@/types/database';
import type { TenantFormData } from '@/zod-schemas';
import { calculateTenantRiskScore } from '@/lib/utils';

// =====================================================
// TENANTS SERVICE
// =====================================================

export async function getTenants(filters?: {
  status?: TenantStatus;
  blacklisted?: boolean;
  search?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('tenants')
    .select('*')
    .order('last_name')
    .order('first_name');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.blacklisted !== undefined) {
    query = query.eq('is_blacklisted', filters.blacklisted);
  }

  if (filters?.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any;
}

export async function getTenantById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function getTenantWithDetails(id: string) {
  const supabase = await createClient();
  
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (tenantError) throw tenantError;

  // Get documents
  const { data: documents, error: docsError } = await supabase
    .from('tenant_documents')
    .select('*')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false });

  if (docsError) throw docsError;

  // Get active leases
  const { data: leases, error: leasesError } = await supabase
    .from('lease_participants')
    .select(`
      *,
      lease:leases(
        *,
        house:houses(id, name),
        room:rooms(id, name),
        bed:beds(id, bed_number)
      )
    `)
    .eq('tenant_id', id)
    .order('created_at', { ascending: false });

  if (leasesError) throw leasesError;

  // Get warnings
  const { data: warnings, error: warningsError } = await supabase
    .from('warnings')
    .select('*')
    .eq('tenant_id', id)
    .order('incident_date', { ascending: false });

  if (warningsError) throw warningsError;

  // Get payment history
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', id)
    .order('payment_date', { ascending: false })
    .limit(20);

  if (paymentsError) throw paymentsError;

  return {
    ...tenant,
    documents: documents || [],
    leases: leases || [],
    warnings: warnings || [],
    payments: payments || [],
  };
}

export async function createTenant(data: TenantFormData) {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();
  
  // Clean empty strings to null to avoid DB type errors (e.g. "" for DATE columns)
  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ])
  ) as typeof data;

  // Calculate initial risk score
  const riskScore = calculateTenantRiskScore({
    hasIncome: !!cleanData.weekly_income,
    incomeToRentRatio: cleanData.weekly_income ? cleanData.weekly_income / 200 : undefined,
    hasReferences: !!cleanData.previous_landlord_contact,
    hasValidId: !!cleanData.id_number,
    visaExpiryMonths: cleanData.visa_expiry 
      ? Math.max(0, Math.floor((new Date(cleanData.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
      : undefined,
    previousIssues: 0,
  });

  const { data: tenant, error } = await serviceClient
    .from('tenants')
    .insert({
      ...cleanData,
      risk_score: riskScore,
    })
    .select()
    .single();

  if (error) throw error;
  return tenant;
}

export async function updateTenant(id: string, data: Partial<TenantFormData>) {
  const supabase = await createClient();
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tenant;
}

export async function blacklistTenant(id: string, reason: string) {
  const supabase = await createClient();
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      is_blacklisted: true,
      blacklist_reason: reason,
      status: 'blacklisted' as TenantStatus,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tenant;
}

export async function removeBlacklist(id: string) {
  const supabase = await createClient();
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      is_blacklisted: false,
      blacklist_reason: null,
      status: 'inactive' as TenantStatus,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tenant;
}

export async function updateRiskScore(id: string) {
  const supabase = await createClient();
  
  // Get tenant details
  const tenant = await getTenantWithDetails(id);
  
  // Count warnings
  const warningCount = tenant.warnings?.length || 0;
  
  // Count broken payment promises
  const { data: brokenPromises } = await supabase
    .from('payment_promises')
    .select('id')
    .eq('tenant_id', id)
    .eq('is_broken', true);
  
  const riskScore = calculateTenantRiskScore({
    hasIncome: !!tenant.weekly_income,
    incomeToRentRatio: tenant.weekly_income ? tenant.weekly_income / 200 : undefined,
    hasReferences: !!tenant.previous_landlord_contact,
    hasValidId: !!tenant.id_number,
    visaExpiryMonths: tenant.visa_expiry 
      ? Math.max(0, Math.floor((new Date(tenant.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
      : undefined,
    previousIssues: warningCount + (brokenPromises?.length || 0),
  });

  const { data: updated, error } = await supabase
    .from('tenants')
    .update({ risk_score: riskScore })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

// =====================================================
// TENANT DOCUMENTS
// =====================================================

export async function getTenantDocuments(tenantId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('tenant_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any;
}

export async function uploadTenantDocument(
  tenantId: string,
  file: File,
  documentType: string,
  notes?: string
) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Upload file to storage
  const fileName = `${tenantId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('tenant-documents')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Create document record
  const { data: document, error } = await supabase
    .from('tenant_documents')
    .insert({
      tenant_id: tenantId,
      document_type: documentType,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user?.id,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return document;
}

export async function deleteTenantDocument(id: string) {
  const supabase = await createClient();
  
  // Get document to find file path
  const { data: doc, error: getError } = await supabase
    .from('tenant_documents')
    .select('file_path')
    .eq('id', id)
    .single();

  if (getError) throw getError;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('tenant-documents')
    .remove([doc.file_path]);

  if (storageError) throw storageError;

  // Delete record
  const { error } = await supabase
    .from('tenant_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getDocumentUrl(filePath: string) {
  const supabase = await createClient();
  
  const { data } = await supabase.storage
    .from('tenant-documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  return data?.signedUrl;
}

// =====================================================
// ACTIVE TENANTS BY HOUSE
// =====================================================

export async function getActiveTenantsByHouse(houseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('lease_participants')
    .select(`
      tenant:tenants(*),
      lease:leases!inner(
        id,
        status,
        house_id,
        room:rooms(id, name),
        bed:beds(id, bed_number)
      )
    `)
    .eq('lease.house_id', houseId)
    .in('lease.status', ['active', 'ending'])
    .is('moved_out_at', null);

  if (error) throw error;
  
  return data?.map((d: any) => ({
    ...d.tenant,
    lease: d.lease,
  })) || [];
}
