import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';
import PulesinLogo from '@/components/brand/PulesinLogo';
import { BRAND } from '@/lib/brand';
import { Sparkles, Truck, ShieldCheck, Moon } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'role'> | null;

    if (profile?.role === 'admin') {
      redirect('/admin');
    }
    redirect('/dashboard');
  }

  const features = [
    { icon: Truck, title: 'Antar Jemput', desc: 'Kurir jemput & antar ke lokasi Anda dengan nyaman' },
    { icon: Sparkles, title: 'Lacak Pesanan', desc: 'Pantau status cucian kapan saja, tanpa khawatir' },
    { icon: ShieldCheck, title: 'Bayar Mudah', desc: 'Tunai maupun e-wallet — transparan & aman' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F4FC] via-[#EEF2FA] to-[#E8E4F8] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-lavender-400/20 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 container mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link href="/">
          <PulesinLogo size="md" variant="dark" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="text-sm sm:text-base text-slate-600 hover:text-primary-700 font-medium transition-colors px-3 py-2"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="text-sm sm:text-base bg-gradient-to-r from-primary-500 to-lavender-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-200/60 transition-all"
          >
            Daftar
          </Link>
        </nav>
      </header>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="flex justify-center mb-8">
          <PulesinLogo size="xl" variant="dark" />
        </div>

        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-lavender-200/60 text-lavender-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Moon className="w-4 h-4" />
          {BRAND.tagline}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight max-w-3xl mx-auto">
          Cucian beres,
          <span className="bg-gradient-to-r from-primary-600 to-lavender-600 bg-clip-text text-transparent">
            {' '}
            tidur pun pules
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 mt-6 mb-12 max-w-2xl mx-auto leading-relaxed">
          {BRAND.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-3.5 rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-primary-200/50 transition-all"
          >
            Mulai Pesan
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center border-2 border-primary-200 text-primary-700 bg-white/80 backdrop-blur px-8 py-3.5 rounded-2xl font-semibold text-lg hover:bg-white transition-all"
          >
            Masuk
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card-pulesin p-8 text-left hover:shadow-md transition-shadow"
            >
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-lavender-100 text-primary-600">
                <Icon className="w-6 h-6" strokeWidth={1.75} />
              </span>
              <h3 className="text-lg font-semibold text-slate-800 mt-5">{title}</h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-20 text-sm text-slate-400">
          © {new Date().getFullYear()} {BRAND.name}. Semua hak dilindungi.
        </p>
      </main>
    </div>
  );
}
