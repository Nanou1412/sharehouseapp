import { createClient } from '@/lib/supabase/server';
import type { Database, House, Room, Bed, RoomType, BedStatus } from '@/types/database';
import type { HouseFormData, RoomFormData, BedFormData } from '@/zod-schemas';

// =====================================================
// HOUSES SERVICE
// =====================================================

export async function getHouses(activeOnly: boolean = true) {
  const supabase = await createClient();
  
  let query = supabase
    .from('houses')
    .select('*')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any;
}

export async function getHouseById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function getHouseWithDetails(id: string) {
  const supabase = await createClient();
  
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('*')
    .eq('id', id)
    .single();

  if (houseError) throw houseError;

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select(`
      *,
      beds (*)
    `)
    .eq('house_id', id)
    .eq('is_active', true)
    .order('name');

  if (roomsError) throw roomsError;

  return { ...house, rooms: rooms || [] };
}

export async function createHouse(data: HouseFormData) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use service client to bypass RLS for insert+select
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();
  
  const { data: house, error } = await serviceClient
    .from('houses')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  
  // Auto-grant house access to the creator
  if (user && house) {
    await serviceClient
      .from('user_house_access')
      .upsert({
        user_id: user.id,
        house_id: house.id,
        can_edit: true,
      }, { onConflict: 'user_id,house_id' });
    
    // Also grant access to all other active users (managers/admins)
    const { data: allUsers } = await serviceClient
      .from('users')
      .select('id')
      .eq('is_active', true)
      .neq('id', user.id);
    
    if (allUsers && allUsers.length > 0) {
      const accessEntries = allUsers.map((u: any) => ({
        user_id: u.id,
        house_id: house.id,
        can_edit: true,
      }));
      await serviceClient
        .from('user_house_access')
        .upsert(accessEntries, { onConflict: 'user_id,house_id' });
    }
  }
  
  return house;
}

export async function updateHouse(id: string, data: Partial<HouseFormData>) {
  const supabase = await createClient();
  
  const { data: house, error } = await supabase
    .from('houses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return house;
}

export async function deleteHouse(id: string) {
  const supabase = await createClient();
  
  // Soft delete
  const { error } = await supabase
    .from('houses')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ROOMS SERVICE
// =====================================================

export async function getRoomsByHouse(houseId: string, activeOnly: boolean = true) {
  const supabase = await createClient();
  
  let query = supabase
    .from('rooms')
    .select(`
      *,
      beds (*)
    `)
    .eq('house_id', houseId)
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function getRoomById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      house:houses(*),
      beds (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createRoom(data: RoomFormData) {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();
  
  const { data: room, error } = await serviceClient
    .from('rooms')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return room;
}

export async function updateRoom(id: string, data: Partial<RoomFormData>) {
  const supabase = await createClient();
  
  const { data: room, error } = await supabase
    .from('rooms')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return room;
}

export async function deleteRoom(id: string) {
  const supabase = await createClient();
  
  // Soft delete
  const { error } = await supabase
    .from('rooms')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// BEDS SERVICE
// =====================================================

export async function getBedsByRoom(roomId: string, activeOnly: boolean = true) {
  const supabase = await createClient();
  
  let query = supabase
    .from('beds')
    .select('*')
    .eq('room_id', roomId)
    .order('bed_number');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any;
}

export async function getBedById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('beds')
    .select(`
      *,
      room:rooms(
        *,
        house:houses(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createBed(data: BedFormData) {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = await createServiceClient();
  
  const { data: bed, error } = await serviceClient
    .from('beds')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return bed;
}

export async function updateBed(id: string, data: Partial<BedFormData>) {
  const supabase = await createClient();
  
  const { data: bed, error } = await supabase
    .from('beds')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return bed;
}

export async function updateBedStatus(id: string, status: BedStatus) {
  return updateBed(id, { status });
}

export async function deleteBed(id: string) {
  const supabase = await createClient();
  
  // Soft delete
  const { error } = await supabase
    .from('beds')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// OCCUPANCY HELPERS
// =====================================================

export async function getAvailableBeds(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('beds')
    .select(`
      *,
      room:rooms!inner(
        *,
        house:houses!inner(*)
      )
    `)
    .eq('status', 'available')
    .eq('is_active', true)
    .eq('room.is_active', true)
    .eq('room.house.is_active', true);

  if (houseId) {
    query = query.eq('room.house_id', houseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any[];
}

export async function getOccupancyStats(houseId: string) {
  const supabase = await createClient();
  
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      room_type,
      beds (
        id,
        status
      )
    `)
    .eq('house_id', houseId)
    .eq('is_active', true);

  if (error) throw error;

  let totalBeds = 0;
  let occupiedBeds = 0;
  let reservedBeds = 0;
  let maintenanceBeds = 0;
  let availableBeds = 0;

  rooms?.forEach((room: any) => {
    if (room.room_type === 'private') {
      totalBeds += 1;
      // Check if room has any active lease
      // For simplicity, count as occupied if has beds marked occupied
      const beds = room.beds || [];
      if (beds.some((b: any) => b.status === 'occupied')) occupiedBeds++;
      else if (beds.some((b: any) => b.status === 'reserved')) reservedBeds++;
      else if (beds.some((b: any) => b.status === 'maintenance')) maintenanceBeds++;
      else availableBeds++;
    } else {
      const beds = room.beds || [];
      beds.forEach((bed: any) => {
        totalBeds++;
        if (bed.status === 'occupied') occupiedBeds++;
        else if (bed.status === 'reserved') reservedBeds++;
        else if (bed.status === 'maintenance') maintenanceBeds++;
        else availableBeds++;
      });
    }
  });

  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    totalBeds,
    occupiedBeds,
    reservedBeds,
    maintenanceBeds,
    availableBeds,
    occupancyRate,
  };
}

export async function getCurrentOccupancy(houseId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('current_occupancy')
    .select('*');

  if (houseId) {
    query = query.eq('house_id', houseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as any;
}

// Convenience aliases
export const getRoomsByHouseId = getRoomsByHouse;
export const getBedsByRoomId = getBedsByRoom;
