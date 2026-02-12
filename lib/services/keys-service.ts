import { createClient } from '@/lib/supabase/server';
import type { Key, KeyStatus } from '@/types/database';
import type { KeyFormData } from '@/zod-schemas';
import { format } from 'date-fns';
import { nowInPerth } from '@/lib/utils';

type KeyType = 'house' | 'room' | 'mailbox' | 'gate' | 'other';

// =====================================================
// KEYS CRUD
// =====================================================

export async function getKeys(filters?: {
  houseId?: string;
  tenantId?: string;
  status?: KeyStatus;
  keyType?: KeyType;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('keys')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      tenant:tenants(id, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.tenantId) {
    query = query.eq('issued_to_tenant', filters.tenantId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.keyType) {
    query = query.eq('key_type', filters.keyType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function getKeyById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .select(`
      *,
      house:houses(*),
      room:rooms(*),
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function getKeysByTenant(tenantId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name)
    `)
    .eq('issued_to_tenant', tenantId)
    .eq('status', 'issued');

  if (error) throw error;
  return data as any[];
}

export async function createKey(data: KeyFormData) {
  const supabase = await createClient();
  
  const { data: key, error } = await supabase
    .from('keys')
    .insert({
      house_id: data.house_id,
      room_id: data.room_id,
      key_type: data.key_type,
      key_number: data.key_number,
      notes: data.notes,
      status: 'available' as KeyStatus,
      replacement_cost: data.replacement_cost || 50,
    })
    .select()
    .single();

  if (error) throw error;
  return key;
}

export async function updateKey(id: string, data: Partial<KeyFormData>) {
  const supabase = await createClient();
  
  const { data: key, error } = await supabase
    .from('keys')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return key;
}

export async function deleteKey(id: string) {
  const supabase = await createClient();
  
  // Check if key is assigned
  const { data: key } = await supabase
    .from('keys')
    .select('status')
    .eq('id', id)
    .single();

  if (key?.status === 'issued') {
    throw new Error('Cannot delete a key that is currently assigned');
  }

  const { error } = await supabase
    .from('keys')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// KEY ASSIGNMENT
// =====================================================

export async function assignKey(keyId: string, tenantId: string) {
  const supabase = await createClient();
  
  // Check key availability
  const { data: key, error: checkError } = await supabase
    .from('keys')
    .select('status')
    .eq('id', keyId)
    .single();

  if (checkError) throw checkError;
  if (key.status === 'issued') {
    throw new Error('Key is already assigned to another tenant');
  }
  if (key.status === 'lost') {
    throw new Error('Cannot assign a lost key');
  }

  const { data, error } = await supabase
    .from('keys')
    .update({
      status: 'issued' as KeyStatus,
      issued_to_tenant: tenantId,
      issued_date: format(nowInPerth(), 'yyyy-MM-dd'),
    })
    .eq('id', keyId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function unassignKey(keyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .update({
      status: 'available' as KeyStatus,
      issued_to_tenant: null,
      issued_date: null,
      returned_date: format(nowInPerth(), 'yyyy-MM-dd'),
    })
    .eq('id', keyId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function reportKeyLost(keyId: string, notes?: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .update({
      status: 'lost' as KeyStatus,
      notes: notes || 'Reported lost',
    })
    .eq('id', keyId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function returnAllTenantKeys(tenantId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .update({
      status: 'available' as KeyStatus,
      issued_to_tenant: null,
      issued_date: null,
      returned_date: format(nowInPerth(), 'yyyy-MM-dd'),
    })
    .eq('issued_to_tenant', tenantId)
    .select();

  if (error) throw error;
  return data as any;
}

// =====================================================
// KEY INVENTORY
// =====================================================

export async function getKeyInventory(houseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .select('status, key_type')
    .eq('house_id', houseId);

  if (error) throw error;

  type KeyInventoryItem = { status: string; key_type: string };
  const inventory = {
    total: data?.length || 0,
    available: data?.filter((k: KeyInventoryItem) => k.status === 'available').length || 0,
    assigned: data?.filter((k: KeyInventoryItem) => k.status === 'issued').length || 0,
    lost: data?.filter((k: KeyInventoryItem) => k.status === 'lost').length || 0,
    byType: {} as Record<string, { total: number; available: number; assigned: number; lost: number }>,
  };

  // Group by type
  for (const key of data || []) {
    if (!inventory.byType[key.key_type]) {
      inventory.byType[key.key_type] = { total: 0, available: 0, assigned: 0, lost: 0 };
    }
    inventory.byType[key.key_type].total++;
    if (key.status === 'available') inventory.byType[key.key_type].available++;
    if (key.status === 'issued') inventory.byType[key.key_type].assigned++;
    if (key.status === 'lost') inventory.byType[key.key_type].lost++;
  }

  return inventory;
}

export async function getAvailableKeysForHouse(houseId: string, keyType?: KeyType) {
  const supabase = await createClient();
  
  let query = supabase
    .from('keys')
    .select(`
      *,
      room:rooms(id, name)
    `)
    .eq('house_id', houseId)
    .eq('status', 'available');

  if (keyType) {
    query = query.eq('key_type', keyType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

// =====================================================
// KEY REPORTS
// =====================================================

export async function getLostKeysReport() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      tenant:tenants(id, first_name, last_name)
    `)
    .eq('status', 'lost')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

export async function getKeyAssignmentHistory(keyId: string) {
  // This would typically be implemented with a separate key_history table
  // For now, we return the current assignment info
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('keys')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name)
    `)
    .eq('id', keyId)
    .single();

  if (error) throw error;
  return data as any;
}

// =====================================================
// BULK OPERATIONS
// =====================================================

export async function createKeySet(
  houseId: string,
  keyTypes: KeyType[],
  roomId?: string,
  keyNumberPrefix?: string
) {
  const supabase = await createClient();
  
  const keys = keyTypes.map((keyType, index) => ({
    house_id: houseId,
    room_id: roomId,
    key_type: keyType,
    key_number: keyNumberPrefix 
      ? `${keyNumberPrefix}-${keyType.toUpperCase()}-${index + 1}`
      : `${keyType.toUpperCase()}-${Date.now()}-${index + 1}`,
    status: 'available' as KeyStatus,
  }));

  const { data, error } = await supabase
    .from('keys')
    .insert(keys)
    .select();

  if (error) throw error;
  return data as any;
}

export async function assignKeySetToTenant(
  houseId: string,
  tenantId: string,
  roomId?: string
) {
  const supabase = await createClient();
  
  // Get available keys for this house/room
  let query = supabase
    .from('keys')
    .select('id, key_type')
    .eq('house_id', houseId)
    .eq('status', 'available');

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data: availableKeys, error: getError } = await query;
  if (getError) throw getError;

  if (!availableKeys?.length) {
    throw new Error('No available keys found');
  }

  // Assign one of each type
  const assignedTypes: KeyType[] = [];
  const assignedKeys: Key[] = [];

  for (const key of availableKeys) {
    if (!assignedTypes.includes(key.key_type as KeyType)) {
      const assigned = await assignKey(key.id, tenantId);
      assignedKeys.push(assigned);
      assignedTypes.push(key.key_type as KeyType);
    }
  }

  return assignedKeys;
}
