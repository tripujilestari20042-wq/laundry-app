import Link from 'next/link';
import { Sparkles, ShieldCheck, Truck, Moon } from 'lucide-react';
import PulesinLogo from '@/components/brand/PulesinLogo';
import { BRAND } from '@/lib/brand';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-lavender-600">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-16 left-8 w-72 h-72 bg-white/25 rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-8 w-96 h-96 bg-lavender-300/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <PulesinLogo size="md" variant="light" />
          </Link>

          <div className="space-y-10 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-5">
                <Moon className="w-4 h-4" />
                {BRAND.tagline}
              </div>
              <h2 className="text-4xl font-bold leading-tight">
                Bersih, tenang,
                <br />
                tanpa repot
              </h2>
              <p className="mt-4 text-lg text-white/85 max-w-md leading-relaxed">
                Antar-jemput pintar, lacak pesanan real-time, dan bayar fleksibel — semua dalam {BRAND.name}.
              </p>
            </div>

            <ul className="space-y-5">
              {[
                { icon: Sparkles, text: 'Layanan premium dengan harga transparan' },
                { icon: Truck, text: 'Antar-jemput dengan pelacakan lokasi akurat' },
                { icon: ShieldCheck, text: 'Pembayaran aman — tunai & e-wallet' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4 text-white/90">
                  <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#F5F8FC]">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-block">
              <PulesinLogo size="md" variant="dark" />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{title}</h1>
            <p className="text-slate-500 mt-3 leading-relaxed">{subtitle}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-primary-100/40 border border-slate-100 p-6 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
