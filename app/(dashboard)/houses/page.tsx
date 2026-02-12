import Link from 'next/link';
import { Plus, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHouses } from '@/lib/services/property-service';
import { createClient } from '@/lib/supabase/server';

export default async function HousesPage() {
  const houses = await getHouses();
  
  // Get rooms with beds for each house
  const supabase = await createClient();
  const houseIds = houses?.map((h: { id: string }) => h.id) || [];
  const { data: allRooms } = houseIds.length > 0 
    ? await supabase
        .from('rooms')
        .select('id, house_id, beds(id, status)')
        .in('house_id', houseIds)
        .eq('is_active', true)
    : { data: [] };
  
  // Create a map of house_id -> rooms
  const roomsByHouse = new Map<string, typeof allRooms>();
  for (const room of allRooms || []) {
    const existing = roomsByHouse.get(room.house_id) || [];
    existing.push(room);
    roomsByHouse.set(room.house_id, existing);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Houses</h1>
          <p className="text-muted-foreground">
            Manage your sharehouse properties
          </p>
        </div>
        <Button asChild>
          <Link href="/houses/new">
            <Plus className="mr-2 h-4 w-4" />
            Add House
          </Link>
        </Button>
      </div>

      {/* Houses Grid */}
      {houses && houses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {houses.map((house: {
            id: string;
            name: string;
            address: string;
            suburb: string;
            total_beds: number;
            is_active: boolean;
          }) => {
            const houseRooms = roomsByHouse.get(house.id) || [];
            type RoomWithBeds = { beds?: Array<{ status: string }> };
            const totalBeds = houseRooms.reduce(
              (sum: number, room: RoomWithBeds) => sum + (room.beds?.length || 0),
              0
            );
            const occupiedBeds = houseRooms.reduce(
              (sum: number, room: RoomWithBeds) => sum + (room.beds?.filter((b: { status: string }) => b.status === 'occupied').length || 0),
              0
            );
            const occupancyRate = totalBeds > 0 
              ? Math.round((occupiedBeds / totalBeds) * 100) 
              : 0;

            return (
              <Link key={house.id} href={`/houses/${house.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{house.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {house.suburb}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={house.is_active ? 'success' : 'secondary'}>
                        {house.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{houseRooms.length}</p>
                        <p className="text-xs text-muted-foreground">Rooms</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalBeds}</p>
                        <p className="text-xs text-muted-foreground">Beds</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{occupancyRate}%</p>
                        <p className="text-xs text-muted-foreground">Occupied</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Address</span>
                        <span className="truncate max-w-[180px]">{house.address}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No houses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first sharehouse property
            </p>
            <Button asChild>
              <Link href="/houses/new">
                <Plus className="mr-2 h-4 w-4" />
                Add House
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
