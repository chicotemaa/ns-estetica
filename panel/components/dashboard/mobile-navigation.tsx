"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Wallet, CreditCard, Bell, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const shortcuts = [
  { href: "/dashboard/appointments", label: "Turnos", icon: Calendar },
  { href: "/dashboard/checkout", label: "Checkout", icon: Wallet },
  { href: "/dashboard/payments", label: "Caja", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Avisos", icon: Bell },
];

export function SidebarRouteLink(props: React.ComponentProps<typeof Link>) {
  const { setOpenMobile } = useSidebar();
  return (
    <Link
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) setOpenMobile(false);
      }}
    />
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();
  return (
    <nav
      aria-label="Accesos rápidos"
      className="mobile-admin-navigation lg:hidden"
    >
      {shortcuts.map(({ href, label, icon: Icon }) => (
        <SidebarRouteLink
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
        >
          <Icon size={20} aria-hidden="true" />
          <span>{label}</span>
        </SidebarRouteLink>
      ))}
      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        aria-expanded={openMobile}
        aria-label="Abrir todas las secciones"
      >
        <Menu size={20} aria-hidden="true" />
        <span>Menú</span>
      </button>
    </nav>
  );
}
