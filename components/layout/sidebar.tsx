'use client';

import { useState } from 'react';
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
  Key,
  ClipboardList,
  UserPlus,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/actions/auth-actions';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Maisons', href: '/houses', icon: Building2 },
  { name: 'Locataires', href: '/tenants', icon: Users },
  { name: 'Baux', href: '/leases', icon: FileText },
  { name: 'Paiements', href: '/payments', icon: DollarSign },
  { name: 'Factures', href: '/bills', icon: Receipt },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Ménage', href: '/cleaning', icon: ClipboardList },
  { name: 'Clés', href: '/keys', icon: Key },
  { name: 'Candidats', href: '/candidates', icon: UserPlus },
  { name: 'Cautions', href: '/bonds', icon: ShieldCheck },
  { name: 'Statistiques', href: '/analytics', icon: BarChart3 },
];

const bottomNavigation = [
  { name: 'Alertes', href: '/alerts', icon: Bell },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">ShareHouse</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Perth, WA</p>
          </div>
        </div>
        {/* Close button mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={closeMobile}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Menu principal
        </p>
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                !isActive && 'group-hover:scale-110'
              )} />
              <span className="flex-1 truncate">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 opacity-70 shrink-0" />
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
              onClick={closeMobile}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 h-10 w-10 md:hidden bg-card border shadow-sm"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-xl transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full w-64 flex-col bg-card border-r">
        {sidebarContent}
      </div>
    </>
  );
}
