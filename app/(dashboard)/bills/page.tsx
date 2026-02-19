import Link from 'next/link';
import { Plus, Receipt, Calendar, Search, Filter, Download } from 'lucide-react';
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
import { getBills } from '@/lib/services/billing-service';
import type { Bill } from '@/types/database';

const billCategoryLabels: Record<string, string> = {
  electricity: 'Électricité',
  gas: 'Gaz',
  water: 'Eau',
  internet: 'Internet',
  council_rates: 'Taxes foncières',
  insurance: 'Assurance',
  other: 'Autre',
};

const splitModeLabels: Record<string, string> = {
  equal: 'Partage égal',
  by_bed: 'Par nombre de lits',
  by_rent: 'Au prorata du loyer',
  custom: 'Partage personnalisé',
  usage: 'Par consommation',
};

export default async function BillsPage() {
  const bills = await getBills();

  // Calculate stats
  const totalBills = bills?.length || 0;
  const pendingBills = bills?.filter((b: any) => b.status === 'pending').length || 0;
  const totalAmount = bills?.reduce((sum: number, b: any) => sum + b.total_amount, 0) || 0;
  const unpaidAmount = bills?.filter((b: any) => b.status === 'pending').reduce((sum: number, b: any) => sum + b.total_amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Factures</h1>
          <p className="text-muted-foreground text-sm">
            Gérer les charges et dépenses partagées
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/bills/new">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Ajouter une facture</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total factures</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impayé</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${unpaidAmount.toFixed(2)}</div>
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
                  placeholder="Rechercher des factures..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="electricity">Électricité</SelectItem>
                <SelectItem value="gas">Gaz</SelectItem>
                <SelectItem value="water">Eau</SelectItem>
                <SelectItem value="internet">Internet</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les factures</CardTitle>
          <CardDescription>
            Cliquez sur une facture pour voir les répartitions et paiements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills && bills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode de partage</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Link 
                        href={`/bills/${bill.id}`}
                        className="font-medium hover:underline"
                      >
                        {billCategoryLabels[bill.bill_type] || bill.bill_type}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(bill as any).house?.suburb || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(bill.period_start), 'dd MMM')} - {format(new Date(bill.period_end), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${bill.total_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {splitModeLabels[bill.split_mode] || bill.split_mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(bill.due_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bill.status === 'paid'
                            ? 'default'
                            : bill.status === 'partial'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {bill.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune facture</h3>
              <p className="text-muted-foreground">
                Commencez par ajouter votre première facture
              </p>
              <Button asChild className="mt-4">
                <Link href="/bills/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une facture
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
