'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  Users,
  FileText,
  DollarSign,
  Receipt,
  Wrench,
  BarChart3,
  Settings,
  Bell,
  Calendar,
  Key,
  ClipboardList,
  UserPlus,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/actions/auth-actions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Houses', href: '/houses', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Leases', href: '/leases', icon: FileText },
  { name: 'Payments', href: '/payments', icon: DollarSign },
  { name: 'Bills', href: '/bills', icon: Receipt },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Cleaning', href: '/cleaning', icon: ClipboardList },
  { name: 'Keys', href: '/keys', icon: Key },
  { name: 'Candidates', href: '/candidates', icon: UserPlus },
  { name: 'Bonds', href: '/bonds', icon: ShieldCheck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const bottomNavigation = [
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r transition-all duration-300">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">ShareHouse</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Perth, WA</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 transition-transform duration-200',
                !isActive && 'group-hover:scale-110'
              )} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 opacity-70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t px-3 py-3 space-y-0.5">
        {bottomNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
