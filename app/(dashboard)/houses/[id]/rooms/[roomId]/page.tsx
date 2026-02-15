import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, Bed, Users, DollarSign, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRoomById, getBedsByRoomId } from '@/lib/services/property-service';

interface PageProps {
  params: { id: string; roomId: string };
}

export default async function RoomDetailPage({ params }: PageProps) {
  const room = await getRoomById(params.roomId);

  if (!room) {
    notFound();
  }

  const beds = await getBedsByRoomId(params.roomId);

  const occupiedBeds = beds?.filter((b: any) => b.is_occupied).length || 0;
  const totalBeds = beds?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/houses/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground">
            {room.room_type} room
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/houses/${params.id}/rooms/${params.roomId}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Modifier la chambre
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/houses/${params.id}/rooms/${params.roomId}/beds/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un lit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total lits</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Loyer hebdomadaire</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${room.weekly_rent || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails de la chambre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Type de chambre</p>
              <p className="font-medium capitalize">{room.room_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Étage</p>
              <p className="font-medium">{room.floor_level ?? 'Rez-de-chaussée'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{room.description || 'Aucune description'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beds List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lits</CardTitle>
              <CardDescription>
                Tous les lits de cette chambre
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`/houses/${params.id}/rooms/${params.roomId}/beds/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un lit
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {beds && beds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {beds.map((bed) => (
                <Card key={bed.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{bed.label || `Bed ${bed.id.slice(0, 6)}`}</CardTitle>
                      <Badge variant={bed.is_occupied ? 'default' : 'secondary'}>
                        {bed.is_occupied ? 'Occupé' : 'Disponible'}
                      </Badge>
                    </div>
                    <CardDescription className="capitalize">
                      {bed.bed_type} bed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loyer hebdo</span>
                        <span className="font-medium">${bed.weekly_rent}</span>
                      </div>
                      {bed.bond_amount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Caution</span>
                          <span className="font-medium">${bed.bond_amount}</span>
                        </div>
                      )}
                      {bed.current_tenant && (
                        <div className="pt-2 border-t">
                          <Link 
                            href={`/tenants/${bed.current_tenant.id}`}
                            className="text-primary hover:underline"
                          >
                            {bed.current_tenant.first_name} {bed.current_tenant.last_name}
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bed className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun lit</h3>
              <p className="text-muted-foreground">
                Ajoutez des lits à cette chambre pour y affecter des locataires
              </p>
              <Button asChild className="mt-4">
                <Link href={`/houses/${params.id}/rooms/${params.roomId}/beds/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un lit
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
