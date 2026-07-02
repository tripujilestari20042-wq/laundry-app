'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  title,
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
    <aside className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0">
      <div className="p-6 border-b border-white/10">
        <Link href={nav[0]?.href || '/'} className="flex items-center gap-2">
          <span className="text-2xl">🧺</span>
          <div>
            <p className="font-bold text-sm">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, exact, isActive: customActive }) => {
          const active = customActive ? customActive(pathname) : isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-slate-400 truncate px-2 mb-2">{fullName || 'Pengguna'}</p>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">{sidebar}</div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-slate-800 lg:hidden">{title}</span>
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
