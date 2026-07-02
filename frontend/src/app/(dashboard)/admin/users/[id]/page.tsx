'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { LaundryStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge';
import type { Profile, Order } from '@/types';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await api.get<{
          data: { profile: Profile; orders: Order[] };
        }>(`/api/admin/users/${userId}`, session.access_token);
        setProfile(res.data.profile);
        setOrders(res.data.orders);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Pengguna tidak ditemukan</p>
        <Link href="/admin/users" className="text-primary-600 hover:underline mt-2 inline-block">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar pengguna
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-900">{profile.full_name || 'Pengguna'}</h1>
        <p className="text-slate-500 text-sm mt-1">{profile.email}</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-slate-500">Telepon</p>
            <p className="font-medium">{profile.phone || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Role</p>
            <p className="font-medium capitalize">{profile.role}</p>
          </div>
          <div>
            <p className="text-slate-500">Bergabung</p>
            <p className="font-medium">{new Date(profile.created_at).toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Riwayat Pesanan Laundry</h2>
          <p className="text-sm text-slate-500">{orders.length} pesanan</p>
        </div>
        {orders.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Belum ada pesanan</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {(order as Order & { services?: { name: string } }).services?.name || 'Layanan'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(order.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-primary-700">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </p>
                    <div className="flex gap-1 justify-end">
                      <LaundryStatusBadge status={order.laundry_status} />
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
