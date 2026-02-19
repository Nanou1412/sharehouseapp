'use client';

import { Bell, Search, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface HeaderProps {
  user?: {
    email?: string;
    profile?: {
      full_name?: string;
    } | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const { setTheme, theme } = useTheme();

  const initials = user?.profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Spacer for mobile hamburger */}
      <div className="w-10 md:hidden" />

      {/* Search - hidden on mobile */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
          <Input
            type="search"
            placeholder="Rechercher locataires, maisons..."
            className="pl-10 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-background transition-all duration-200"
          />
        </div>
      </div>

      {/* Mobile title */}
      <div className="flex-1 md:hidden">
        <h1 className="font-bold text-base">ShareHouse</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Changer le thème</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground relative" asChild>
          <Link href="/alerts">
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-2" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 rounded-lg px-2 hover:bg-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </div>
              <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                {user?.profile?.full_name || user?.email || 'Compte'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.profile?.full_name || 'Mon compte'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <Link href="/api/auth/signout">Déconnexion</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
