import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wrench,
  Calendar,
  Bell,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Helper to get severity from priority
const getSeverity = (priority: string): 'high' | 'medium' | 'low' => {
  if (priority === 'critical') return 'high';
  if (priority === 'warning') return 'medium';
  return 'low';
};

async function getDashboardStats() {
  const supabase = await createClient();

  // Get house count
  const { count: houseCount } = await supabase
    .from('houses')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get tenant stats
  const { count: activeTenants } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // Get total beds
  const { count: totalBeds } = await supabase
    .from('beds')
    .select('id', { count: 'exact', head: true });

  const { count: occupiedBeds } = await supabase
    .from('beds')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'occupied');

  // Get arrears from the arrears_summary view
  const { data: arrearsSummary } = await supabase
    .from('arrears_summary')
    .select('total_arrears');

  const totalArrears = arrearsSummary?.reduce(
    (sum: number, a: { total_arrears: number | null }) => sum + Math.abs(a.total_arrears || 0), 
    0
  ) || 0;
  const tenantsInArrearsCount = arrearsSummary?.filter((a: { total_arrears: number | null }) => (a.total_arrears || 0) > 0).length || 0;

  // Get open maintenance tickets
  const { count: openTickets } = await supabase
    .from('maintenance_tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress']);

  // Get unread alerts
  const { count: unreadAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  return {
    houseCount: houseCount || 0,
    activeTenants: activeTenants || 0,
    totalBeds: totalBeds || 0,
    occupiedBeds: occupiedBeds || 0,
    occupancyRate: totalBeds ? ((occupiedBeds || 0) / totalBeds * 100).toFixed(1) : 0,
    totalArrears,
    tenantsInArrears: tenantsInArrearsCount,
    openTickets: openTickets || 0,
    unreadAlerts: unreadAlerts || 0,
  };
}

async function getRecentActivity() {
  const supabase = await createClient();

  type RecentPayment = {
    id: string;
    amount: number;
    payment_date: string;
    tenant?: { first_name: string; last_name: string } | null;
  };

  type RecentAlert = {
    id: string;
    title: string;
    message: string;
    alert_type: string;
    priority: string;
    is_read: boolean;
  };

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_date,
      tenant:tenants(first_name, last_name)
    `)
    .order('payment_date', { ascending: false })
    .limit(5);

  // Get recent alerts
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    recentPayments: recentPayments as RecentPayment[] | null,
    recentAlerts: recentAlerts as RecentAlert[] | null,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const { recentPayments, recentAlerts } = await getRecentActivity();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your sharehouse portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/houses/new">
              <Building2 className="mr-2 h-4 w-4" />
              Add House
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/tenants/new">
              <Users className="mr-2 h-4 w-4" />
              Add Tenant
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.houseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active houses
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {stats.occupiedBeds}/{stats.totalBeds}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrears</CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              stats.totalArrears > 0 ? 'bg-destructive/10' : 'bg-green-500/10'
            }`}>
              <DollarSign className={`h-4 w-4 ${
                stats.totalArrears > 0 ? 'text-destructive' : 'text-green-500'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.totalArrears > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(stats.totalArrears)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.tenantsInArrears} tenant{stats.tenantsInArrears !== 1 ? 's' : ''} in arrears
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              stats.openTickets > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'
            }`}>
              <Wrench className={`h-4 w-4 ${
                stats.openTickets > 0 ? 'text-amber-500' : 'text-green-500'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Open ticket{stats.openTickets !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks at a glance</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200">
              <Link href="/tenants/new">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">New Tenant</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 justify-center hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200">
              <Link href="/payments/new">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium">Record Payment</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 justify-center hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200">
              <Link href="/maintenance/new">
                <Wrench className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium">Maintenance</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 justify-center hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200">
              <Link href="/bills/new">
                <Calendar className="h-5 w-5 text-violet-500" />
                <span className="text-xs font-medium">Add Bill</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Alerts</CardTitle>
              <CardDescription>Latest notifications</CardDescription>
            </div>
            {stats.unreadAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">{stats.unreadAlerts} unread</Badge>
            )}
          </CardHeader>
          <CardContent>
            {recentAlerts && recentAlerts.length > 0 ? (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors duration-200 hover:bg-muted/50 ${
                      !alert.is_read ? 'bg-primary/[0.02] border-primary/20' : ''
                    }`}
                  >
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      getSeverity(alert.priority) === 'high' ? 'bg-destructive/10' :
                      getSeverity(alert.priority) === 'medium' ? 'bg-amber-500/10' :
                      'bg-muted'
                    }`}>
                      <AlertTriangle className={`h-3.5 w-3.5 ${
                        getSeverity(alert.priority) === 'high' ? 'text-destructive' :
                        getSeverity(alert.priority) === 'medium' ? 'text-amber-500' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">{alert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {alert.message}
                      </p>
                    </div>
                    <Badge variant={alert.is_read ? 'secondary' : 'default'} className="text-[10px] shrink-0">
                      {alert.alert_type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent alerts</p>
              </div>
            )}
            <Button asChild variant="ghost" size="sm" className="w-full mt-3">
              <Link href="/alerts">View all alerts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <CardDescription>Latest rent payments received</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/payments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentPayments && recentPayments.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map((payment, i) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors duration-200 hover:bg-muted/50"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {payment.tenant?.first_name} {payment.tenant?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent payments</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
