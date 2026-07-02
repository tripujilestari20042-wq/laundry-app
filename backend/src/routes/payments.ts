import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import {
  createSnapToken,
  getMidtransClientKey,
  getSnapScriptUrl,
  isMidtransConfigured,
  isPaymentSuccess,
  verifyMidtransSignature,
  type MidtransNotification,
} from '../lib/midtrans';

const router = Router();

function buildMidtransOrderId(orderUuid: string): string {
  const short = orderUuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LND-${short}-${Date.now()}`;
}

/** GET /api/payments/config — Midtrans client key for frontend */
router.get('/config', authenticate, (_req: Request, res: Response) => {
  res.json({
    data: {
      enabled: isMidtransConfigured(),
      client_key: getMidtransClientKey(),
      snap_script_url: getSnapScriptUrl(),
      is_production: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    },
  });
});

/** POST /api/payments/snap-token/:orderId — Create Midtrans Snap token */
router.post('/snap-token/:orderId', authenticate, async (req: Request, res: Response) => {
  if (!isMidtransConfigured()) {
    res.status(503).json({
      error: 'Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di backend/.env',
    });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email, phone)')
    .eq('id', req.params.orderId)
    .single();

  if (error || !order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (req.auth!.role !== 'admin' && order.customer_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Akses ditolak' });
    return;
  }

  if (order.payment_method !== 'midtrans') {
    res.status(400).json({ error: 'Pesanan ini bukan metode pembayaran online' });
    return;
  }

  if (order.payment_status === 'paid') {
    res.status(400).json({ error: 'Pesanan sudah dibayar' });
    return;
  }

  const midtransOrderId = order.midtrans_order_id || buildMidtransOrderId(order.id);
  const profile = order.profiles as { full_name: string; email: string; phone: string | null } | null;

  try {
    const snap = await createSnapToken({
      orderId: midtransOrderId,
      grossAmount: Number(order.total_amount),
      customerEmail: profile?.email || req.auth!.email,
      customerName: profile?.full_name || 'Pelanggan',
      customerPhone: profile?.phone || undefined,
    });

    await supabase
      .from('orders')
      .update({
        midtrans_order_id: midtransOrderId,
        snap_token: snap.token,
      })
      .eq('id', order.id);

    res.json({
      data: {
        snap_token: snap.token,
        client_key: getMidtransClientKey(),
        snap_script_url: getSnapScriptUrl(),
        midtrans_order_id: midtransOrderId,
      },
    });
  } catch (err) {
    console.error('[payments] snap-token error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Gagal membuat token pembayaran',
    });
  }
});

/** POST /api/payments/webhook — Midtrans notification handler */
router.post('/webhook', async (req: Request, res: Response) => {
  const notification = req.body as MidtransNotification;

  if (!notification.order_id || !notification.transaction_status) {
    res.status(400).json({ error: 'Invalid notification' });
    return;
  }

  if (!verifyMidtransSignature(notification)) {
    console.error('[payments] Invalid Midtrans signature for', notification.order_id);
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('midtrans_order_id', notification.order_id)
    .maybeSingle();

  if (error || !order) {
    console.warn('[payments] Order not found for midtrans id:', notification.order_id);
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const success = isPaymentSuccess(
    notification.transaction_status,
    notification.fraud_status
  );

  const pending = ['pending', 'capture'].includes(notification.transaction_status);
  const failed = ['deny', 'cancel', 'expire', 'failure'].includes(notification.transaction_status);

  let paymentStatus = order.payment_status;
  let paidAt: string | null = order.paid_at;

  if (success) {
    paymentStatus = 'paid';
    paidAt = new Date().toISOString();
  } else if (pending && notification.transaction_status === 'pending') {
    paymentStatus = 'pending';
  } else if (failed) {
    paymentStatus = 'unpaid';
  }

  await supabase
    .from('orders')
    .update({ payment_status: paymentStatus, paid_at: paidAt })
    .eq('id', order.id);

  console.log(`[payments] Webhook ${notification.order_id}: ${notification.transaction_status} → ${paymentStatus}`);
  res.json({ status: 'ok' });
});

export default router;
