'use client';

import {
  LayoutDashboard,
  Package,
  MapPin,
  Layers,
  Users,
  BarChart3,
} from 'lucide-react';
import SidebarShell from '@/components/layout/SidebarShell';
import NotificationBell from '@/components/notifications/NotificationBell';
import { BRAND } from '@/lib/brand';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Pesanan', icon: Package },
  { href: '/admin/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/admin/services', label: 'Layanan', icon: Layers },
  { href: '/admin/settings/location', label: 'Lokasi Toko', icon: MapPin },
  { href: '/admin/users', label: 'Pengguna', icon: Users },
];

interface AdminSidebarProps {
  fullName?: string | null;
  children: React.ReactNode;
}

export default function AdminSidebar({ fullName, children }: AdminSidebarProps) {
  return (
    <SidebarShell
      title={BRAND.name}
      subtitle="Panel Admin"
      nav={ADMIN_NAV}
      fullName={fullName}
      headerRight={<NotificationBell role="admin" playSoundOnNew />}
    >
      {children}
    </SidebarShell>
  );
}
