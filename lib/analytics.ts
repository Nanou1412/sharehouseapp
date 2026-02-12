import { createClient } from '@/lib/supabase/server';

// =====================================================
// PORTFOLIO KPIs
// =====================================================

export interface PortfolioKPIs {
  totalExpectedRent: number;
  totalCollectedRent: number;
  collectionRate: number;
  totalVacancyLoss: number;
  totalNetProfit: number;
  totalFixedCosts: number;
  totalMaintenanceCosts: number;
}

export async function calculatePortfolioKPIs(houseIds: string[]): Promise<PortfolioKPIs> {
  const supabase = await createClient();

  // Get all beds with their rent to calculate expected rent
  const { data: beds } = await supabase
    .from('beds')
    .select(`
      id,
      weekly_rent,
      status,
      room:rooms!inner(house_id)
    `)
    .eq('is_active', true)
    .in('room.house_id', houseIds);

  const totalExpectedRent = beds?.reduce((sum, b) => sum + (b.weekly_rent || 0), 0) || 0;
  const occupiedBeds = beds?.filter((b: any) => b.status === 'occupied') || [];
  const vacantBeds = beds?.filter((b: any) => b.status === 'available') || [];
  const totalVacancyLoss = vacantBeds.reduce((sum, b) => sum + (b.weekly_rent || 0), 0);

  // Get payments for the last 4 weeks
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const startDate = fourWeeksAgo.toISOString().split('T')[0];

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .in('house_id', houseIds)
    .gte('payment_date', startDate);

  const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  // Normalize to weekly
  const totalCollectedRent = totalCollected / 4;

  const collectionRate = totalExpectedRent > 0
    ? (totalCollectedRent / totalExpectedRent) * 100
    : 0;

  // Get expenses for the last 4 weeks
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category')
    .in('house_id', houseIds)
    .gte('expense_date', startDate);

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const maintenanceExpenses = expenses
    ?.filter((e: any) => e.category === 'maintenance')
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalFixedCosts = (totalExpenses - maintenanceExpenses) / 4;
  const totalMaintenanceCosts = maintenanceExpenses / 4;

  const totalNetProfit = totalCollectedRent - totalFixedCosts - totalMaintenanceCosts;

  return {
    totalExpectedRent,
    totalCollectedRent,
    collectionRate,
    totalVacancyLoss,
    totalNetProfit,
    totalFixedCosts,
    totalMaintenanceCosts,
  };
}

// =====================================================
// BREAK-EVEN ANALYSIS
// =====================================================

export interface BreakEvenAnalysis {
  totalFixedCosts: number;
  occupancyBreakEven: number;
  currentOccupancy: number;
}

export async function calculateBreakEven(houseId: string): Promise<BreakEvenAnalysis> {
  const supabase = await createClient();

  const { data: beds } = await supabase
    .from('beds')
    .select('weekly_rent, status, room:rooms!inner(house_id)')
    .eq('is_active', true)
    .eq('room.house_id', houseId);

  const totalBeds = beds?.length || 0;
  const occupiedBeds = beds?.filter((b: any) => b.status === 'occupied').length || 0;
  const avgRent = totalBeds > 0
    ? (beds?.reduce((sum, b) => sum + (b.weekly_rent || 0), 0) || 0) / totalBeds
    : 0;

  // Get weekly expenses
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('house_id', houseId)
    .gte('expense_date', fourWeeksAgo.toISOString().split('T')[0]);

  const totalExpenses = (expenses?.reduce((sum, e) => sum + e.amount, 0) || 0) / 4;

  const occupancyBreakEven = avgRent > 0
    ? Math.ceil(totalExpenses / avgRent)
    : 0;

  return {
    totalFixedCosts: totalExpenses,
    occupancyBreakEven,
    currentOccupancy: occupiedBeds,
  };
}

// =====================================================
// ARREARS ANALYSIS
// =====================================================

export interface ArrearsAnalysis {
  totalArrears: number;
  agingBuckets: {
    '0-7': number;
    '8-14': number;
    '15-30': number;
    '30+': number;
  };
  highRiskTenants: Array<{
    id: string;
    first_name: string;
    last_name: string;
    arrearsAmount: number;
  }>;
  tenantsInArrears: number;
}

export async function getArrearsAnalysis(): Promise<ArrearsAnalysis> {
  const supabase = await createClient();

  // Use the arrears_summary view
  const { data: arrears } = await supabase
    .from('arrears_summary')
    .select('*');

  const now = new Date();
  let totalArrears = 0;
  const buckets = { '0-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
  const highRiskTenants: ArrearsAnalysis['highRiskTenants'] = [];

  for (const a of arrears || []) {
    const amount = Math.abs(a.total_arrears || 0);
    if (amount <= 0) continue;

    totalArrears += amount;

    // Determine bucket based on oldest unpaid week
    if (a.oldest_unpaid_week) {
      const oldestDate = new Date(a.oldest_unpaid_week);
      const daysDiff = Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 7) buckets['0-7'] += amount;
      else if (daysDiff <= 14) buckets['8-14'] += amount;
      else if (daysDiff <= 30) buckets['15-30'] += amount;
      else buckets['30+'] += amount;
    } else {
      buckets['0-7'] += amount;
    }

    if (amount > 200) {
      highRiskTenants.push({
        id: a.tenant_id || '',
        first_name: a.tenant_name?.split(' ')[0] || '',
        last_name: a.tenant_name?.split(' ').slice(1).join(' ') || '',
        arrearsAmount: amount,
      });
    }
  }

  // Sort high risk by amount descending
  highRiskTenants.sort((a, b) => b.arrearsAmount - a.arrearsAmount);

  return {
    totalArrears,
    agingBuckets: buckets,
    highRiskTenants,
    tenantsInArrears: arrears?.filter((a: any) => (a.total_arrears || 0) > 0).length || 0,
  };
}
