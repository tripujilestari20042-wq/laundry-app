import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Home,
  Package,
  Sparkles,
} from 'lucide-react';
import type { Order, PriceUnit } from '@/types';
import { LAUNDRY_STATUS_LABELS, PAYMENT_METHOD_LABELS, PRICE_UNIT_LABELS } from '@/types';

type SuccessOrder = Order & {
  services: { name: string; price_unit: string } | null;
};

interface OrderSuccessViewProps {
  order: SuccessOrder;
  paymentNotice?: string | null;
}

const NEXT_STEPS = [
  { icon: Clock, label: 'Konfirmasi', desc: 'Tim kami memverifikasi pesanan' },
  { icon: Package, label: 'Proses', desc: 'Laundry dicuci & dirawat' },
  { icon: Sparkles, label: 'Selesai', desc: 'Siap diantar / diambil' },
];

export default function OrderSuccessView({ order, paymentNotice }: OrderSuccessViewProps) {
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-primary-50 rounded-3xl border border-emerald-100 shadow-lg shadow-emerald-100/50 p-8 text-center">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary-200/30 rounded-full blur-2xl" />

        <div className="relative">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5">
            <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pesanan Berhasil Dibuat!
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Silakan tunggu proses selanjutnya. Kami akan segera memproses pesanan laundry Anda.
          </p>
          {paymentNotice === 'success' && (
            <p className="mt-3 text-sm font-medium text-emerald-700 bg-emerald-100/80 inline-block px-4 py-1.5 rounded-full">
              Pembayaran online berhasil dikonfirmasi
            </p>
          )}
          {paymentNotice === 'pending' && (
            <p className="mt-3 text-sm font-medium text-amber-700 bg-amber-100/80 inline-block px-4 py-1.5 rounded-full">
              Pembayaran sedang diproses
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
              No. Pesanan
            </p>
            <p className="font-mono font-bold text-lg text-slate-900 mt-0.5">#{shortId}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
            {LAUNDRY_STATUS_LABELS[order.laundry_status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Layanan</p>
            <p className="font-semibold text-slate-900 mt-0.5">
              {order.services?.name || 'Laundry'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Jumlah</p>
            <p className="font-semibold text-slate-900 mt-0.5">
              {order.weight_qty}{' '}
              {order.services?.price_unit
                ? PRICE_UNIT_LABELS[order.services.price_unit as PriceUnit]
                : 'unit'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Pembayaran</p>
            <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
              {order.payment_method === 'cash' && <Banknote className="w-4 h-4 text-amber-600" />}
              {order.payment_method
                ? PAYMENT_METHOD_LABELS[order.payment_method]
                : 'Tunai'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Total</p>
            <p className="font-bold text-primary-700 text-lg mt-0.5">
              Rp {order.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {order.is_pickup_delivery && order.pickup_address && (
          <div className="pt-4 border-t border-slate-100 text-sm text-left">
            <p className="text-slate-500">Alamat Jemput/Antar</p>
            <p className="text-slate-800 mt-0.5">{order.pickup_address}</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 text-center">
          Proses Selanjutnya
        </p>
        <div className="flex justify-between gap-2">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.label} className="flex-1 text-center relative">
              {i < NEXT_STEPS.length - 1 && (
                <div className="absolute top-5 left-[60%] w-[80%] h-0.5 bg-slate-200 hidden sm:block" />
              )}
              <div
                className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2 relative z-10 ${
                  i === 0
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : 'bg-white border border-slate-200 text-slate-400'
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">{step.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight hidden sm:block">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href={`/orders/${order.id}`}
          className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg transition-all"
        >
          Lihat Detail Pesanan
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ke Dashboard
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Anda juga dapat memantau status pesanan di menu{' '}
        <Link href="/orders" className="text-primary-600 hover:underline font-medium">
          Pesanan Saya
        </Link>
      </p>
    </div>
  );
}
