import Link from 'next/link';
import { Plus, Users, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTenants } from '@/lib/services/tenant-service';

export default async function TenantsPage() {
  const tenants = await getTenants();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive">Liste noire</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locataires</h1>
          <p className="text-muted-foreground">
            Gérer vos locataires et leurs informations
          </p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un locataire
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des locataires..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {tenants && tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Visa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="font-medium hover:underline"
                        >
                          {tenant.first_name} {tenant.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{tenant.email}</p>
                          <p className="text-muted-foreground">{tenant.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tenant.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tenant.visa_type || '-'}
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun locataire</h3>
              <p className="text-muted-foreground text-center mb-4">
                Commencez par ajouter votre premier locataire
              </p>
              <Button asChild>
                <Link href="/tenants/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un locataire
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
