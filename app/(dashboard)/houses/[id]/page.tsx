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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" asChild className="self-start">
          <Link href="/houses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{house.address}</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{house.suburb}, {house.postcode}</span>
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/houses/${params.id}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/houses/${params.id}/rooms/new`}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ajouter une</span> chambre
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chambres</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total lits</CardTitle>
            <BedIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">
              {totalBeds - occupiedBeds} disponible{totalBeds - occupiedBeds !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d&apos;occupation</CardTitle>
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
            <CardTitle>Détails de la propriété</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{house.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quartier</p>
                <p className="font-medium">{house.suburb}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Code postal</p>
                <p className="font-medium">{house.postcode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode de partage des factures</p>
                <p className="font-medium">
                  {house.default_bill_split_mode?.replace('_', ' ') || 'Égal par occupant'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coûts par défaut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {house.default_bond_weeks && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Caution</span>
                <span className="font-medium">{house.default_bond_weeks} semaines</span>
              </div>
            )}
            {house.property_manager && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gérant</span>
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
              <CardTitle>Chambres</CardTitle>
              <CardDescription>
                Toutes les chambres de cette propriété
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`/houses/${params.id}/rooms/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une chambre
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
                          Chambre {room.room_type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BedIcon className="h-4 w-4" />
                            {totalRoomBeds} lits
                          </div>
                          {room.weekly_rent && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${room.weekly_rent}/sem
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
              <h3 className="mt-4 text-lg font-semibold">Aucune chambre</h3>
              <p className="text-muted-foreground">
                Ajoutez des chambres pour gérer les lits et locataires
              </p>
              <Button asChild className="mt-4">
                <Link href={`/houses/${params.id}/rooms/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une chambre
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
