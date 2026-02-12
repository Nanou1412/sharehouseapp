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
  electricity: 'Electricity',
  gas: 'Gas',
  water: 'Water',
  internet: 'Internet',
  council_rates: 'Council Rates',
  insurance: 'Insurance',
  other: 'Other',
};

const splitModeLabels: Record<string, string> = {
  equal: 'Equal Split',
  by_bed: 'By Bed Count',
  by_rent: 'By Rent Proportion',
  custom: 'Custom Split',
  usage: 'By Usage',
};

export default async function BillsPage() {
  const bills = await getBills();

  // Calculate stats
  const totalBills = bills?.length || 0;
  const pendingBills = bills?.filter(b => b.status === 'pending').length || 0;
  const totalAmount = bills?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
  const unpaidAmount = bills?.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.total_amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground">
            Manage utilities and shared expenses
          </p>
        </div>
        <Button asChild>
          <Link href="/bills/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
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
                  placeholder="Search bills..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="gas">Gas</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="internet">Internet</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>
            Click on a bill to view allocations and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills && bills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Split Mode</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
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
              <h3 className="mt-4 text-lg font-semibold">No bills yet</h3>
              <p className="text-muted-foreground">
                Start by adding your first utility bill
              </p>
              <Button asChild className="mt-4">
                <Link href="/bills/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bill
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
