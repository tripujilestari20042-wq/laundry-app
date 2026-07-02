'use client';

import Link from 'next/link';
import {
  PlusCircle,
  ClipboardList,
  Truck,
  Droplets,
  Sparkles,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  LAUNDRY_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type Order,
  type LaundryStatus,
} from '@/types';

const TRACKER_STEPS = [
  { key: 'pickup', label: 'Dijemput', icon: Truck },
  { key: 'wash', label: 'Dicuci', icon: Droplets },
  { key: 'iron', label: 'Disetrika', icon: Sparkles },
  { key: 'done', label: 'Selesai', icon: CheckCircle2 },
] as const;

function getTrackerProgress(status: LaundryStatus): number {
  const map: Record<string, number> = {
    pending: 0,
    pickup: 1,
    processing: 2,
    ready: 3,
    delivering: 3,
    completed: 4,
    cancelled: 0,
    pembatalan_diajukan: 0,
  };
  return map[status] ?? 0;
}

interface CustomerDashboardViewProps {
  fullName: string;
  orders: (Order & { services: { name: string } | null })[];
  activeOrder: (Order & { services: { name: string } | null }) | null;
  activeCount: number;
  totalCount: number;
}

export default function CustomerDashboardView({
  fullName,
  orders,
  activeOrder,
  activeCount,
  totalCount,
}: CustomerDashboardViewProps) {
  const progress = activeOrder ? getTrackerProgress(activeOrder.laundry_status) : 0;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl shadow-primary-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="relative z-10">
          <p className="text-primary-100 text-sm font-medium">Selamat datang kembali</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{fullName}! 👋</h1>
          <p className="text-primary-100/90 mt-2 max-w-lg">
            Kelola pesanan laundry Anda dengan mudah. Cek status cucian, buat pesanan baru, atau lihat riwayat transaksi.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2">
              <p className="text-xs text-primary-100">Pesanan Aktif</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2">
              <p className="text-xs text-primary-100">Total Pesanan</p>
              <p className="text-xl font-bold">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/orders/new"
          className="group flex items-center gap-4 bg-white border-2 border-primary-100 rounded-2xl p-5 hover:border-primary-400 hover:shadow-lg hover:shadow-primary-100 transition-all"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white group-hover:scale-105 transition-transform">
            <PlusCircle className="w-7 h-7" />
          </span>
          <div>
            <p className="font-bold text-slate-900 text-lg">Pesan Laundry</p>
            <p className="text-sm text-slate-500">Buat pesanan baru dengan peta & pembayaran</p>
          </div>
        </Link>
        <Link
          href="/orders"
          className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
            <ClipboardList className="w-7 h-7" />
          </span>
          <div>
            <p className="font-bold text-slate-900 text-lg">Riwayat Transaksi</p>
            <p className="text-sm text-slate-500">Lihat semua pesanan & status pembayaran</p>
          </div>
        </Link>
      </div>

      {/* Order Tracker */}
      {activeOrder && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-900">Pelacak Pesanan Aktif</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeOrder.services?.name} · #{activeOrder.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Link
              href={`/orders/${activeOrder.id}`}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              Detail →
            </Link>
          </div>

          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-slate-100 rounded-full mx-8" />
            <div
              className="absolute top-5 left-0 h-1 bg-primary-500 rounded-full mx-8 transition-all duration-500"
              style={{ width: `${Math.max(0, ((progress - 1) / 3) * 100)}%`, maxWidth: 'calc(100% - 4rem)' }}
            />
            <div className="relative grid grid-cols-4 gap-2">
              {TRACKER_STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const done = progress >= stepNum;
                const active = progress === stepNum;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        done
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : active
                            ? 'bg-white border-primary-500 text-primary-600 ring-4 ring-primary-100'
                            : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className={`text-xs font-medium mt-2 ${done || active ? 'text-primary-700' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-sm text-slate-600 mt-6 bg-slate-50 rounded-xl py-2.5">
            Status saat ini:{' '}
            <strong>{LAUNDRY_STATUS_LABELS[activeOrder.laundry_status]}</strong>
          </p>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-600" />
            Pesanan Terbaru
          </h2>
          <Link href="/orders" className="text-sm text-primary-600 hover:underline">
            Lihat semua
          </Link>
        </div>

        {!orders.length ? (
          <div className="p-12 text-center text-slate-500">
            <p>Belum ada pesanan.</p>
            <Link href="/orders/new" className="text-primary-600 hover:underline mt-2 inline-block font-medium">
              Buat pesanan pertama →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900">{order.services?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full font-medium">
                    {LAUNDRY_STATUS_LABELS[order.laundry_status]}
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
