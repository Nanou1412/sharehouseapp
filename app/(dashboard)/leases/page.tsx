import Link from 'next/link';
import { Plus, Calendar, Users, Clock, CheckCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLeases, getReservations } from '@/lib/services/lease-service';

const leaseStatusColors: Record<string, string> = {
  active: 'default',
  pending: 'secondary',
  ended: 'outline',
  cancelled: 'destructive',
};

export default async function LeasesPage() {
  const [leases, reservations] = await Promise.all([
    getLeases(),
    getReservations(),
  ]);

  const activeLeases = leases?.filter((l: any) => l.status === 'active').length || 0;
  const pendingReservations = reservations?.filter((r: any) => r.status === 'pending').length || 0;
  const endingSoon = leases?.filter((l: any) => {
    if (!l.end_date || l.status !== 'active') return false;
    const endDate = new Date(l.end_date);
    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground">
            Gérer les contrats de location et les réservations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leases/reservations">
              <Calendar className="mr-2 h-4 w-4" />
              Réservations
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leases/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bail
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReservations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fin proche</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{endingSoon}</div>
            <p className="text-xs text-muted-foreground">Dans les 30 jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total baux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leases?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom de locataire..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="ended">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les propriétés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tous les baux</CardTitle>
          <CardDescription>
            Cliquez sur un bail pour voir les détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leases && leases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Chambre / Lit</TableHead>
                  <TableHead>Loyer hebdo</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const primaryParticipant = (lease as any).participants?.find((p: any) => p.is_primary) || (lease as any).participants?.[0];
                  const tenantName = primaryParticipant?.tenant 
                    ? `${primaryParticipant.tenant.first_name} ${primaryParticipant.tenant.last_name}`
                    : 'N/A';
                  return (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Link 
                          href={`/leases/${lease.id}`}
                          className="font-medium hover:underline"
                        >
                          {tenantName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {(lease as any).house?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {(lease as any).room?.name || '-'} / Bed {(lease as any).bed?.bed_number || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${lease.weekly_rent}
                      </TableCell>
                      <TableCell>
                        {format(new Date(lease.start_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {lease.end_date 
                          ? format(new Date(lease.end_date), 'dd MMM yyyy')
                          : 'En cours'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={leaseStatusColors[lease.status] as any || 'outline'}>
                          {lease.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun bail</h3>
              <p className="text-muted-foreground">
                Créez un bail lorsqu&apos;un locataire emménage
              </p>
              <Button asChild className="mt-4">
                <Link href="/leases/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau bail
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Reservations */}
      {reservations && reservations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Réservations à venir</CardTitle>
                <CardDescription>
                  Réservations en attente et confirmées
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/leases/reservations">Voir tout</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Date d&apos;emménagement</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.slice(0, 5).map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {(reservation as any).tenant?.first_name} {(reservation as any).tenant?.last_name}
                    </TableCell>
                    <TableCell>
                      {(reservation as any).house?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(reservation.start_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}>
                        {reservation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
