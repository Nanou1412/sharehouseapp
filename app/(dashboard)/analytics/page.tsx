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

  const houseIds = (houses as { id: string }[] | null)?.map(h => h.id) || [];
  
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
        <h1 className="text-3xl font-bold">Statistiques</h1>
        <p className="text-muted-foreground">
          Indicateurs financiers et performances
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyer attendu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioKPIs?.totalExpectedRent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Hebdomadaire sur toutes les propriétés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collecté</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(portfolioKPIs?.totalCollectedRent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioKPIs?.collectionRate.toFixed(1)}% taux de collecte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perte vacance</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(portfolioKPIs?.totalVacancyLoss || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lits inoccupés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice net</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (portfolioKPIs?.totalNetProfit || 0) >= 0 ? 'text-green-600' : 'text-destructive'
            }`}>
              {formatCurrency(portfolioKPIs?.totalNetProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Après tous les coûts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Arrears Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ancienneté des arriérés</CardTitle>
            <CardDescription>Répartition par tranches d&apos;âge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">0-7 jours</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['0-7'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">8-14 jours</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['8-14'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">15-30 jours</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['15-30'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-800" />
                  <span className="text-sm">30+ jours</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(arrearsAnalysis?.agingBuckets['30+'] || 0)}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total arriérés</span>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(arrearsAnalysis?.totalArrears || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locataires à risque</CardTitle>
            <CardDescription>Locataires avec des arriérés significatifs</CardDescription>
          </CardHeader>
          <CardContent>
            {arrearsAnalysis?.highRiskTenants && arrearsAnalysis.highRiskTenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead className="text-right">Arriérés</TableHead>
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
                  Aucun locataire à risque
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé du portefeuille</CardTitle>
          <CardDescription>Vue d&apos;ensemble de toutes les propriétés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{houseIds.length}</p>
              <p className="text-sm text-muted-foreground">Propriétés actives</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioKPIs?.totalFixedCosts || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Coûts fixes hebdomadaires</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(portfolioKPIs?.totalMaintenanceCosts || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Coûts de maintenance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
