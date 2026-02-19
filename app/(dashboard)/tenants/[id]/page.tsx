import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, FileText, Home, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTenantById, getTenantDocuments } from '@/lib/services/tenant-service';
import { getLeasesByTenantId } from '@/lib/services/lease-service';
import { getPaymentsByTenantId } from '@/lib/services/payment-service';

interface PageProps {
  params: { id: string };
}

export default async function TenantDetailPage({ params }: PageProps) {
  const tenant = await getTenantById(params.id);

  if (!tenant) {
    notFound();
  }

  const [leases, payments, documents] = await Promise.all([
    getLeasesByTenantId(params.id),
    getPaymentsByTenantId(params.id),
    getTenantDocuments(params.id),
  ]);

  const activeLease = leases?.find(l => l.status === 'active');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" asChild className="self-start">
          <Link href="/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {tenant.first_name} {tenant.last_name}
            </h1>
            <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
              {tenant.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Profil et historique du locataire
          </p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-center">
          <Link href={`/tenants/${params.id}/edit`}>
            Modifier le locataire
          </Link>
        </Button>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{tenant.status}</div>
            {activeLease && (
              <p className="text-xs text-muted-foreground">
                Depuis {format(new Date(activeLease.start_date), 'dd MMM yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total payé</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payments?.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baux</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leases?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$0.00</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${tenant.email}`} className="text-primary hover:underline">
                {tenant.email}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${tenant.phone}`} className="text-primary hover:underline">
                {tenant.phone}
              </a>
            </div>
            {tenant.date_of_birth && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(tenant.date_of_birth), 'dd MMM yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Détails personnels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nationalité</p>
              <p className="font-medium">{tenant.nationality || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type de visa</p>
              <p className="font-medium capitalize">{tenant.visa_type || 'Non spécifié'}</p>
            </div>
            {tenant.visa_expiry && (
              <div>
                <p className="text-sm text-muted-foreground">Expiration du visa</p>
                <p className="font-medium">{format(new Date(tenant.visa_expiry), 'dd MMM yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact d&apos;urgence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenant.emergency_contact_name ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{tenant.emergency_contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Relation</p>
                  <p className="font-medium">{tenant.emergency_contact_relation || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{tenant.emergency_contact_phone || 'N/A'}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Aucun contact d&apos;urgence fourni</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Lease */}
      {activeLease && (
        <Card>
          <CardHeader>
            <CardTitle>Bail actuel</CardTitle>
            <CardDescription>
              Contrat de location actif
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Propriété</p>
                <p className="font-medium">
                  {(activeLease.bed as any)?.room?.house?.address || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyer hebdomadaire</p>
                <p className="font-medium">${activeLease.weekly_rent}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de début</p>
                <p className="font-medium">
                  {format(new Date(activeLease.start_date), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de fin</p>
                <p className="font-medium">
                  {activeLease.end_date 
                    ? format(new Date(activeLease.end_date), 'dd MMM yyyy')
                    : 'En cours'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historique des paiements</CardTitle>
              <CardDescription>
                Paiements récents de ce locataire
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/payments?tenant=${params.id}`}>
                Voir tout
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 5).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_method}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun paiement enregistré
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Pièces d&apos;identité, contrats et autres documents
              </CardDescription>
            </div>
            <Button variant="outline">
              Télécharger un document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {doc.document_type}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun document téléchargé
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
