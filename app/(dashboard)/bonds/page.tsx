import Link from 'next/link';
import { format } from 'date-fns';
import { ShieldCheck, Search, Filter, DollarSign } from 'lucide-react';
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
import { getBonds } from '@/lib/services/bond-service';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
}

export default async function BondsPage() {
  const bonds = await getBonds();

  // Calculate stats
  const totalBonds = bonds?.length || 0;
  const receivedBonds = bonds?.filter((b: any) => b.status === 'received').length || 0;
  const pendingBonds = bonds?.filter((b: any) => b.status === 'pending').length || 0;
  const totalExpected = bonds?.reduce((sum: number, b: any) => sum + (b.expected_amount || 0), 0) || 0;
  const totalReceived = bonds?.reduce((sum: number, b: any) => sum + (b.received_amount || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'received':
        return <Badge variant="success">Received</Badge>;
      case 'partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'refunded':
        return <Badge variant="default">Refunded</Badge>;
      case 'forfeited':
        return <Badge variant="destructive">Forfeited</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bonds</h1>
          <p className="text-muted-foreground">
            Manage tenant bond deposits
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonds</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBonds}</div>
            <p className="text-xs text-muted-foreground">
              {receivedBonds} received · {pendingBonds} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(totalExpected - totalReceived)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search bonds..." className="pl-10" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bonds Table */}
      <Card>
        <CardContent className="p-0">
          {bonds && bonds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lodgement Ref</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Refund Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((bond) => (
                  <TableRow key={bond.id}>
                    <TableCell className="font-medium">
                      {(bond as any).tenant
                        ? `${(bond as any).tenant.first_name} ${(bond as any).tenant.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bond.lodgement_reference || '-'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(bond.expected_amount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(bond.received_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(bond.status)}
                    </TableCell>
                    <TableCell>
                      {bond.received_date
                        ? format(new Date(bond.received_date), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {bond.refund_date
                        ? format(new Date(bond.refund_date), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {bond.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bonds yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Bond records will appear here once tenants are added
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
