import { createClient } from '@/lib/supabase/server';
import type { CleaningRoster } from '@/types/database';
import type { CleaningRosterFormData } from '@/zod-schemas';
import { format, startOfWeek, endOfWeek, addWeeks, addDays } from 'date-fns';
import { nowInPerth, getMondayOfWeek, getSundayOfWeek } from '@/lib/utils';

type CleaningRosterStatus = 'pending' | 'completed' | 'skipped';

// =====================================================
// CLEANING ROSTER CRUD
// =====================================================

export async function getCleaningRoster(filters?: {
  houseId?: string;
  tenantId?: string;
  weekStart?: string;
  status?: CleaningRosterStatus;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('cleaning_roster')
    .select(`
      *,
      house:houses(id, name),
      tenant:tenants(id, first_name, last_name, phone, email)
    `)
    .order('week_start', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }

  if (filters?.weekStart) {
    query = query.eq('week_start', filters.weekStart);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCleaningRosterById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('cleaning_roster')
    .select(`
      *,
      house:houses(*),
      tenant:tenants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getCurrentWeekRoster(houseId: string) {
  const supabase = await createClient();
  
  const weekStart = getMondayOfWeek(nowInPerth());

  const { data, error } = await supabase
    .from('cleaning_roster')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name, phone)
    `)
    .eq('house_id', houseId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCleaningRosterEntry(data: CleaningRosterFormData) {
  const supabase = await createClient();
  
  const { data: roster, error } = await supabase
    .from('cleaning_roster')
    .insert({
      house_id: data.house_id,
      tenant_id: data.tenant_id,
      week_start: data.week_start,
      areas: data.areas || ['common_areas'],
      is_completed: false,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return roster;
}

export async function updateCleaningRosterEntry(id: string, data: Partial<CleaningRosterFormData>) {
  const supabase = await createClient();
  
  const { data: roster, error } = await supabase
    .from('cleaning_roster')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return roster;
}

export async function updateCleaningStatus(id: string, isCompleted: boolean, completedAt?: string) {
  const supabase = await createClient();
  
  const updateData: Partial<CleaningRoster> = { is_completed: isCompleted };
  
  if (isCompleted) {
    updateData.completed_at = completedAt || format(nowInPerth(), 'yyyy-MM-dd\'T\'HH:mm:ss');
  }

  const { data, error } = await supabase
    .from('cleaning_roster')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCleaningRosterEntry(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('cleaning_roster')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ROSTER GENERATION
// =====================================================

export async function generateWeeklyRoster(houseId: string, weekStart: string) {
  const supabase = await createClient();
  
  // Get all active tenants for this house
  const { data: activeLeases, error: leasesError } = await supabase
    .from('leases')
    .select(`
      tenant_id,
      tenant:tenants(id, first_name, last_name),
      bed:beds(
        room:rooms(house_id)
      )
    `)
    .eq('status', 'active')
    .eq('bed.room.house_id', houseId);

  if (leasesError) throw leasesError;

  type LeaseWithBed = { tenant_id: string; bed?: Array<{ room?: Array<{ house_id?: string }> }> };
  // Filter to only tenants in this house
  const houseTenants = activeLeases?.filter((l: LeaseWithBed) => 
    l.bed?.[0]?.room?.[0]?.house_id === houseId
  ) || [];

  if (houseTenants.length === 0) {
    return null;
  }

  // Check existing roster entries to find last assigned tenant
  const { data: lastRoster } = await supabase
    .from('cleaning_roster')
    .select('tenant_id')
    .eq('house_id', houseId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Find next tenant in rotation
  let nextTenantIndex = 0;
  if (lastRoster?.tenant_id) {
    const lastIndex = houseTenants.findIndex((t: LeaseWithBed) => t.tenant_id === lastRoster.tenant_id);
    if (lastIndex >= 0) {
      nextTenantIndex = (lastIndex + 1) % houseTenants.length;
    }
  }

  const nextTenant = houseTenants[nextTenantIndex];

  // Create roster entry
  const { data: roster, error } = await supabase
    .from('cleaning_roster')
    .insert({
      house_id: houseId,
      tenant_id: nextTenant.tenant_id,
      week_start: weekStart,
      areas: ['common_areas'],
      is_completed: false,
    })
    .select(`
      *,
      tenant:tenants(id, first_name, last_name)
    `)
    .single();

  if (error) throw error;
  return roster;
}

export async function generateRosterForAllHouses(weekStart?: string) {
  const supabase = await createClient();
  
  const targetWeekStart = weekStart || getMondayOfWeek(nowInPerth());

  // Get all houses
  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('id, name')
    .eq('is_active', true);

  if (housesError) throw housesError;

  const results = [];
  for (const house of houses || []) {
    // Check if roster already exists for this week
    const { data: existing } = await supabase
      .from('cleaning_roster')
      .select('id')
      .eq('house_id', house.id)
      .eq('week_start', targetWeekStart)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const weekStartStr = typeof targetWeekStart === 'string' ? targetWeekStart : format(targetWeekStart, 'yyyy-MM-dd');
      const roster = await generateWeeklyRoster(house.id, weekStartStr);
      if (roster) {
        results.push({ house: house.name, roster });
      }
    }
  }

  return results;
}

// =====================================================
// ROSTER HISTORY & STATS
// =====================================================

export async function getTenantCleaningHistory(tenantId: string, limit: number = 10) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('cleaning_roster')
    .select(`
      *,
      house:houses(name)
    `)
    .eq('tenant_id', tenantId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getHouseCleaningStats(houseId: string) {
  const supabase = await createClient();
  
  const threeMonthsAgo = format(addDays(nowInPerth(), -90), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('cleaning_roster')
    .select('is_completed, tenant_id')
    .eq('house_id', houseId)
    .gte('week_start', threeMonthsAgo);

  if (error) throw error;

  type RosterEntry = { is_completed: boolean; tenant_id: string };
  const completed = data?.filter((r: RosterEntry) => r.is_completed === true).length || 0;
  const notCompleted = data?.filter((r: RosterEntry) => r.is_completed === false).length || 0;
  const total = data?.length || 0;

  // Calculate compliance rate
  const complianceRate = total > 0 ? (completed / total) * 100 : 0;

  // Find tenants with most incomplete tasks
  const incompleteByTenant: Record<string, number> = {};
  data?.filter((r: RosterEntry) => !r.is_completed).forEach((r: RosterEntry) => {
    incompleteByTenant[r.tenant_id] = (incompleteByTenant[r.tenant_id] || 0) + 1;
  });

  return {
    completed,
    notCompleted,
    total,
    complianceRate: Math.round(complianceRate * 10) / 10,
    incompleteByTenant,
  };
}

export async function getUpcomingRoster(houseId: string, weeks: number = 4) {
  const supabase = await createClient();
  
  const today = nowInPerth();
  const startWeek = getMondayOfWeek(today);
  const endWeek = getMondayOfWeek(addWeeks(today, weeks));

  const { data, error } = await supabase
    .from('cleaning_roster')
    .select(`
      *,
      tenant:tenants(id, first_name, last_name, phone)
    `)
    .eq('house_id', houseId)
    .gte('week_start', startWeek)
    .lte('week_start', endWeek)
    .order('week_start', { ascending: true });

  if (error) throw error;
  return data;
}

// =====================================================
// SWAP REQUESTS
// =====================================================

export async function swapCleaningDuty(rosterId: string, newTenantId: string, reason?: string) {
  const supabase = await createClient();
  
  // Get original roster entry
  const { data: original, error: getError } = await supabase
    .from('cleaning_roster')
    .select('*')
    .eq('id', rosterId)
    .single();

  if (getError) throw getError;

  // Update to new tenant
  const { data: updated, error: updateError } = await supabase
    .from('cleaning_roster')
    .update({
      tenant_id: newTenantId,
      notes: reason 
        ? `Swapped from previous tenant. Reason: ${reason}` 
        : 'Swapped from previous tenant',
    })
    .eq('id', rosterId)
    .select(`
      *,
      tenant:tenants(id, first_name, last_name)
    `)
    .single();

  if (updateError) throw updateError;
  return updated;
}
