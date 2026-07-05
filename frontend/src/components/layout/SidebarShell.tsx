'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import PulesinLogo from '@/components/brand/PulesinLogo';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  isActive?: (pathname: string) => boolean;
}

interface SidebarShellProps {
  title: string;
  subtitle: string;
  nav: SidebarNavItem[];
  fullName?: string | null;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function SidebarShell({
  subtitle,
  nav,
  fullName,
  headerRight,
  children,
}: SidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-gradient-to-b from-primary-700 via-primary-800 to-lavender-800 text-white shadow-xl">
      <div className="p-6 border-b border-white/10">
        <Link href={nav[0]?.href || '/'} className="block">
          <PulesinLogo size="sm" variant="light" />
          <p className="text-xs text-primary-100/80 mt-2 font-medium">{subtitle}</p>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {nav.map(({ href, label, icon: Icon, exact, isActive: customActive }) => {
          const active = customActive ? customActive(pathname) : isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                  : 'text-primary-100/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-primary-100/70 truncate px-2 mb-3">{fullName || 'Pengguna'}</p>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-primary-100/90 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Keluar
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F8FC]">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">{sidebar}</div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 rounded-xl hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-slate-800 lg:hidden">Pulesin</span>
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>

        <main className="flex-1 p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
