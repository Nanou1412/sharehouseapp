import { createClient } from '@/lib/supabase/server';
import type { Alert, AlertType, AlertPriority } from '@/types/database';
import { format, addDays } from 'date-fns';
import { nowInPerth } from '@/lib/utils';

// =====================================================
// ALERTS CRUD
// =====================================================

export async function getAlerts(filters?: {
  houseId?: string;
  type?: AlertType | AlertType[];
  priority?: AlertPriority;
  isRead?: boolean;
  userId?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.type) {
    if (Array.isArray(filters.type)) {
      query = query.in('alert_type', filters.type);
    } else {
      query = query.eq('alert_type', filters.type);
    }
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }

  // Note: alerts table has no user_id column — userId param kept in signature for API compat but not filtered

  const { data, error } = await query;
  if (error) throw error;
  return data as any;
}

export async function getUnreadAlertsCount(userId?: string): Promise<number> {
  const supabase = await createClient();
  
  const query = supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  // Note: alerts table has no user_id column — not filtered by userId

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function createAlert(data: {
  alertType: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  houseId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const supabase = await createClient();
  
  const { data: alert, error } = await supabase
    .from('alerts')
    .insert({
      alert_type: data.alertType,
      priority: data.priority,
      title: data.title,
      message: data.message,
      house_id: data.houseId,
      related_entity_type: data.relatedEntityType,
      related_entity_id: data.relatedEntityId,
      is_read: false,
      is_dismissed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return alert;
}

export async function markAlertAsRead(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function markAllAlertsAsRead(userId?: string) {
  const supabase = await createClient();
  
  const query = supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('is_read', false);

  // Note: alerts table has no user_id column — not filtered by userId

  const { error } = await query;
  if (error) throw error;
}

export async function deleteAlert(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteOldAlerts(daysOld: number = 30) {
  const supabase = await createClient();
  
  const cutoffDate = format(
    addDays(nowInPerth(), -daysOld),
    'yyyy-MM-dd\'T\'HH:mm:ss'
  );

  const { error } = await supabase
    .from('alerts')
    .delete()
    .lt('created_at', cutoffDate)
    .eq('is_read', true);

  if (error) throw error;
}

// =====================================================
// ALERT GENERATION
// =====================================================

export async function generateArrearsAlerts() {
  const supabase = await createClient();
  
  // Use the arrears_summary view which calculates totals from rent_charges
  const { data: arrears, error } = await supabase
    .from('arrears_summary')
    .select('*')
    .gt('total_arrears', 100); // Arrears > $100

  if (error) throw error;

  const alerts: Alert[] = [];
  for (const row of arrears || []) {
    const arrearsAmount = Number(row.total_arrears) || 0;

    // Determine priority based on arrears amount
    let priority: AlertPriority = 'info';
    if (arrearsAmount > 500) priority = 'critical';
    else if (arrearsAmount > 200) priority = 'warning';

    // Check if similar alert exists in last 7 days
    const weekAgo = format(addDays(nowInPerth(), -7), 'yyyy-MM-dd\'T\'HH:mm:ss');
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'arrears')
      .eq('related_entity_id', row.tenant_id)
      .gt('created_at', weekAgo)
      .limit(1)
      .maybeSingle();

    if (!existingAlert) {
      const alert = await createAlert({
        alertType: 'arrears',
        priority,
        title: `Rent Arrears: ${row.tenant_name}`,
        message: `${row.tenant_name} has $${arrearsAmount.toFixed(2)} in arrears${row.house_name ? ` at ${row.house_name}` : ''}. Overdue weeks: ${row.overdue_weeks || 0}.`,
        houseId: row.house_id,
        relatedEntityType: 'tenant',
        relatedEntityId: row.tenant_id,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function generateLeaseExpiryAlerts(daysAhead: number = 30) {
  const supabase = await createClient();
  
  const today = format(nowInPerth(), 'yyyy-MM-dd');
  const futureDate = format(addDays(nowInPerth(), daysAhead), 'yyyy-MM-dd');

  // Get expiring leases — tenants are linked through lease_participants, not directly
  const { data: expiringLeases, error } = await supabase
    .from('leases')
    .select(`
      id,
      end_date,
      house_id,
      bed_id,
      lease_participants(
        tenant_id,
        is_primary,
        tenant:tenants(id, first_name, last_name)
      ),
      bed:beds(
        bed_number,
        room:rooms(
          name,
          house:houses(id, name)
        )
      )
    `)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', futureDate);

  if (error) throw error;

  const alerts: Alert[] = [];
  for (const lease of expiringLeases || []) {
    const bedData = lease.bed as any;
    const houseId = bedData?.room?.house?.id ?? lease.house_id;
    const houseName = bedData?.room?.house?.name;
    const daysUntilExpiry = Math.ceil(
      (new Date(lease.end_date!).getTime() - nowInPerth().getTime()) / (1000 * 60 * 60 * 24)
    );

    let priority: AlertPriority = 'info';
    if (daysUntilExpiry <= 7) priority = 'critical';
    else if (daysUntilExpiry <= 14) priority = 'warning';

    // Find primary tenant from lease_participants
    const participants = lease.lease_participants as any[];
    const primary = participants?.find((p: any) => p.is_primary);
    const tenant = primary?.tenant;

    // Check for existing alert
    const weekAgo = format(addDays(nowInPerth(), -7), 'yyyy-MM-dd\'T\'HH:mm:ss');
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'lease_expiry')
      .eq('related_entity_id', lease.id)
      .gt('created_at', weekAgo)
      .limit(1)
      .maybeSingle();

    if (!existingAlert && tenant) {
      const alert = await createAlert({
        alertType: 'lease_expiry',
        priority,
        title: `Lease Expiring: ${tenant.first_name} ${tenant.last_name}`,
        message: `Lease expires on ${lease.end_date} (${daysUntilExpiry} days)${houseName ? ` at ${houseName}` : ''}.`,
        houseId,
        relatedEntityType: 'lease',
        relatedEntityId: lease.id,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function generateMaintenanceAlerts() {
  const supabase = await createClient();
  
  // Get urgent tickets that are open for more than 24 hours
  const dayAgo = format(addDays(nowInPerth(), -1), 'yyyy-MM-dd\'T\'HH:mm:ss');

  const { data: urgentTickets, error } = await supabase
    .from('maintenance_tickets')
    .select(`
      id,
      title,
      priority,
      created_at,
      house:houses(id, name)
    `)
    .eq('priority', 'urgent')
    .in('status', ['open', 'in_progress'])
    .lt('created_at', dayAgo);

  if (error) throw error;

  const alerts: Alert[] = [];
  for (const ticket of urgentTickets || []) {
    // Check for existing alert
    const dayAgoStr = format(addDays(nowInPerth(), -1), 'yyyy-MM-dd\'T\'HH:mm:ss');
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'maintenance')
      .eq('related_entity_id', ticket.id)
      .gt('created_at', dayAgoStr)
      .limit(1)
      .maybeSingle();

    if (!existingAlert) {
      const houseData = ticket.house as any;
      const alert = await createAlert({
        alertType: 'maintenance',
        priority: 'critical',
        title: `Urgent Maintenance Pending: ${ticket.title}`,
        message: `Urgent maintenance ticket "${ticket.title}" has been open for more than 24 hours${houseData ? ` at ${houseData.name}` : ''}.`,
        houseId: houseData?.id,
        relatedEntityType: 'maintenance_ticket',
        relatedEntityId: ticket.id,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function generateDocumentExpiryAlerts(daysAhead: number = 30) {
  const supabase = await createClient();
  
  const today = format(nowInPerth(), 'yyyy-MM-dd');
  const futureDate = format(addDays(nowInPerth(), daysAhead), 'yyyy-MM-dd');

  // tenant_documents has no expiry_date column — check visa_expiry and id_expiry on tenants instead
  const { data: expiringVisas, error } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, visa_type, visa_expiry')
    .not('visa_expiry', 'is', null)
    .gte('visa_expiry', today)
    .lte('visa_expiry', futureDate)
    .eq('status', 'active');

  if (error) throw error;

  const alerts: Alert[] = [];

  for (const tenant of expiringVisas || []) {
    const daysUntilExpiry = Math.ceil(
      (new Date(tenant.visa_expiry!).getTime() - nowInPerth().getTime()) / (1000 * 60 * 60 * 24)
    );

    let priority: AlertPriority = 'info';
    if (daysUntilExpiry <= 7) priority = 'critical';
    else if (daysUntilExpiry <= 14) priority = 'warning';

    // Get house_id through lease_participants → leases
    const { data: participantData } = await supabase
      .from('lease_participants')
      .select('lease:leases(house_id)')
      .eq('tenant_id', tenant.id)
      .limit(1)
      .maybeSingle();

    const houseId = (participantData?.lease as any)?.house_id;

    // Check for existing alert
    // Note: Using 'bills' alert_type for document expiry alerts
    // (DB enum only supports: occupancy, arrears, maintenance, bills, lease_expiry, vacancy)
    const weekAgo = format(addDays(nowInPerth(), -7), 'yyyy-MM-dd\'T\'HH:mm:ss');
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'bills')
      .eq('related_entity_type', 'tenant')
      .eq('related_entity_id', tenant.id)
      .gt('created_at', weekAgo)
      .limit(1)
      .maybeSingle();

    if (!existingAlert) {
      const alert = await createAlert({
        alertType: 'bills',
        priority,
        title: `Visa Expiring: ${tenant.first_name} ${tenant.last_name}`,
        message: `${tenant.visa_type || 'Visa'} expires on ${tenant.visa_expiry} (${daysUntilExpiry} days).`,
        houseId,
        relatedEntityType: 'tenant',
        relatedEntityId: tenant.id,
      });
      alerts.push(alert);
    }
  }

  // Also check tenant ID expiry dates
  const { data: expiringIds, error: idError } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, id_type, id_expiry')
    .not('id_expiry', 'is', null)
    .gte('id_expiry', today)
    .lte('id_expiry', futureDate)
    .eq('status', 'active');

  if (idError) throw idError;

  for (const tenant of expiringIds || []) {
    const daysUntilExpiry = Math.ceil(
      (new Date(tenant.id_expiry!).getTime() - nowInPerth().getTime()) / (1000 * 60 * 60 * 24)
    );

    let priority: AlertPriority = 'info';
    if (daysUntilExpiry <= 7) priority = 'critical';
    else if (daysUntilExpiry <= 14) priority = 'warning';

    const { data: participantData } = await supabase
      .from('lease_participants')
      .select('lease:leases(house_id)')
      .eq('tenant_id', tenant.id)
      .limit(1)
      .maybeSingle();

    const houseId = (participantData?.lease as any)?.house_id;

    // Note: Using 'bills' alert_type for ID expiry alerts (no dedicated enum value)
    const weekAgo = format(addDays(nowInPerth(), -7), 'yyyy-MM-dd\'T\'HH:mm:ss');
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('alert_type', 'bills')
      .eq('related_entity_type', 'tenant')
      .eq('related_entity_id', tenant.id)
      .gt('created_at', weekAgo)
      .limit(1)
      .maybeSingle();

    if (!existingAlert) {
      const alert = await createAlert({
        alertType: 'bills',
        priority,
        title: `ID Expiring: ${tenant.first_name} ${tenant.last_name}`,
        message: `${tenant.id_type || 'ID'} expires on ${tenant.id_expiry} (${daysUntilExpiry} days).`,
        houseId,
        relatedEntityType: 'tenant',
        relatedEntityId: tenant.id,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function generateVacancyAlerts(daysAhead: number = 14) {
  const supabase = await createClient();
  
  const today = format(nowInPerth(), 'yyyy-MM-dd');
  const futureDate = format(addDays(nowInPerth(), daysAhead), 'yyyy-MM-dd');

  // Get beds that will become vacant — tenants via lease_participants
  const { data: endingLeases, error } = await supabase
    .from('leases')
    .select(`
      id,
      end_date,
      bed_id,
      house_id,
      lease_participants(
        tenant_id,
        is_primary,
        tenant:tenants(first_name, last_name)
      ),
      bed:beds(
        id,
        bed_number,
        room:rooms(
          name,
          house:houses(id, name)
        )
      )
    `)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', futureDate);

  if (error) throw error;

  const alerts: Alert[] = [];
  for (const lease of endingLeases || []) {
    if (!lease.bed_id) continue;

    // Check if there's a replacement lease or reservation
    const { data: replacement } = await supabase
      .from('leases')
      .select('id')
      .eq('bed_id', lease.bed_id)
      .in('status', ['active', 'reserved'])
      .gt('start_date', lease.end_date!)
      .limit(1)
      .maybeSingle();

    if (!replacement) {
      const bedData = lease.bed as any;
      const houseId = bedData?.room?.house?.id ?? lease.house_id;
      const houseName = bedData?.room?.house?.name;
      const roomName = bedData?.room?.name;
      const bedName = bedData?.name;

      // Find primary tenant from lease_participants
      const participants = lease.lease_participants as any[];
      const primary = participants?.find((p: any) => p.is_primary);
      const tenant = primary?.tenant;

      // Check for existing alert
      const weekAgo = format(addDays(nowInPerth(), -7), 'yyyy-MM-dd\'T\'HH:mm:ss');
      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('alert_type', 'vacancy')
        .eq('related_entity_id', lease.bed_id)
        .gt('created_at', weekAgo)
        .limit(1)
        .maybeSingle();

      if (!existingAlert) {
        const tenantName = tenant
          ? `${tenant.first_name} ${tenant.last_name}`
          : 'Unknown';

        const alert = await createAlert({
          alertType: 'vacancy',
          priority: 'warning',
          title: `Upcoming Vacancy: ${houseName} - ${roomName}/${bedName}`,
          message: `Bed will be vacant from ${lease.end_date}. Current tenant: ${tenantName}.`,
          houseId,
          relatedEntityType: 'bed',
          relatedEntityId: lease.bed_id,
        });
        alerts.push(alert);
      }
    }
  }

  return alerts;
}

// =====================================================
// RUN ALL ALERT CHECKS
// =====================================================

export async function runAllAlertChecks() {
  const results = {
    arrears: await generateArrearsAlerts(),
    leaseExpiry: await generateLeaseExpiryAlerts(),
    maintenance: await generateMaintenanceAlerts(),
    documentExpiry: await generateDocumentExpiryAlerts(),
    vacancy: await generateVacancyAlerts(),
  };

  return {
    ...results,
    totalGenerated: 
      results.arrears.length + 
      results.leaseExpiry.length + 
      results.maintenance.length + 
      results.documentExpiry.length +
      results.vacancy.length,
  };
}
