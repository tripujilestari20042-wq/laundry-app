'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { listOrders } from '@/lib/orders';
import AdminCancellationReview from '@/components/admin/AdminCancellationReview';
import type { Order } from '@/types';
import { LaundryStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge';

type FilterKey = 'all' | 'pembatalan_diajukan' | 'pending';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pembatalan_diajukan', label: 'Pengajuan Pembatalan' },
  { key: 'pending', label: 'Menunggu Proses' },
];

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialFilter = (searchParams.get('filter') as FilterKey) || 'all';

  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelPendingCount, setCancelPendingCount] = useState(0);
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [loading, setLoading] = useState(true);

  async function fetchOrders(currentFilter: FilterKey) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const [listRes, cancelRes] = await Promise.all([
        api.get<{ data: Order[] }>(
          currentFilter === 'all' ? '/api/orders' : `/api/orders?status=${currentFilter}`,
          session.access_token
        ),
        api.get<{ data: Order[] }>(
          '/api/orders?status=pembatalan_diajukan',
          session.access_token
        ),
      ]);
      setOrders(listRes.data);
      setCancelPendingCount(cancelRes.data.length);
    } catch {
      const admin = true;
      const allOrders = await listOrders(supabase, session.user.id, admin);
      const filtered =
        currentFilter === 'all'
          ? allOrders
          : allOrders.filter((o) => o.laundry_status === currentFilter);
      const cancelOrders = allOrders.filter(
        (o) => o.laundry_status === 'pembatalan_diajukan'
      );
      setOrders(filtered as Order[]);
      setCancelPendingCount(cancelOrders.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders(filter);
  }, [filter, supabase]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Pesanan</h1>
        <p className="text-gray-500 mt-1">
          Tinjau pesanan dan proses pengajuan pembatalan dari pelanggan
        </p>
      </div>

      {cancelPendingCount > 0 && filter !== 'pembatalan_diajukan' && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-orange-800">
            🔔 {cancelPendingCount} pengajuan pembatalan menunggu persetujuan Anda
          </p>
          <button
            type="button"
            onClick={() => setFilter('pembatalan_diajukan')}
            className="text-sm text-orange-700 font-medium hover:underline"
          >
            Proses Sekarang →
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.key === 'pembatalan_diajukan' && cancelPendingCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {cancelPendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Memuat pesanan...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          {filter === 'pembatalan_diajukan'
            ? 'Tidak ada pengajuan pembatalan saat ini.'
            : 'Tidak ada pesanan untuk filter ini.'}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl border p-5 space-y-4 ${
                order.laundry_status === 'pembatalan_diajukan'
                  ? 'border-orange-300 ring-1 ring-orange-100'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {order.services?.name || 'Layanan'}
                    </p>
                    <LaundryStatusBadge status={order.laundry_status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.profiles?.full_name || '-'} ·{' '}
                    {new Date(order.created_at).toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm font-medium text-primary-700 mt-2">
                    Rp {order.total_amount.toLocaleString('id-ID')} ·{' '}
                    <PaymentStatusBadge status={order.payment_status} />
                  </p>
                </div>

                <Link
                  href={`/admin/orders/${order.id}`}
                  className="text-sm text-primary-600 hover:underline sm:text-right"
                >
                  Detail lengkap →
                </Link>
              </div>

              {order.laundry_status === 'pembatalan_diajukan' && (
                <AdminCancellationReview
                  order={order}
                  compact
                  onUpdated={() => fetchOrders(filter)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Memuat...</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}
