'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import CustomerSidebar from '@/components/customer/CustomerSidebar';
import type { UserRole } from '@/types';

interface DashboardChromeProps {
  role: UserRole;
  fullName?: string | null;
  children: React.ReactNode;
}

/** Admin sidebar untuk semua rute /admin/* */
function isAdminShellPath(pathname: string, role: UserRole) {
  return role === 'admin' && pathname.startsWith('/admin');
}

/** Customer sidebar untuk rute dashboard pelanggan */
function isCustomerShellPath(pathname: string, role: UserRole) {
  if (role !== 'pelanggan') return false;
  const customerPrefixes = ['/dashboard', '/orders', '/settings'];
  return customerPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function DashboardChrome({ role, fullName, children }: DashboardChromeProps) {
  const pathname = usePathname();

  if (isAdminShellPath(pathname, role)) {
    return <AdminSidebar fullName={fullName}>{children}</AdminSidebar>;
  }

  if (isCustomerShellPath(pathname, role)) {
    return <CustomerSidebar fullName={fullName}>{children}</CustomerSidebar>;
  }

  /* Fallback: layanan publik setelah login, dll. */
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="container mx-auto px-4 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
