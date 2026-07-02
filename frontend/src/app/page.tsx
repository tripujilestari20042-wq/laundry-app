import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">🧺</span>
          <span className="text-xl font-bold">LaundryApp</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-white/90 hover:text-white transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="bg-white text-primary-700 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Daftar
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20 text-center text-white">
        <h1 className="text-5xl font-bold mb-6">
          Laundry Bersih,<br />Antar Jemput ke Rumah
        </h1>
        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          Pesan layanan cuci online, lacak status pesanan, dan nikmati layanan
          antar-jemput dengan biaya transparan per kilometer.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-white text-primary-700 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors"
          >
            Mulai Pesan
          </Link>
          <Link
            href="/login"
            className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            Masuk
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: '🚚', title: 'Antar Jemput', desc: 'Kurir jemput & antar ke lokasi Anda' },
            { icon: '📍', title: 'Lacak Real-time', desc: 'Pantau status pesanan kapan saja' },
            { icon: '💳', title: 'Bayar Mudah', desc: 'Simulasi pembayaran online yang aman' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="text-lg font-semibold mt-3">{feature.title}</h3>
              <p className="text-white/70 mt-1 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
