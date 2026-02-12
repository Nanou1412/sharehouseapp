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
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  Percent,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { calculatePortfolioKPIs, calculateBreakEven, getArrearsAnalysis } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  
  // Get all houses for analytics
  const { data: houses } = await supabase
    .from('houses')
    .select('id')
    .eq('is_active', true);

  const houseIds = houses?.map(h => h.id) || [];
  
  // Get portfolio KPIs
  const portfolioKPIs = houseIds.length > 0 
    ? await calculatePortfolioKPIs(houseIds)
    : null;

  // Get arrears analysis
  const arrearsAnalysis = await getArrearsAnalysis();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Financial insights and performance metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioKPIs?.totalExpectedRent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Weekly across all properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(portfolioKPIs?.totalCollectedRent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioKPIs?.collectionRate.toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacancy Loss</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(portfolioKPIs?.totalVacancyLoss || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From unoccupied beds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (portfolioKPIs?.totalNetProfit || 0) >= 0 ? 'text-green-600' : 'text-destructive'
            }`}>
              {formatCurrency(portfolioKPIs?.totalNetProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              After all costs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Arrears Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Arrears Aging</CardTitle>
            <CardDescription>Breakdown by age bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">0-7 days</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['0-7'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">8-14 days</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['8-14'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">15-30 days</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['15-30'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-800" />
                  <span className="text-sm">30+ days</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['30+'] || 0)}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Arrears</span>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(arrearsAnalysis?.totalArrears || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Risk Tenants</CardTitle>
            <CardDescription>Tenants with significant arrears</CardDescription>
          </CardHeader>
          <CardContent>
            {arrearsAnalysis?.highRiskTenants && arrearsAnalysis.highRiskTenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Arrears</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrearsAnalysis.highRiskTenants.slice(0, 5).map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        {tenant.first_name} {tenant.last_name}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(tenant.arrearsAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No high risk tenants
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Overview of all properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{houseIds.length}</p>
              <p className="text-sm text-muted-foreground">Active Properties</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioKPIs?.totalFixedCosts || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Weekly Fixed Costs</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioKPIs?.totalMaintenanceCosts || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Maintenance Costs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
