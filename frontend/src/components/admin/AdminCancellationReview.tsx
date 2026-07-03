'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { approveOrderCancellation, rejectOrderCancellation } from '@/lib/orders';
import type { Order } from '@/types';
import { LAUNDRY_STATUS_LABELS } from '@/types';

interface AdminCancellationReviewProps {
  order: Order;
  onUpdated: () => void;
  compact?: boolean;
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  confirmClass,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCancellationReview({
  order,
  onUpdated,
  compact = false,
}: AdminCancellationReviewProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  if (order.laundry_status !== 'pembatalan_diajukan') return null;

  async function handleApprove() {
    setLoading(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await api.post<{ message: string; refund_message?: string }>(
        `/api/orders/${order.id}/approve-cancel`,
        {},
        session.access_token
      );
      setMessage(
        res.refund_message ? `${res.message}. ${res.refund_message}` : res.message
      );
      setConfirmAction(null);
      onUpdated();
    } catch (apiErr) {
      try {
        const res = await approveOrderCancellation(supabase, order.id);
        setMessage(
          res.refund_message ? `${res.message}. ${res.refund_message}` : res.message
        );
        setConfirmAction(null);
        onUpdated();
      } catch (fallbackErr) {
        setMessage(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : apiErr instanceof Error
              ? apiErr.message
              : 'Gagal menyetujui pembatalan'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await api.post<{ message: string }>(
        `/api/orders/${order.id}/reject-cancel`,
        {},
        session.access_token
      );
      setMessage(res.message);
      setConfirmAction(null);
      onUpdated();
    } catch (apiErr) {
      try {
        const res = await rejectOrderCancellation(supabase, order.id);
        setMessage(res.message);
        setConfirmAction(null);
        onUpdated();
      } catch (fallbackErr) {
        setMessage(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : apiErr instanceof Error
              ? apiErr.message
              : 'Gagal menolak pembatalan'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const restoreLabel = order.status_before_cancel
    ? LAUNDRY_STATUS_LABELS[order.status_before_cancel]
    : 'Menunggu';

  return (
    <>
      <div className={`bg-orange-50 border border-orange-200 rounded-xl ${compact ? 'p-4' : 'p-6'}`}>
        <h3 className="font-semibold text-orange-900">
          Tinjau Pengajuan Pembatalan
        </h3>
        <p className="text-sm text-orange-800 mt-1">
          Pelanggan: <strong>{order.profiles?.full_name || '-'}</strong>
          {order.status_before_cancel && (
            <> · Status sebelumnya: <strong>{restoreLabel}</strong></>
          )}
        </p>
        {order.cancellation_reason && (
          <p className="text-sm text-orange-700 mt-3 bg-white/60 p-3 rounded-lg">
            <span className="font-medium">Alasan pelanggan:</span> {order.cancellation_reason}
          </p>
        )}

        {message && (
          <p className="text-sm text-blue-700 mt-3 bg-blue-50 p-2 rounded-lg">{message}</p>
        )}

        <div className={`flex gap-3 ${compact ? 'mt-3' : 'mt-4'}`}>
          <button
            type="button"
            onClick={() => setConfirmAction('approve')}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            ✓ Setujui Pembatalan
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('reject')}
            disabled={loading}
            className="flex-1 bg-white border border-orange-300 text-orange-800 py-2.5 rounded-lg font-medium hover:bg-orange-100 disabled:opacity-50 text-sm"
          >
            ✗ Tolak Pembatalan
          </button>
        </div>
        <p className="text-xs text-orange-600 mt-2">
          Setujui → pesanan dibatalkan{order.payment_status === 'paid' ? ' + refund jika Midtrans' : ''}.
          Tolak → status kembali ke {restoreLabel}.
        </p>
      </div>

      <ConfirmModal
        open={confirmAction === 'approve'}
        title="Setujui Pembatalan?"
        description={`Pesanan akan dibatalkan permanen. ${
          order.payment_method === 'midtrans' && order.payment_status === 'paid'
            ? 'Refund Midtrans akan dicoba otomatis.'
            : 'Tidak ada refund otomatis untuk pembayaran tunai.'
        }`}
        confirmLabel="Ya, Setujui"
        confirmClass="bg-red-600 hover:bg-red-700"
        loading={loading}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        open={confirmAction === 'reject'}
        title="Tolak Pengajuan Pembatalan?"
        description={`Pesanan akan dilanjutkan dengan status "${restoreLabel}".`}
        confirmLabel="Ya, Tolak"
        confirmClass="bg-orange-600 hover:bg-orange-700"
        loading={loading}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReject}
      />
    </>
  );
}
