'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { requestOrderCancellation } from '@/lib/orders';
import { openMidtransSnap } from '@/lib/payments/midtrans';
import AdminCancellationReview from '@/components/admin/AdminCancellationReview';
import CancelRequestModal from '@/components/orders/CancelRequestModal';
import { LaundryStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge';
import type { Order, LaundryStatus, UserRole } from '@/types';
import { LAUNDRY_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types';
import { ArrowLeft, Banknote, CheckCircle2, Loader2, MapPin } from 'lucide-react';

const CANCELLABLE: LaundryStatus[] = ['pending', 'pickup'];

function OrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const orderId = params.id as string;
  const pathname = usePathname();

  const [order, setOrder] = useState<Order | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('pelanggan');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const paymentNotice = searchParams.get('payment');

  useEffect(() => {
    if (paymentNotice === 'success') {
      setMessage('Pembayaran berhasil! Terima kasih.');
    } else if (paymentNotice === 'pending') {
      setMessage('Pembayaran pending — menunggu konfirmasi.');
    } else if (paymentNotice === 'cancelled') {
      setMessage('Pembayaran dibatalkan. Anda bisa bayar ulang di bawah.');
    }
  }, [paymentNotice]);

  async function fetchOrder() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await api.get<{ data: Order }>(`/api/orders/${orderId}`, session.access_token);
      setOrder(res.data);
    } catch {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (id, name, price, price_unit),
          tracking_status (id, status, notes, created_at)
        `)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        setOrder(null);
      } else {
        setOrder(data as Order);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data?.role) setUserRole(data.role as UserRole);
    }
    loadRole();
    fetchOrder();
  }, [orderId, supabase]);

  async function handlePayOnline() {
    if (!order) return;
    setPaying(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const snapRes = await api.post<{
        data: { snap_token: string; snap_script_url: string; client_key: string };
      }>(`/api/payments/snap-token/${order.id}`, {}, session.access_token);

      const result = await openMidtransSnap(snapRes.data.snap_token, {
        snap_script_url: snapRes.data.snap_script_url,
        client_key: snapRes.data.client_key,
      });

      if (result === 'success' || result === 'pending') {
        setMessage('Pembayaran diproses. Memperbarui status...');
        await fetchOrder();
        router.replace(`/orders/${order.id}?payment=${result}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal membuka pembayaran');
    } finally {
      setPaying(false);
    }
  }

  async function handleRequestCancel(reason: string) {
    setCancelling(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCancelling(false);
      return;
    }

    const successMessage =
      'Pengajuan pembatalan berhasil dikirim. Menunggu persetujuan admin.';

    try {
      const res = await api.post<{ message: string }>(
        `/api/orders/${orderId}/request-cancel`,
        { reason },
        session.access_token
      );
      setMessage(res.message || successMessage);
      setShowCancelModal(false);
      await fetchOrder();
    } catch (apiErr) {
      try {
        await requestOrderCancellation(supabase, session.user.id, orderId, reason);
        setMessage(successMessage);
        setShowCancelModal(false);
        await fetchOrder();
      } catch (fallbackErr) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : apiErr instanceof Error
              ? apiErr.message
              : 'Gagal mengajukan pembatalan';
        setMessage(msg);
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleCompleteCash() {
    if (!order) return;
    setCompleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await api.post<{ message: string }>(
        `/api/orders/${orderId}/complete-cash`,
        {},
        session.access_token
      );
      setMessage(res.message);
      await fetchOrder();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menyelesaikan pesanan');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat pesanan...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pesanan tidak ditemukan</p>
        <Link href="/orders" className="text-primary-600 hover:underline mt-2 inline-block">
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const canRequestCancel = userRole === 'pelanggan' && CANCELLABLE.includes(order.laundry_status);
  const isAdmin = userRole === 'admin';
  const backHref = pathname.startsWith('/admin/orders')
    ? '/admin/orders'
    : isAdmin
      ? '/admin/orders'
      : '/orders';

  const canCompleteCash =
    isAdmin &&
    order.payment_method === 'cash' &&
    order.laundry_status !== 'cancelled' &&
    order.laundry_status !== 'completed';

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 mb-2">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Detail Pesanan</h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">#{order.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LaundryStatusBadge status={order.laundry_status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      {message && (
        <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-sm">
          {message}
        </div>
      )}

      {order.laundry_status === 'pembatalan_diajukan' && !isAdmin && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
          ⏳ Pengajuan pembatalan sedang ditinjau admin.
          {order.cancellation_reason && (
            <p className="mt-1 text-orange-700">Alasan: {order.cancellation_reason}</p>
          )}
        </div>
      )}

      {isAdmin && order.laundry_status === 'pembatalan_diajukan' && (
        <AdminCancellationReview order={order} onUpdated={fetchOrder} />
      )}

      {order.laundry_status === 'pembatalan_diajukan' && isAdmin && order.profiles && (
        <div className="text-sm text-gray-500">
          Pelanggan: {order.profiles.full_name} · {order.profiles.email}
        </div>
      )}

      {order.laundry_status === 'cancelled' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          Pesanan ini telah dibatalkan.
          {order.cancellation_reason && (
            <p className="mt-1">Alasan: {order.cancellation_reason}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Layanan</p>
            <p className="font-semibold text-slate-900">{order.services?.name || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Berat / Qty</p>
            <p className="font-semibold">{order.weight_qty}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Metode Bayar</p>
            <p className="font-semibold">
              {order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : '-'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Total</p>
            <p className="font-bold text-xl text-primary-700">
              Rp {order.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {order.is_pickup_delivery && order.pickup_address && (
          <div className="pt-5 border-t border-slate-100 flex items-start gap-3 text-sm">
            <MapPin className="w-5 h-5 text-primary-500 shrink-0" />
            <div>
              <p className="text-slate-500">Alamat Jemput/Antar</p>
              <p className="font-medium text-slate-900 mt-0.5">{order.pickup_address}</p>
              {order.pickup_lat && order.pickup_lng && (
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {order.pickup_lat.toFixed(5)}, {order.pickup_lng.toFixed(5)}
                  {order.distance_km && ` · ${order.distance_km} km`}
                </p>
              )}
            </div>
          </div>
        )}

        {order.notes && (
          <div className="pt-5 border-t border-slate-100 text-sm">
            <p className="text-slate-500">Catatan</p>
            <p className="mt-0.5">{order.notes}</p>
          </div>
        )}
      </div>

      {canCompleteCash && (
        <button
          type="button"
          onClick={handleCompleteCash}
          disabled={completing}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50 transition-all"
        >
          {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {completing ? 'Memproses...' : 'Selesaikan Pesanan & Terima Pembayaran'}
        </button>
      )}

      {canRequestCancel && (
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="w-full border-2 border-rose-200 text-rose-600 py-3 rounded-xl font-semibold hover:bg-rose-50 transition-colors"
        >
          Ajukan Pembatalan
        </button>
      )}

      {order.payment_method === 'midtrans' &&
        order.payment_status !== 'paid' &&
        order.laundry_status !== 'cancelled' &&
        order.laundry_status !== 'pembatalan_diajukan' && (
          <button
            onClick={handlePayOnline}
            disabled={paying}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {paying ? 'Membuka pembayaran...' : '💳 Bayar Sekarang via Midtrans'}
          </button>
        )}

      {order.payment_method === 'cash' && order.payment_status === 'pending' && !isAdmin && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <Banknote className="w-5 h-5 shrink-0" />
          Pembayaran tunai — bayar ke kurir saat jemput/antar laundry.
        </div>
      )}

      {order.tracking_status && order.tracking_status.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold mb-4">Timeline Status</h2>
          <div className="space-y-3">
            {[...order.tracking_status]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((t) => (
                <div key={t.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{LAUNDRY_STATUS_LABELS[t.status]}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(t.created_at).toLocaleString('id-ID')}
                      {t.notes && ` · ${t.notes}`}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <CancelRequestModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleRequestCancel}
        loading={cancelling}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Memuat...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
