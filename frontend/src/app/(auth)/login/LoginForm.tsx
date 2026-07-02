'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import GoogleButton from '@/components/auth/GoogleButton';
import RoleDropdown from '@/components/auth/RoleDropdown';
import PasswordInput from '@/components/ui/PasswordInput';
import { loginUser } from '@/lib/auth/api';
import { formatAuthError } from '@/lib/auth/errors';
import { isSafeRedirect } from '@/lib/auth/redirect';
import { applyAuthSession, getRedirectForRole } from '@/lib/auth/session';
import type { UserRole } from '@/types';

interface LoginFormProps {
  initialError?: string | null;
  redirectTo?: string | null;
}

export default function LoginForm({ initialError = null, redirectTo = null }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pelanggan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginUser({ email, password, role });
      if (!result.session) throw new Error('Login gagal. Session tidak tersedia.');

      await applyAuthSession(result.session);
      const destination = isSafeRedirect(redirectTo)
        ? redirectTo
        : getRedirectForRole(result.profile?.role);

      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Masuk ke Akun" subtitle="Selamat datang kembali! Kelola laundry Anda dengan mudah.">
      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <GoogleButton label="Masuk dengan Google" disabled={loading} role={role} onError={setError} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-slate-400">atau dengan email</span>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow"
            placeholder="nama@email.com"
          />
        </div>

        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Lupa password?
          </Link>
        </div>

        <RoleDropdown value={role} onChange={setRole} disabled={loading} />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-200 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Belum punya akun?{' '}
        <Link href="/register" className="text-primary-600 font-semibold hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </AuthLayout>
  );
}
