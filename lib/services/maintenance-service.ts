import { createClient } from '@/lib/supabase/server';
import type { MaintenanceTicket, MaintenancePhoto, TicketStatus, TicketPriority } from '@/types/database';
import type { MaintenanceTicketFormData } from '@/zod-schemas';
import { format } from 'date-fns';
import { nowInPerth } from '@/lib/utils';

// =====================================================
// MAINTENANCE TICKETS
// =====================================================

export async function getMaintenanceTickets(filters?: {
  houseId?: string;
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority;
  assignedTo?: string;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_tickets')
    .select(`
      *,
      house:houses(id, name),
      room:rooms(id, name),
      reporter:tenants(id, first_name, last_name),
      assignee:users!maintenance_tickets_assigned_to_fkey(id, full_name),
      photos:maintenance_photos(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.houseId) {
    query = query.eq('house_id', filters.houseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMaintenanceTicketById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select(`
      *,
      house:houses(*),
      room:rooms(*),
      reporter:tenants(*),
      assignee:users!maintenance_tickets_assigned_to_fkey(*),
      photos:maintenance_photos(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMaintenanceTicket(data: MaintenanceTicketFormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ticket, error } = await supabase
    .from('maintenance_tickets')
    .insert({
      ...data,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return ticket;
}

export async function updateMaintenanceTicket(id: string, data: Partial<MaintenanceTicketFormData>) {
  const supabase = await createClient();
  
  const { data: ticket, error } = await supabase
    .from('maintenance_tickets')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return ticket;
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const supabase = await createClient();
  
  const updateData: Partial<MaintenanceTicket> = { status };
  
  if (status === 'completed') {
    updateData.completed_date = format(nowInPerth(), 'yyyy-MM-dd');
  }

  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignTicket(id: string, userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update({
      assigned_to: userId,
      status: 'in_progress' as TicketStatus,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMaintenanceTicket(id: string) {
  const supabase = await createClient();
  
  // Delete photos first
  const { data: photos } = await supabase
    .from('maintenance_photos')
    .select('file_path')
    .eq('ticket_id', id);

  if (photos?.length) {
    await supabase.storage
      .from('maintenance-photos')
      .remove(photos.map((p: { file_path: string }) => p.file_path));
  }

  await supabase
    .from('maintenance_photos')
    .delete()
    .eq('ticket_id', id);

  const { error } = await supabase
    .from('maintenance_tickets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// MAINTENANCE PHOTOS
// =====================================================

export async function uploadMaintenancePhoto(
  ticketId: string,
  file: File,
  photoType: string = 'issue',
  description?: string
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const fileName = `${ticketId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('maintenance-photos')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: photo, error } = await supabase
    .from('maintenance_photos')
    .insert({
      ticket_id: ticketId,
      file_path: fileName,
      file_name: file.name,
      description,
      photo_type: photoType,
      uploaded_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return photo;
}

export async function deleteMaintenancePhoto(id: string) {
  const supabase = await createClient();
  
  const { data: photo, error: getError } = await supabase
    .from('maintenance_photos')
    .select('file_path')
    .eq('id', id)
    .single();

  if (getError) throw getError;

  await supabase.storage
    .from('maintenance-photos')
    .remove([photo.file_path]);

  const { error } = await supabase
    .from('maintenance_photos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getMaintenancePhotoUrl(filePath: string) {
  const supabase = await createClient();
  
  const { data } = await supabase.storage
    .from('maintenance-photos')
    .createSignedUrl(filePath, 3600);

  return data?.signedUrl;
}

// =====================================================
// MAINTENANCE STATS
// =====================================================

export async function getMaintenanceStats(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_tickets')
    .select('id, status, priority, actual_cost, created_at, completed_date');

  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data, error } = await query;
  if (error) throw error;

  type TicketStats = { id: string; status: string; priority: string; actual_cost: number | null; created_at: string; completed_date: string | null };
  const open = data?.filter((t: TicketStats) => t.status === 'open').length || 0;
  const inProgress = data?.filter((t: TicketStats) => t.status === 'in_progress').length || 0;
  const completed = data?.filter((t: TicketStats) => t.status === 'completed').length || 0;
  const urgent = data?.filter((t: TicketStats) => t.priority === 'urgent' && t.status !== 'completed').length || 0;

  const totalCost = data
    ?.filter((t: TicketStats) => t.actual_cost)
    .reduce((sum: number, t: TicketStats) => sum + (t.actual_cost || 0), 0) || 0;

  // Calculate average resolution time
  const completedWithDates = data?.filter((t: TicketStats) => t.completed_date && t.created_at) || [];
  let avgResolutionDays = 0;
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum: number, t: TicketStats) => {
      const created = new Date(t.created_at);
      const completed = new Date(t.completed_date!);
      return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    avgResolutionDays = totalDays / completedWithDates.length;
  }

  return {
    open,
    inProgress,
    completed,
    urgent,
    totalCost,
    avgResolutionDays,
    total: data?.length || 0,
  };
}
