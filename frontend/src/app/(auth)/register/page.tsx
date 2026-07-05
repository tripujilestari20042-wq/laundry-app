'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import GoogleButton from '@/components/auth/GoogleButton';
import RoleDropdown from '@/components/auth/RoleDropdown';
import PasswordInput from '@/components/ui/PasswordInput';
import { registerUser } from '@/lib/auth/api';
import { formatAuthError } from '@/lib/auth/errors';
import { applyAuthSession, getRedirectForRole } from '@/lib/auth/session';
import { BRAND } from '@/lib/brand';
import type { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pelanggan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await registerUser({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        role,
      });

      if (result.session) {
        await applyAuthSession(result.session);
        router.push(getRedirectForRole(result.profile?.role));
        router.refresh();
        return;
      }

      setSuccessMessage(result.message || 'Registrasi berhasil. Silakan login.');
      setSuccess(true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-900">Registrasi Berhasil</h2>
          <p className="text-slate-500 mt-2">{successMessage}</p>
          <Link href="/login" className="inline-block mt-6 text-primary-600 font-semibold hover:underline">
            Masuk ke akun
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-shadow';

  return (
    <AuthLayout title="Buat Akun Baru" subtitle={`Lengkapi data di bawah untuk mulai menggunakan ${BRAND.name}.`}>
      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <GoogleButton label="Daftar dengan Google" disabled={loading} role={role} onError={setError} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-slate-400">atau dengan email</span>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nama Lengkap
          </label>
          <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" className={inputClass} placeholder="John Doe" />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} placeholder="nama@email.com" />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
            No. Telepon <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={inputClass} placeholder="08123456789" />
        </div>

        <PasswordInput id="password" value={password} onChange={setPassword} label="Password" autoComplete="new-password" required minLength={6} />

        <RoleDropdown
          value={role}
          onChange={(r) => {
            if (r) setRole(r);
          }}
          disabled={loading}
          label="Daftar sebagai"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Memproses...' : 'Daftar Sekarang'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-primary-600 font-semibold hover:underline">Masuk di sini</Link>
      </p>
    </AuthLayout>
  );
}
