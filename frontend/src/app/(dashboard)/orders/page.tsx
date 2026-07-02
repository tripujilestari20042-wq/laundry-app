import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LAUNDRY_STATUS_LABELS, PAYMENT_STATUS_LABELS, type Order } from '@/types';

export default async function OrdersListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: ordersData } = await supabase
    .from('orders')
    .select('*, services(name, price_unit)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  const orders = (ordersData ?? []) as (Order & { services: { name: string; price_unit: string } | null })[];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Saya</h1>
          <p className="text-gray-500 mt-1">Riwayat dan status pesanan laundry</p>
        </div>
        <Link
          href="/orders/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
        >
          + Pesan Baru
        </Link>
      </div>

      {!orders?.length ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          <p>Belum ada pesanan.</p>
          <Link href="/orders/new" className="text-primary-600 hover:underline mt-2 inline-block">
            Buat pesanan pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.services?.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleString('id-ID')}
                    {order.is_pickup_delivery && ' · 🚚 Antar-Jemput'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.laundry_status === 'pembatalan_diajukan'
                      ? 'bg-orange-50 text-orange-700'
                      : order.laundry_status === 'cancelled'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                  }`}>
                    {LAUNDRY_STATUS_LABELS[order.laundry_status]}
                  </span>
                  <p className="font-bold text-gray-900 mt-2">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </p>
                  <p className={`text-xs mt-1 ${
                    order.payment_status === 'paid' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
