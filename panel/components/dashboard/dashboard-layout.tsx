"use client";

import type { Brand } from "@/lib/brand";
import type React from "react";
import { useEffect } from "react";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Scissors,
  Users,
  Calendar,
  Clock3,
  UserCheck,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  Globe,
  CalendarDays,
} from "lucide-react";
import { MobileNavigation, SidebarRouteLink } from "./mobile-navigation";
import { NotificationBell } from "./notification-bell";
import { usePathname } from "next/navigation";

const menuItems = [
  { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
  { title: "Turnos", url: "/dashboard/appointments", icon: Calendar },
  { title: "Checkout", url: "/dashboard/checkout", icon: Wallet },
  { title: "Atenciones", url: "/dashboard/atenciones", icon: CalendarDays },
  { title: "Clientes", url: "/dashboard/clients", icon: UserCheck },
  { title: "Servicios", url: "/dashboard/services", icon: Scissors },
  { title: "Caja", url: "/dashboard/payments", icon: CreditCard },
  { title: "Gastos", url: "/dashboard/gastos", icon: Building2 },
  {
    title: "Liquidaciones",
    url: "/dashboard/liquidaciones",
    icon: CalendarDays,
  },
  { title: "Avisos", url: "/dashboard/notifications", icon: Bell },
  { title: "Equipo", url: "/dashboard/employees", icon: Users },
  { title: "Horarios", url: "/dashboard/hours", icon: Clock3 },
  { title: "Reportes", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Mi web", url: "/dashboard/website", icon: Globe },
  { title: "Configuración", url: "/dashboard/settings", icon: Settings },
];

const routeMeta = [
  { match: "/dashboard/website", title: "Mi web" },
  {
    match: "/dashboard/checkout",
    title: "Checkout",
  },
  {
    match: "/dashboard/gastos",
    title: "Gastos",
  },
  {
    match: "/dashboard/liquidaciones",
    title: "Liquidaciones",
  },
  {
    match: "/dashboard/atenciones",
    title: "Atenciones",
  },
  {
    match: "/dashboard/services",
    title: "Servicios",
  },
  {
    match: "/dashboard/employees",
    title: "Equipo",
  },
  {
    match: "/dashboard/appointments",
    title: "Turnos",
  },
  {
    match: "/dashboard/hours",
    title: "Horarios",
  },
  {
    match: "/dashboard/clients",
    title: "Clientes",
  },
  {
    match: "/dashboard/payments",
    title: "Caja",
  },
  {
    match: "/dashboard/reports",
    title: "Reportes",
  },
  {
    match: "/dashboard/campaigns",
    title: "Campañas y comunicación",
  },
  {
    match: "/dashboard/settings",
    title: "Configuración del negocio",
  },
  {
    match: "/dashboard/notifications",
    title: "Avisos",
  },
];

function getRouteMeta(pathname: string) {
  if (pathname === "/dashboard") {
    return {
      title: "Panel general",
    };
  }

  return (
    routeMeta.find((item) => pathname.startsWith(item.match)) ?? routeMeta[0]
  );
}

export default function DashboardLayout({
  children,
  brand,
}: {
  children: React.ReactNode;
  brand: Brand;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = "nerea";
    for (const key of ["gray", "black", "burgundy", "white"] as const)
      root.style.setProperty(`--studio-${key}`, brand.identity[key]);
    root.style.setProperty(
      "--studio-font",
      brand.identity.font === "system"
        ? "system-ui, sans-serif"
        : "var(--font-geist-sans), sans-serif",
    );
  }, [brand.identity]);
  const pathname = usePathname();
  const currentRoute = getRouteMeta(pathname);
  const todayLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return (
    <SidebarProvider data-palette="nerea" className="admin-shell">
      <a href="#admin-content" className="skip-link">
        Ir al contenido
      </a>
      <Sidebar variant="inset" className="brand-sidebar border-none">
        <SidebarHeader className="px-4 pb-2 pt-4">
          <div className="sidebar-brand px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    brand.identity.logo.startsWith("/")
                      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nataliasanchez.com.ar'}${brand.identity.logo}`
                      : brand.identity.logo
                  }
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {brand.shortName}
                </h2>
                <p className="text-xs text-slate-500">Gestión del negocio</p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-2">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Operación
            </SidebarGroupLabel>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/dashboard"
                        ? pathname === item.url
                        : pathname.startsWith(item.url)
                    }
                    className="brand-nav-item h-10 rounded-xl px-3 transition-colors"
                  >
                    <SidebarRouteLink href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarRouteLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 pt-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-auto w-full rounded-2xl border border-slate-200/80 bg-white/90 p-3 hover:bg-white">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{brand.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900">
                        Natalia
                      </p>
                      <p className="text-xs text-slate-500">Estética</p>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-56">
                  <DropdownMenuItem asChild>
                    <SidebarRouteLink href="/dashboard/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Configuración
                    </SidebarRouteLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onSelect={async () => {
                      const response = await fetch("/api/auth/logout", {
                        method: "POST",
                      });
                      if (response.ok) window.location.assign("/auth");
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <header className="admin-topbar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
          <SidebarTrigger className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {currentRoute.title}
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="capitalize">{todayLabel}</span>
          </div>
          <NotificationBell />
        </header>
        <div
          tabIndex={-1}
          id="admin-content"
          className="admin-content min-w-0 flex-1"
        >
          <div className="min-h-full">{children}</div>
        </div>
      </SidebarInset>
      <MobileNavigation />
    </SidebarProvider>
  );
}
