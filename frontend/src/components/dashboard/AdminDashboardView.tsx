'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  Cog,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import {
  LAUNDRY_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type LaundryStatus,
} from '@/types';

const AdminStatusPieChart = dynamic(
  () => import('@/components/dashboard/AdminStatusPieChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-sm">
        Memuat grafik...
      </div>
    ),
  }
);

export interface DashboardStats {
  today_revenue: number;
  incoming_orders: number;
  processing_orders: number;
  status_distribution: Record<string, number>;
  recent_orders: Array<{
    id: string;
    total_amount: number;
    laundry_status: LaundryStatus;
    payment_status: string;
    created_at: string;
    profiles: { full_name: string | null } | null;
    services: { name: string } | null;
  }>;
}

interface AdminDashboardViewProps {
  fullName: string;
  cancelRequests: number;
  stats: DashboardStats;
}

export default function AdminDashboardView({
  fullName,
  cancelRequests,
  stats,
}: AdminDashboardViewProps) {
  const pieData = Object.entries(stats.status_distribution).map(([status, value]) => ({
    name: LAUNDRY_STATUS_LABELS[status as LaundryStatus] || status,
    value,
  }));

  const statCards = [
    {
      label: 'Pendapatan Hari Ini',
      value: `Rp ${stats.today_revenue.toLocaleString('id-ID')}`,
      icon: Banknote,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-200',
    },
    {
      label: 'Pesanan Masuk',
      value: stats.incoming_orders,
      icon: Package,
      gradient: 'from-sky-500 to-blue-600',
      shadow: 'shadow-sky-200',
    },
    {
      label: 'Sedang Diproses',
      value: stats.processing_orders,
      icon: Cog,
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-200',
    },
    {
      label: 'Tren Bulan Ini',
      value: `${pieData.reduce((s, d) => s + d.value, 0)} pesanan`,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-200',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Selamat datang, {fullName}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Ringkasan operasional laundry hari ini</p>
      </div>

      {cancelRequests > 0 && (
        <Link
          href="/admin/orders?filter=pembatalan_diajukan"
          className="block p-4 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors"
        >
          <p className="font-semibold text-orange-800">
            🔔 {cancelRequests} pengajuan pembatalan menunggu tinjauan
          </p>
          <p className="text-sm text-orange-600 mt-1">Klik untuk memproses →</p>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, gradient, shadow }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg ${shadow}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{label}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{value}</p>
              </div>
              <span className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
                <Icon className="w-5 h-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Distribusi Status Pesanan</h2>
          <AdminStatusPieChart data={pieData} />
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">5 Aktivitas Terbaru</h2>
            <Link href="/admin/orders" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recent_orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {order.profiles?.full_name || 'Pelanggan'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.services?.name} · {new Date(order.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
                    {LAUNDRY_STATUS_LABELS[order.laundry_status]}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {PAYMENT_STATUS_LABELS[order.payment_status as keyof typeof PAYMENT_STATUS_LABELS] || order.payment_status}
                  </p>
                </div>
              </Link>
            ))}
            {!stats.recent_orders.length && (
              <p className="py-12 text-center text-sm text-slate-400">Belum ada transaksi</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/orders', label: 'Kelola Pesanan', desc: 'Proses & update status' },
          { href: '/admin/laporan', label: 'Laporan Keuangan', desc: 'Analisis bulanan' },
          { href: '/admin/users', label: 'Kelola Pengguna', desc: 'CRUD pelanggan & admin' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-primary-300 hover:shadow-md transition-all"
          >
            <p className="font-semibold text-slate-900 group-hover:text-primary-700">{action.label}</p>
            <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
