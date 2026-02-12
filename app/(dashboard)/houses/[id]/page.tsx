import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, Home, Bed as BedIcon, Users, Settings, MapPin, DollarSign, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHouseById, getRoomsByHouseId } from '@/lib/services/property-service';
import type { Room, Bed } from '@/types/database';

interface PageProps {
  params: { id: string };
}

export default async function HouseDetailPage({ params }: PageProps) {
  const house = await getHouseById(params.id);

  if (!house) {
    notFound();
  }

  const rooms = await getRoomsByHouseId(params.id);

  // Calculate stats
  const totalBeds = rooms?.reduce(
    (sum, room) => sum + (room.beds?.length || 0),
    0
  ) || 0;
  const occupiedBeds = rooms?.reduce(
    (sum, room) => sum + (room.beds?.filter((b: Bed) => b.status === 'occupied').length || 0),
    0
  ) || 0;
  const occupancyRate = totalBeds > 0 
    ? Math.round((occupiedBeds / totalBeds) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/houses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{house.address}</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {house.suburb}, {house.postcode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/houses/${params.id}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Edit House
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/houses/${params.id}/rooms/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <BedIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">
              {totalBeds - occupiedBeds} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* House Details */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{house.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suburb</p>
                <p className="font-medium">{house.suburb}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Postcode</p>
                <p className="font-medium">{house.postcode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bill Split Mode</p>
                <p className="font-medium">
                  {house.default_bill_split_mode?.replace('_', ' ') || 'Equal per occupant'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {house.default_bond_weeks && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bond</span>
                <span className="font-medium">{house.default_bond_weeks} weeks</span>
              </div>
            )}
            {house.property_manager && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Manager</span>
                <span className="font-medium">{house.property_manager}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rooms</CardTitle>
              <CardDescription>
                All rooms in this property
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`/houses/${params.id}/rooms/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rooms && rooms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const bedsOccupied = room.beds?.filter((b: Bed) => b.status === 'occupied').length || 0;
                const totalRoomBeds = room.beds?.length || 0;

                return (
                  <Link 
                    key={room.id} 
                    href={`/houses/${params.id}/rooms/${room.id}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                          <Badge 
                            variant={bedsOccupied === totalRoomBeds ? 'default' : 'secondary'}
                          >
                            {bedsOccupied}/{totalRoomBeds}
                          </Badge>
                        </div>
                        <CardDescription>
                          {room.room_type} room
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BedIcon className="h-4 w-4" />
                            {totalRoomBeds} beds
                          </div>
                          {room.weekly_rent && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${room.weekly_rent}/week
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Home className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rooms yet</h3>
              <p className="text-muted-foreground">
                Add rooms to this property to manage beds and tenants
              </p>
              <Button asChild className="mt-4">
                <Link href={`/houses/${params.id}/rooms/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
