'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

interface NavbarProps {
  role: UserRole;
  fullName?: string | null;
}

export default function Navbar({ role, fullName }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navLinks =
    role === 'admin'
      ? [
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/services', label: 'Layanan' },
          { href: '/admin/settings/location', label: 'Lokasi Toko' },
          { href: '/admin/orders', label: 'Pesanan' },
          { href: '/admin/users', label: 'Pengguna' },
        ]
      : [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/services', label: 'Layanan' },
          { href: '/orders', label: 'Pesanan Saya' },
          { href: '/orders/new', label: 'Pesan Baru' },
        ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <span className="text-xl">🧺</span>
            <span className="font-bold text-primary-700">LaundryApp</span>
            {role === 'admin' && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            {fullName || 'Pengguna'}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
