import Link from 'next/link';
import { Plus, KeyRound, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getKeys } from '@/lib/services/keys-service';

export default async function KeysPage() {
  let keys: any[] = [];
  try {
    keys = await getKeys() || [];
  } catch (error) {
    console.error('Error loading keys:', error);
  }

  // Calculate stats
  const totalKeys = keys?.length || 0;
  const availableKeys = keys?.filter((k: any) => k.status === 'available').length || 0;
  const issuedKeys = keys?.filter((k: any) => k.status === 'issued').length || 0;
  const lostKeys = keys?.filter((k: any) => k.status === 'lost').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">Disponible</Badge>;
      case 'issued':
        return <Badge variant="default">Remise</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdue</Badge>;
      case 'replaced':
        return <Badge variant="secondary">Remplacée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clés</h1>
          <p className="text-muted-foreground text-sm">
            Suivre et gérer l&apos;inventaire des clés
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/keys/new">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une clé
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total clés</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuedKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perdues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lostKeys}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher des clés..." className="pl-10" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          {keys && keys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de clé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Maison</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Remise à</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Coût de remplacement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">
                      {key.key_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{key.key_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {(key as any).house?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(key as any).room?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {(key as any).tenant
                        ? `${(key as any).tenant.first_name} ${(key as any).tenant.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(key.status)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${key.replacement_cost}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune clé</h3>
              <p className="text-muted-foreground text-center mb-4">
                Ajoutez des clés pour suivre votre inventaire
              </p>
              <Button asChild>
                <Link href="/keys/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une clé
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
