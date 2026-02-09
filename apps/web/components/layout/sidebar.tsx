'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { APP_CONFIG } from '@/lib/config';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Ship,
  Bell,
  ScanBarcode,
  Upload,
  PlusCircle,
  UserCog,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { TasaDolarSidebar } from '@/components/tasa-dolar-sidebar';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// Roles que pueden ver cada opción
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'VENDEDOR', 'ALMACEN', 'REPORTES'] },
  { name: 'Inventario', href: '/dashboard/inventario', icon: Package, roles: ['ADMIN', 'ALMACEN'] },
  { name: 'Seriales', href: '/dashboard/inventario/seriales', icon: ScanBarcode, roles: ['ADMIN', 'ALMACEN'] },
  { name: 'Importar Stock', href: '/dashboard/inventario/importar', icon: Upload, roles: ['ADMIN', 'ALMACEN'] },
  { name: 'Nueva Venta', href: '/dashboard/ventas/nueva', icon: PlusCircle, roles: ['ADMIN', 'VENDEDOR'] },
  { name: 'Ventas', href: '/dashboard/ventas', icon: ShoppingCart, roles: ['ADMIN', 'VENDEDOR', 'REPORTES'] },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users, roles: ['ADMIN', 'VENDEDOR'] },
  { name: 'Importaciones', href: '/dashboard/importaciones', icon: Ship, roles: ['ADMIN'] },
  { name: 'Finanzas', href: '/dashboard/finanzas', icon: DollarSign, roles: ['ADMIN'] },
  { name: 'Gastos Operativos', href: '/dashboard/gastos', icon: Receipt, roles: ['ADMIN'] },
  { name: 'Reportes', href: '/dashboard/reportes', icon: BarChart3, roles: ['ADMIN', 'REPORTES'] },
  { name: 'Usuarios', href: '/dashboard/usuarios', icon: UserCog, roles: ['ADMIN'] },
  { name: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell, roles: ['ADMIN'] },
];

const bottomNavigation = [
  { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings, roles: ['ADMIN'] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-center border-b px-1",
        APP_CONFIG.showLogo ? "h-32 lg:h-56" : "h-14 lg:h-16"
      )}>
        <Link href="/dashboard" className="flex items-center">
          {APP_CONFIG.showLogo ? (
            <Image
              src={APP_CONFIG.logoUrl}
              alt={APP_CONFIG.appName}
              width={400}
              height={200}
              className="h-28 lg:h-52 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-lg lg:text-xl font-bold text-primary">{APP_CONFIG.appName}</span>
          )}
        </Link>
      </div>

      {/* Tasa del dolar */}
      <TasaDolarSidebar />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation
          .filter((item) => {
            if (!item.roles) return true;
            const userRole = user?.rol?.nombre?.toUpperCase() || '';
            return item.roles.some(role => role.toUpperCase() === userRole);
          })
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* Bottom section */}
      <div className="border-t px-3 py-4">
        {bottomNavigation
          .filter((item) => {
            if (!item.roles) return true;
            const userRole = user?.rol?.nombre?.toUpperCase() || '';
            return item.roles.some(role => role.toUpperCase() === userRole);
          })
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

        {/* User info & logout */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <Link href="/dashboard/perfil" onClick={onNavigate} className="flex-1 truncate hover:opacity-80">
            <p className="text-sm font-medium">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r bg-background lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
