import { createClient } from '@/lib/supabase/server';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, differenceInDays, differenceInWeeks } from 'date-fns';
import { formatCurrency, nowInPerth } from '@/lib/utils';

// =====================================================
// ANALYTICS ENGINE
// KPIs, financial reports, break-even analysis
// =====================================================

export interface HouseKPIs {
  houseId: string;
  houseName: string;
  period: {
    start: string;
    end: string;
  };
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    rate: number;
    vacantDays: number;
  };
  revenue: {
    expected: number;
    collected: number;
    collectionRate: number;
    arrears: number;
  };
  expenses: {
    total: number;
    maintenance: number;
    utilities: number;
    other: number;
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
    perBedPerWeek: number;
  };
  turnover: {
    moveIns: number;
    moveOuts: number;
    rate: number;
  };
}

export interface GlobalKPIs {
  totalHouses: number;
  totalBeds: number;
  occupancyRate: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  totalArrears: number;
  averageRent: number;
}

// =====================================================
// HOUSE-LEVEL KPIs
// =====================================================

export async function getHouseKPIs(
  houseId: string,
  startDate: string,
  endDate: string
): Promise<HouseKPIs> {
  const supabase = await createClient();

  // Get house info
  const { data: house } = await supabase
    .from('houses')
    .select('id, name, total_beds')
    .eq('id', houseId)
    .single();

  if (!house) throw new Error('House not found');

  // Get rent charges for period
  const { data: charges } = await supabase
    .from('rent_charges')
    .select('*')
    .eq('house_id', houseId)
    .gte('week_start', startDate)
    .lte('week_start', endDate);

  const expectedRevenue = charges?.reduce((sum: number, c: { amount_due: number }) => sum + c.amount_due, 0) || 0;
  const collectedRevenue = charges?.reduce((sum: number, c: { amount_paid: number }) => sum + c.amount_paid, 0) || 0;
  const arrears = expectedRevenue - collectedRevenue;

  // Get expenses for period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('house_id', houseId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  const maintenanceExpenses = expenses
    ?.filter((e: { category: string }) => e.category === 'maintenance')
    .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;
  const utilityExpenses = expenses
    ?.filter((e: { category: string }) => e.category === 'utilities')
    .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;
  const otherExpenses = expenses
    ?.filter((e: { category: string }) => !['maintenance', 'utilities'].includes(e.category))
    .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;
  const totalExpenses = maintenanceExpenses + utilityExpenses + otherExpenses;

  // Get occupancy data
  const { data: leases } = await supabase
    .from('leases')
    .select('id, start_date, end_date, status')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending', 'ended'])
    .lte('start_date', endDate)
    .or(`end_date.is.null,end_date.gte.${startDate}`);

  // Calculate occupancy
  const periodDays = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  const totalBedDays = house.total_beds * periodDays;
  let occupiedBedDays = 0;

  for (const lease of leases || []) {
    const leaseStart = parseISO(lease.start_date);
    const leaseEnd = lease.end_date ? parseISO(lease.end_date) : parseISO(endDate);
    const effectiveStart = leaseStart > parseISO(startDate) ? leaseStart : parseISO(startDate);
    const effectiveEnd = leaseEnd < parseISO(endDate) ? leaseEnd : parseISO(endDate);
    occupiedBedDays += Math.max(0, differenceInDays(effectiveEnd, effectiveStart) + 1);
  }

  const occupancyRate = totalBedDays > 0 ? (occupiedBedDays / totalBedDays) * 100 : 0;
  const vacantDays = totalBedDays - occupiedBedDays;

  // Get current occupied beds
  const { data: activeLeases } = await supabase
    .from('leases')
    .select('id')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending']);

  const occupiedBeds = activeLeases?.length || 0;

  // Calculate turnover
  const moveIns = leases?.filter((l: { start_date: string }) => 
    parseISO(l.start_date) >= parseISO(startDate) && 
    parseISO(l.start_date) <= parseISO(endDate)
  ).length || 0;

  const moveOuts = leases?.filter((l: { end_date: string | null }) => 
    l.end_date &&
    parseISO(l.end_date) >= parseISO(startDate) && 
    parseISO(l.end_date) <= parseISO(endDate)
  ).length || 0;

  const turnoverRate = house.total_beds > 0 
    ? ((moveIns + moveOuts) / 2 / house.total_beds) * 100 
    : 0;

  // Calculate profit
  const grossProfit = collectedRevenue;
  const netProfit = collectedRevenue - totalExpenses;
  const margin = collectedRevenue > 0 ? (netProfit / collectedRevenue) * 100 : 0;
  const weeks = differenceInWeeks(parseISO(endDate), parseISO(startDate)) || 1;
  const perBedPerWeek = house.total_beds > 0 ? netProfit / house.total_beds / weeks : 0;

  return {
    houseId: house.id,
    houseName: house.name,
    period: { start: startDate, end: endDate },
    occupancy: {
      totalBeds: house.total_beds,
      occupiedBeds,
      rate: occupancyRate,
      vacantDays,
    },
    revenue: {
      expected: expectedRevenue,
      collected: collectedRevenue,
      collectionRate: expectedRevenue > 0 ? (collectedRevenue / expectedRevenue) * 100 : 100,
      arrears,
    },
    expenses: {
      total: totalExpenses,
      maintenance: maintenanceExpenses,
      utilities: utilityExpenses,
      other: otherExpenses,
    },
    profit: {
      gross: grossProfit,
      net: netProfit,
      margin,
      perBedPerWeek,
    },
    turnover: {
      moveIns,
      moveOuts,
      rate: turnoverRate,
    },
  };
}

// =====================================================
// GLOBAL KPIs
// =====================================================

export async function getGlobalKPIs(): Promise<GlobalKPIs> {
  const supabase = await createClient();
  
  const now = nowInPerth();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  // Get all houses
  const { data: houses } = await supabase
    .from('houses')
    .select('id, total_beds')
    .eq('is_active', true);

  const totalHouses = houses?.length || 0;
  const totalBeds = houses?.reduce((sum: number, h: { total_beds: number }) => sum + h.total_beds, 0) || 0;

  // Get current active leases
  const { data: activeLeases } = await supabase
    .from('leases')
    .select('id, weekly_rent')
    .in('status', ['active', 'ending']);

  const occupiedBeds = activeLeases?.length || 0;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
  const averageRent = activeLeases && activeLeases.length > 0
    ? activeLeases.reduce((sum: number, l: { weekly_rent: number }) => sum + l.weekly_rent, 0) / activeLeases.length
    : 0;

  // Get monthly revenue
  const { data: charges } = await supabase
    .from('rent_charges')
    .select('amount_due, amount_paid')
    .gte('week_start', monthStart)
    .lte('week_start', monthEnd);

  const monthlyRevenue = charges?.reduce((sum: number, c: { amount_paid: number }) => sum + c.amount_paid, 0) || 0;

  // Get monthly expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd);

  const monthlyExpenses = expenses?.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;

  // Get total arrears
  const { data: arrears } = await supabase
    .from('tenant_arrears')
    .select('total_arrears');

  const totalArrears = arrears?.reduce((sum: number, a: { total_arrears: number }) => sum + a.total_arrears, 0) || 0;

  return {
    totalHouses,
    totalBeds,
    occupancyRate,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit: monthlyRevenue - monthlyExpenses,
    totalArrears,
    averageRent,
  };
}

// =====================================================
// BREAK-EVEN ANALYSIS
// =====================================================

export interface BreakEvenAnalysis {
  houseId: string;
  houseName: string;
  fixedCostsMonthly: number;
  variableCostsPerBed: number;
  averageRentPerBed: number;
  breakEvenBeds: number;
  currentBeds: number;
  occupiedBeds: number;
  isAboveBreakEven: boolean;
  safetyMargin: number;
  projectedMonthlyProfit: number;
}

export async function getBreakEvenAnalysis(houseId: string): Promise<BreakEvenAnalysis> {
  const supabase = await createClient();

  // Get house info
  const { data: house } = await supabase
    .from('houses')
    .select('id, name, total_beds')
    .eq('id', houseId)
    .single();

  if (!house) throw new Error('House not found');

  // Get last 3 months of expenses
  const threeMonthsAgo = format(subMonths(nowInPerth(), 3), 'yyyy-MM-dd');
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('house_id', houseId)
    .gte('expense_date', threeMonthsAgo);

  // Categorize expenses
  type ExpenseItem = { category: string; amount: number };
  const fixedExpenses = expenses
    ?.filter((e: ExpenseItem) => ['mortgage', 'insurance', 'council', 'management'].includes(e.category))
    .reduce((sum: number, e: ExpenseItem) => sum + e.amount, 0) || 0;

  const variableExpenses = expenses
    ?.filter((e: ExpenseItem) => ['maintenance', 'utilities', 'supplies'].includes(e.category))
    .reduce((sum: number, e: ExpenseItem) => sum + e.amount, 0) || 0;

  // Monthly averages
  const fixedCostsMonthly = fixedExpenses / 3;
  const variableCostsTotal = variableExpenses / 3;

  // Get average rent
  const { data: leases } = await supabase
    .from('leases')
    .select('weekly_rent')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending']);

  const averageRent = leases && leases.length > 0
    ? leases.reduce((sum: number, l: { weekly_rent: number }) => sum + l.weekly_rent, 0) / leases.length
    : 0;

  const averageRentMonthly = averageRent * 4.33; // weeks per month

  // Calculate variable cost per bed
  const occupiedBeds = leases?.length || 0;
  const variableCostsPerBed = occupiedBeds > 0 ? variableCostsTotal / occupiedBeds : 0;

  // Break-even calculation
  // Revenue per bed = averageRentMonthly
  // Cost per bed = variableCostsPerBed
  // Contribution margin = Revenue - Variable cost per bed
  const contributionMargin = averageRentMonthly - variableCostsPerBed;
  const breakEvenBeds = contributionMargin > 0 
    ? Math.ceil(fixedCostsMonthly / contributionMargin)
    : Infinity;

  const isAboveBreakEven = occupiedBeds > breakEvenBeds;
  const safetyMargin = breakEvenBeds > 0 
    ? ((occupiedBeds - breakEvenBeds) / breakEvenBeds) * 100
    : 0;

  const projectedRevenue = occupiedBeds * averageRentMonthly;
  const projectedCosts = fixedCostsMonthly + (occupiedBeds * variableCostsPerBed);
  const projectedMonthlyProfit = projectedRevenue - projectedCosts;

  return {
    houseId: house.id,
    houseName: house.name,
    fixedCostsMonthly,
    variableCostsPerBed,
    averageRentPerBed: averageRentMonthly,
    breakEvenBeds: isFinite(breakEvenBeds) ? breakEvenBeds : house.total_beds,
    currentBeds: house.total_beds,
    occupiedBeds,
    isAboveBreakEven,
    safetyMargin,
    projectedMonthlyProfit,
  };
}

// =====================================================
// PRICE SIMULATION
// =====================================================

export interface PriceSimulation {
  currentRent: number;
  proposedRent: number;
  rentChange: number;
  rentChangePercent: number;
  currentOccupancy: number;
  estimatedOccupancy: number;
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  revenueChange: number;
  recommendation: string;
}

export async function simulatePriceChange(
  houseId: string,
  proposedRentChange: number // e.g., +10 or -20
): Promise<PriceSimulation> {
  const supabase = await createClient();

  // Get current leases
  const { data: leases } = await supabase
    .from('leases')
    .select('weekly_rent')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending']);

  const { data: house } = await supabase
    .from('houses')
    .select('total_beds')
    .eq('id', houseId)
    .single();

  const occupiedBeds = leases?.length || 0;
  const totalBeds = house?.total_beds || 0;
  const currentOccupancy = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  const currentRent = leases && leases.length > 0
    ? leases.reduce((sum: number, l: { weekly_rent: number }) => sum + l.weekly_rent, 0) / leases.length
    : 0;

  const proposedRent = currentRent + proposedRentChange;
  const rentChangePercent = currentRent > 0 
    ? (proposedRentChange / currentRent) * 100 
    : 0;

  // Estimate occupancy change based on price elasticity
  // Simplified model: 10% price increase = 5% occupancy decrease
  const elasticity = -0.5;
  const occupancyChangePercent = rentChangePercent * elasticity;
  const estimatedOccupancy = Math.max(0, Math.min(100, currentOccupancy + occupancyChangePercent));

  // Calculate revenues
  const currentMonthlyRevenue = occupiedBeds * currentRent * 4.33;
  const estimatedOccupiedBeds = Math.round(totalBeds * (estimatedOccupancy / 100));
  const projectedMonthlyRevenue = estimatedOccupiedBeds * proposedRent * 4.33;
  const revenueChange = projectedMonthlyRevenue - currentMonthlyRevenue;

  // Generate recommendation
  let recommendation: string;
  if (revenueChange > 0 && estimatedOccupancy >= 70) {
    recommendation = 'Recommended: Price increase improves revenue while maintaining acceptable occupancy.';
  } else if (revenueChange > 0 && estimatedOccupancy < 70) {
    recommendation = 'Caution: Revenue increases but occupancy may drop below optimal levels.';
  } else if (revenueChange < 0 && estimatedOccupancy > currentOccupancy) {
    recommendation = 'Consider: Lower price may attract more tenants but reduces per-bed revenue.';
  } else {
    recommendation = 'Not recommended: This change is unlikely to improve overall performance.';
  }

  return {
    currentRent,
    proposedRent,
    rentChange: proposedRentChange,
    rentChangePercent,
    currentOccupancy,
    estimatedOccupancy,
    currentMonthlyRevenue,
    projectedMonthlyRevenue,
    revenueChange,
    recommendation,
  };
}

// =====================================================
// MONTHLY TRENDS
// =====================================================

export async function getMonthlyTrends(houseId: string, months: number = 12) {
  const supabase = await createClient();
  
  const trends: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    occupancy: number;
  }[] = [];

  const now = nowInPerth();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const monthLabel = format(monthDate, 'MMM yyyy');

    // Get revenue
    const { data: charges } = await supabase
      .from('rent_charges')
      .select('amount_paid')
      .eq('house_id', houseId)
      .gte('week_start', monthStart)
      .lte('week_start', monthEnd);

    const revenue = charges?.reduce((sum: number, c: { amount_paid: number }) => sum + c.amount_paid, 0) || 0;

    // Get expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('house_id', houseId)
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd);

    const expenseTotal = expenses?.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;

    // Get occupancy (simplified - count active leases mid-month)
    const midMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 15), 'yyyy-MM-dd');
    const { data: leases } = await supabase
      .from('leases')
      .select('id')
      .eq('house_id', houseId)
      .in('status', ['active', 'ending', 'ended'])
      .lte('start_date', midMonth)
      .or(`end_date.is.null,end_date.gte.${midMonth}`);

    const { data: house } = await supabase
      .from('houses')
      .select('total_beds')
      .eq('id', houseId)
      .single();

    const occupancy = house && house.total_beds > 0
      ? ((leases?.length || 0) / house.total_beds) * 100
      : 0;

    trends.push({
      month: monthLabel,
      revenue,
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
      occupancy,
    });
  }

  return trends;
}

// =====================================================
// VACANCY COST ANALYSIS
// =====================================================

export async function getVacancyCost(houseId: string, startDate: string, endDate: string) {
  const supabase = await createClient();

  const { data: house } = await supabase
    .from('houses')
    .select('total_beds')
    .eq('id', houseId)
    .single();

  if (!house) throw new Error('House not found');

  // Get average rent
  const { data: leases } = await supabase
    .from('leases')
    .select('weekly_rent')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending']);

  const averageRent = leases && leases.length > 0
    ? leases.reduce((sum: number, l: { weekly_rent: number }) => sum + l.weekly_rent, 0) / leases.length
    : 0;

  // Calculate total possible bed-days
  const periodDays = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  const totalBedDays = house.total_beds * periodDays;

  // Calculate occupied bed-days
  const { data: allLeases } = await supabase
    .from('leases')
    .select('start_date, end_date')
    .eq('house_id', houseId)
    .in('status', ['active', 'ending', 'ended'])
    .lte('start_date', endDate)
    .or(`end_date.is.null,end_date.gte.${startDate}`);

  let occupiedBedDays = 0;
  for (const lease of allLeases || []) {
    const leaseStart = parseISO(lease.start_date);
    const leaseEnd = lease.end_date ? parseISO(lease.end_date) : parseISO(endDate);
    const effectiveStart = leaseStart > parseISO(startDate) ? leaseStart : parseISO(startDate);
    const effectiveEnd = leaseEnd < parseISO(endDate) ? leaseEnd : parseISO(endDate);
    occupiedBedDays += Math.max(0, differenceInDays(effectiveEnd, effectiveStart) + 1);
  }

  const vacantBedDays = totalBedDays - occupiedBedDays;
  const dailyRate = averageRent / 7;
  const vacancyCost = vacantBedDays * dailyRate;

  return {
    totalBedDays,
    occupiedBedDays,
    vacantBedDays,
    vacancyRate: (vacantBedDays / totalBedDays) * 100,
    averageDailyRate: dailyRate,
    vacancyCost,
  };
}

// =====================================================
// PORTFOLIO ANALYTICS (Aggregated across houses)
// =====================================================

export interface PortfolioKPIs {
  totalHouses: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  averageRentPerBed: number;
  totalArrears: number;
  collectionRate: number;
  totalExpectedRent: number;
  totalCollectedRent: number;
  totalVacancyLoss: number;
  totalNetProfit: number;
  totalFixedCosts: number;
  totalMaintenanceCosts: number;
}

export async function calculatePortfolioKPIs(houseIds: string[]): Promise<PortfolioKPIs> {
  const supabase = await createClient();
  
  // Get all house KPIs and aggregate
  let totalBeds = 0;
  let occupiedBeds = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  // Calculate date range for current month
  const now = nowInPerth();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  for (const houseId of houseIds) {
    const kpis = await getHouseKPIs(houseId, startDate, endDate);
    totalBeds += kpis.occupancy.totalBeds;
    occupiedBeds += kpis.occupancy.occupiedBeds;
    totalRevenue += kpis.revenue.collected;
    totalExpenses += kpis.expenses.total;
  }

  // Get total arrears
  const { data: tenantsWithArrears } = await supabase
    .from('tenants')
    .select('current_balance')
    .lt('current_balance', 0);

  const totalArrears = tenantsWithArrears?.reduce(
    (sum: number, t: { current_balance: number | null }) => sum + Math.abs(t.current_balance || 0),
    0
  ) || 0;

  const netIncome = totalRevenue - totalExpenses;
  
  return {
    totalHouses: houseIds.length,
    totalBeds,
    occupiedBeds,
    occupancyRate: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
    totalRevenue,
    totalExpenses,
    netIncome,
    profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
    averageRentPerBed: occupiedBeds > 0 ? totalRevenue / occupiedBeds : 0,
    totalArrears,
    collectionRate: totalRevenue > 0 ? ((totalRevenue - totalArrears) / totalRevenue) * 100 : 100,
    totalExpectedRent: totalRevenue,
    totalCollectedRent: totalRevenue - totalArrears,
    totalVacancyLoss: 0, // TODO: Calculate from vacant beds
    totalNetProfit: netIncome,
    totalFixedCosts: totalExpenses,
    totalMaintenanceCosts: 0, // TODO: Separate maintenance from expenses
  };
}

export interface ArrearsAnalysis {
  totalArrears: number;
  tenantsInArrears: number;
  averageArrearsPerTenant: number;
  oldestArrears: number;
  arrearsBreakdown: Array<{
    tenant_id: string;
    tenant_name: string;
    amount: number;
    days_overdue: number;
  }>;
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
}

export async function getArrearsAnalysis(): Promise<ArrearsAnalysis> {
  const supabase = await createClient();
  
  const { data: tenantsWithArrears } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, current_balance')
    .lt('current_balance', 0)
    .order('current_balance', { ascending: true });

  const breakdown = (tenantsWithArrears || []).map((t: { id: string; first_name: string; last_name: string; current_balance: number | null }) => ({
    tenant_id: t.id,
    tenant_name: `${t.first_name} ${t.last_name}`,
    amount: Math.abs(t.current_balance || 0),
    days_overdue: 0, // TODO: Calculate from oldest unpaid charge
  }));

  const totalArrears = breakdown.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  // Create high risk tenants list (top 10 by arrears amount)
  const highRiskTenants = (tenantsWithArrears || [])
    .slice(0, 10)
    .map((t: { id: string; first_name: string; last_name: string; current_balance: number | null }) => ({
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      arrearsAmount: Math.abs(t.current_balance || 0),
    }));
  
  return {
    totalArrears,
    tenantsInArrears: breakdown.length,
    averageArrearsPerTenant: breakdown.length > 0 ? totalArrears / breakdown.length : 0,
    oldestArrears: 0, // TODO: Calculate oldest
    arrearsBreakdown: breakdown,
    agingBuckets: {
      '0-7': 0, // TODO: Calculate from rent_charges
      '8-14': 0,
      '15-30': 0,
      '30+': totalArrears, // Default all to 30+ for now
    },
    highRiskTenants,
  };
}

// Alias for getBreakEvenAnalysis
export const calculateBreakEven = getBreakEvenAnalysis;
