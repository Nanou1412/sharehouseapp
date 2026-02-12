import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Timezone constants
export const PERTH_TIMEZONE = 'Australia/Perth';

// Date utilities with Perth timezone
export function nowInPerth(): Date {
  return utcToZonedTime(new Date(), PERTH_TIMEZONE);
}

export function toPerth(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(d, PERTH_TIMEZONE);
}

export function fromPerth(date: Date): Date {
  return zonedTimeToUtc(date, PERTH_TIMEZONE);
}

export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(toPerth(d), formatStr);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Week utilities (Monday = start of week)
export function getWeekStart(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(toPerth(d), { weekStartsOn: 1 }); // Monday
}

export function getWeekEnd(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfWeek(toPerth(d), { weekStartsOn: 1 }); // Sunday
}

// Aliases for compatibility
export const getMondayOfWeek = getWeekStart;
export const getSundayOfWeek = getWeekEnd;

export function formatWeek(date: Date | string): string {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);
  return `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`;
}

// Date range utilities
export function daysInRange(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start) + 1; // Inclusive
}

export function isDateInRange(date: Date, startDate: Date, endDate: Date | null): boolean {
  if (!endDate) {
    return date >= startDate;
  }
  return isWithinInterval(date, { start: startDate, end: endDate });
}

// Prorata calculation
export function calculateProrata(weeklyRent: number, daysOccupied: number): number {
  const dailyRate = weeklyRent / 7;
  return Math.round(dailyRate * daysOccupied * 100) / 100;
}

// Days occupied in a week
export function getDaysOccupiedInWeek(
  weekStart: Date,
  weekEnd: Date,
  leaseStart: Date,
  leaseEnd: Date | null,
  prorateIn: boolean,
  prorateOut: boolean
): number {
  let start = weekStart;
  let end = weekEnd;

  // Adjust for lease start
  if (leaseStart > weekStart && leaseStart <= weekEnd) {
    if (prorateIn) {
      start = leaseStart;
    }
  }

  // Adjust for lease end
  if (leaseEnd && leaseEnd >= weekStart && leaseEnd < weekEnd) {
    if (prorateOut) {
      end = leaseEnd;
    }
  }

  // Check if lease is active during this week
  if (leaseStart > weekEnd || (leaseEnd && leaseEnd < weekStart)) {
    return 0;
  }

  return daysInRange(start, end);
}

// UUID validation
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Generate a simple ID (for temp usage)
export function generateId(): string {
  return crypto.randomUUID();
}

// Capitalize first letter
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format enum to display string
export function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  waitFor: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

// Calculate risk score for tenant
export function calculateTenantRiskScore(factors: {
  hasIncome: boolean;
  incomeToRentRatio?: number;
  hasReferences: boolean;
  hasValidId: boolean;
  visaExpiryMonths?: number;
  previousIssues: number;
}): number {
  let score = 50; // Base score

  // Income verification
  if (factors.hasIncome && factors.incomeToRentRatio) {
    if (factors.incomeToRentRatio >= 3) score -= 15;
    else if (factors.incomeToRentRatio >= 2) score -= 10;
    else if (factors.incomeToRentRatio >= 1.5) score -= 5;
    else score += 10;
  } else {
    score += 15; // No income verification
  }

  // References
  if (factors.hasReferences) score -= 10;
  else score += 10;

  // ID verification
  if (factors.hasValidId) score -= 5;
  else score += 10;

  // Visa expiry risk
  if (factors.visaExpiryMonths !== undefined) {
    if (factors.visaExpiryMonths < 3) score += 20;
    else if (factors.visaExpiryMonths < 6) score += 10;
    else if (factors.visaExpiryMonths >= 12) score -= 5;
  }

  // Previous issues
  score += factors.previousIssues * 15;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Chunk array
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Group by key
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// Sum by key
export function sumBy<T>(array: T[], fn: (item: T) => number): number {
  return array.reduce((sum, item) => sum + fn(item), 0);
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Status color mapping
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Lease status
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    ending: 'bg-yellow-100 text-yellow-800',
    ended: 'bg-gray-100 text-gray-800',
    broken: 'bg-red-100 text-red-800',
    // Charge status
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    waived: 'bg-gray-100 text-gray-800',
    // Ticket status
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    // Priority
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
    // Bed status
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    reserved: 'bg-purple-100 text-purple-800',
    maintenance: 'bg-orange-100 text-orange-800',
    // Arrears status
    current: 'bg-green-100 text-green-800',
    late: 'bg-yellow-100 text-yellow-800',
    reminder_sent: 'bg-orange-100 text-orange-800',
    payment_plan: 'bg-blue-100 text-blue-800',
    default: 'bg-red-100 text-red-800',
    // Candidate status
    new: 'bg-blue-100 text-blue-800',
    screening: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waitlist: 'bg-purple-100 text-purple-800',
    // Alert priority
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}
