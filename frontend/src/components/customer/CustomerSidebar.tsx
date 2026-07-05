'use client';

import {
  LayoutDashboard,
  ShoppingBag,
  History,
  UserCircle,
} from 'lucide-react';
import SidebarShell from '@/components/layout/SidebarShell';
import NotificationBell from '@/components/notifications/NotificationBell';
import { BRAND } from '@/lib/brand';

const CUSTOMER_NAV = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard, exact: true },
  { href: '/orders/new', label: 'Pesanan Baru', icon: ShoppingBag, exact: true },
  {
    href: '/orders',
    label: 'Riwayat Pesanan',
    icon: History,
    isActive: (p: string) =>
      p === '/orders' || (p.startsWith('/orders/') && !p.startsWith('/orders/new')),
  },
  { href: '/settings/profile', label: 'Pengaturan Profil', icon: UserCircle },
];

interface CustomerSidebarProps {
  fullName?: string | null;
  children: React.ReactNode;
}

export default function CustomerSidebar({ fullName, children }: CustomerSidebarProps) {
  return (
    <SidebarShell
      title={BRAND.name}
      subtitle="Area Pelanggan"
      nav={CUSTOMER_NAV}
      fullName={fullName}
      headerRight={<NotificationBell role="pelanggan" />}
    >
      {children}
    </SidebarShell>
  );
}
