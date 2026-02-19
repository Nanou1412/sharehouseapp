import Link from 'next/link';
import { Plus, DollarSign, Search, Filter } from 'lucide-react';
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
import { getPayments } from '@/lib/services/payment-service';
import { formatCurrency } from '@/lib/utils';

export default async function PaymentsPage() {
  const payments = await getPayments();

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      bank_transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      cash: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      card: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      direct_debit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return (
      <Badge className={colors[method] || ''} variant="outline">
        {method.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground text-sm">
            Suivre et gérer tous les paiements de loyer
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/payments/new">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Enregistrer un paiement</span>
            <span className="sm:hidden">Nouveau</span>
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
                placeholder="Rechercher des paiements..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.payment_date}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tenants/${payment.tenant_id}`}
                        className="hover:underline"
                      >
                        {(payment as any).tenant?.first_name} {(payment as any).tenant?.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getMethodBadge(payment.payment_method)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun paiement</h3>
              <p className="text-muted-foreground text-center mb-4">
                Enregistrez votre premier paiement pour commencer
              </p>
              <Button asChild>
                <Link href="/payments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Enregistrer un paiement
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
