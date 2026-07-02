import Link from 'next/link';
import { Sparkles, ShieldCheck, Truck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-accent-600">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-400/40 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
            <span className="text-3xl">🧺</span>
            <span className="text-xl font-bold tracking-tight">LaundryApp</span>
          </Link>

          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-4xl font-bold leading-tight">
                Laundry modern,<br />hasil bersih maksimal
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-md">
                Antar-jemput pintar, lacak pesanan real-time, dan bayar fleksibel — semua dalam satu aplikasi.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                { icon: Sparkles, text: 'Layanan premium dengan harga transparan' },
                { icon: Truck, text: 'Antar-jemput dengan pelacakan lokasi akurat' },
                { icon: ShieldCheck, text: 'Pembayaran aman — tunai & e-wallet' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-white/90">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/50">© {new Date().getFullYear()} LaundryApp. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-primary-700 font-bold text-xl">
              <span>🧺</span> LaundryApp
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-500 mt-2">{subtitle}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
