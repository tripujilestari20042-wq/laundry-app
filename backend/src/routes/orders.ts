import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { getStoreSettings } from '../lib/store-settings';
import { calculateDeliveryFee, calculateOrderTotal } from '../utils/distance';
import { refundMidtransTransaction } from '../lib/midtrans';
import { notifyNewOrder, notifyOrderCompleted } from '../lib/notifications';

const router = Router();

const createOrderSchema = z.object({
  service_id: z.string().uuid(),
  weight_qty: z.number().positive(),
  is_pickup_delivery: z.boolean().default(false),
  pickup_lat: z.number().optional(),
  pickup_lng: z.number().optional(),
  pickup_address: z.string().optional(),
  delivery_lat: z.number().optional(),
  delivery_lng: z.number().optional(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(['cash', 'midtrans']).default('cash'),
  payment_channel: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  laundry_status: z.enum([
    'pending', 'pickup', 'processing', 'ready', 'delivering', 'completed', 'cancelled',
    'pembatalan_diajukan',
  ]).optional(),
  payment_status: z.enum(['unpaid', 'pending', 'paid', 'refunded']).optional(),
  notes: z.string().optional(),
});

const requestCancelSchema = z.object({
  reason: z.string().min(5, 'Alasan minimal 5 karakter').max(500),
});

const CANCELLABLE_STATUSES = ['pending', 'pickup'] as const;

/** POST /api/orders/calculate — Preview pricing before order */
router.post('/calculate', authenticate, async (req: Request, res: Response) => {
  const { service_id, weight_qty, is_pickup_delivery, pickup_lat, pickup_lng } = req.body;

  const store = await getStoreSettings();
  const supabase = getSupabaseAdmin();
  const { data: service, error } = await supabase
    .from('services')
    .select('price')
    .eq('id', service_id)
    .eq('is_active', true)
    .single();

  if (error || !service) {
    res.status(404).json({ error: 'Layanan tidak ditemukan' });
    return;
  }

  let deliveryFee = 0;
  let distanceKm = 0;

  if (is_pickup_delivery && pickup_lat && pickup_lng) {
    const result = calculateDeliveryFee(
      { lat: store.lat, lng: store.lng },
      { lat: pickup_lat, lng: pickup_lng },
      store.delivery_fee_per_km
    );
    deliveryFee = result.deliveryFee;
    distanceKm = result.distanceKm;
  }

  const { serviceCost, totalAmount } = calculateOrderTotal(
    service.price,
    weight_qty,
    deliveryFee
  );

  res.json({
    data: {
      service_cost: serviceCost,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      distance_km: distanceKm,
      fee_per_km: store.delivery_fee_per_km,
    },
  });
});

/** POST /api/orders — Create order (Pelanggan) */
router.post('/', authenticate, requireRole('pelanggan', 'admin'), async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const {
    service_id, weight_qty, is_pickup_delivery,
    pickup_lat, pickup_lng, pickup_address,
    delivery_lat, delivery_lng, delivery_address, notes,
    payment_method, payment_channel,
  } = parsed.data;

  const store = await getStoreSettings();
  const supabase = getSupabaseAdmin();
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('price')
    .eq('id', service_id)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) {
    res.status(404).json({ error: 'Layanan tidak ditemukan' });
    return;
  }

  let deliveryFee = 0;
  let distanceKm: number | null = null;

  if (is_pickup_delivery) {
    if (!pickup_lat || !pickup_lng) {
      res.status(400).json({ error: 'Koordinat lokasi jemput diperlukan untuk antar-jemput' });
      return;
    }
    const result = calculateDeliveryFee(
      { lat: store.lat, lng: store.lng },
      { lat: pickup_lat, lng: pickup_lng },
      store.delivery_fee_per_km
    );
    deliveryFee = result.deliveryFee;
    distanceKm = result.distanceKm;
  }

  const { serviceCost, totalAmount } = calculateOrderTotal(
    service.price,
    weight_qty,
    deliveryFee
  );

  const customerId = req.auth!.role === 'admin' && req.body.customer_id
    ? req.body.customer_id
    : req.auth!.userId;

  const paymentStatus = payment_method === 'cash' ? 'pending' : 'unpaid';

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      service_id,
      weight_qty,
      service_cost: serviceCost,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      payment_method,
      payment_channel: payment_channel ?? (payment_method === 'cash' ? 'cash' : 'midtrans'),
      is_pickup_delivery,
      pickup_lat: pickup_lat ?? null,
      pickup_lng: pickup_lng ?? null,
      pickup_address: pickup_address ?? null,
      delivery_lat: delivery_lat ?? pickup_lat ?? null,
      delivery_lng: delivery_lng ?? pickup_lng ?? null,
      delivery_address: delivery_address ?? pickup_address ?? null,
      distance_km: distanceKm,
      notes: notes ?? null,
    })
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const customerName =
    (data as { profiles?: { full_name?: string } }).profiles?.full_name || 'Pelanggan';
  await notifyNewOrder(data.id, customerName, data.total_amount);

  res.status(201).json({ data });
});

/** GET /api/orders — List orders */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const isAdmin = req.auth!.role === 'admin';
  const statusFilter = req.query.status as string | undefined;

  let query = supabase
    .from('orders')
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('customer_id', req.auth!.userId);
  }

  if (statusFilter) {
    query = query.eq('laundry_status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

/** GET /api/orders/:id — Order detail with tracking */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone),
      tracking_status (*)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (req.auth!.role !== 'admin' && data.customer_id !== req.auth!.userId) {
    res.status(403).json({ error: 'Akses ditolak' });
    return;
  }

  res.json({ data });
});

/** PATCH /api/orders/:id — Update status (Admin only) */
router.patch('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = updateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (
    parsed.data.laundry_status === 'completed' &&
    existing.laundry_status !== 'completed'
  ) {
    await notifyOrderCompleted(existing.customer_id, String(req.params.id));
  }

  res.json({ data });
});

/** POST /api/orders/:id/request-cancel — Customer ajukan pembatalan */
router.post('/:id/request-cancel', authenticate, async (req: Request, res: Response) => {
  const parsed = requestCancelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  const isOwner = existing.customer_id === req.auth!.userId;
  if (!isOwner && req.auth!.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak' });
    return;
  }

  if (!CANCELLABLE_STATUSES.includes(existing.laundry_status as typeof CANCELLABLE_STATUSES[number])) {
    res.status(400).json({
      error: 'Pembatalan hanya bisa diajukan saat pesanan masih menunggu atau diambil kurir',
    });
    return;
  }

  if (existing.laundry_status === 'pembatalan_diajukan') {
    res.status(400).json({ error: 'Pengajuan pembatalan sudah dikirim' });
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: 'pembatalan_diajukan',
      cancellation_reason: parsed.data.reason,
      status_before_cancel: existing.laundry_status,
    })
    .eq('id', req.params.id)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data, message: 'Pengajuan pembatalan berhasil dikirim. Menunggu persetujuan admin.' });
});

/** POST /api/orders/:id/approve-cancel — Admin setujui pembatalan */
router.post('/:id/approve-cancel', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (existing.laundry_status !== 'pembatalan_diajukan') {
    res.status(400).json({ error: 'Pesanan tidak dalam status pengajuan pembatalan' });
    return;
  }

  let refundMessage: string | null = null;
  let paymentStatus = existing.payment_status;

  if (
    existing.payment_method === 'midtrans' &&
    existing.payment_status === 'paid' &&
    existing.midtrans_order_id
  ) {
    const refund = await refundMidtransTransaction(
      existing.midtrans_order_id,
      Number(existing.total_amount),
      existing.cancellation_reason || 'Pembatalan pesanan'
    );
    refundMessage = refund.message;
    if (refund.success) {
      paymentStatus = 'refunded';
    }
  } else if (existing.payment_status === 'paid') {
    paymentStatus = 'refunded';
    refundMessage = 'Pembayaran ditandai refunded — proses pengembalian manual jika diperlukan';
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: 'cancelled',
      payment_status: paymentStatus,
      status_before_cancel: null,
    })
    .eq('id', req.params.id)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    data,
    message: 'Pembatalan disetujui',
    refund_message: refundMessage,
  });
});

/** POST /api/orders/:id/reject-cancel — Admin tolak pembatalan */
router.post('/:id/reject-cancel', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (existing.laundry_status !== 'pembatalan_diajukan') {
    res.status(400).json({ error: 'Pesanan tidak dalam status pengajuan pembatalan' });
    return;
  }

  const restoreStatus = existing.status_before_cancel || 'pending';

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: restoreStatus,
      cancellation_reason: null,
      status_before_cancel: null,
    })
    .eq('id', req.params.id)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data, message: `Pengajuan pembatalan ditolak. Status kembali ke ${restoreStatus}.` });
});

/** POST /api/orders/:id/pay — Mark cash payment as paid (admin/courier) */
router.post('/:id/pay', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  const isAdmin = req.auth!.role === 'admin';
  const isOwner = existing.customer_id === req.auth!.userId;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: 'Akses ditolak' });
    return;
  }

  if (existing.payment_status === 'paid') {
    res.status(400).json({ error: 'Pesanan sudah dibayar' });
    return;
  }

  if (existing.payment_method === 'midtrans' && !isAdmin) {
    res.status(400).json({ error: 'Pesanan online harus dibayar via Midtrans' });
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data, message: 'Pembayaran berhasil dicatat' });
});

/** POST /api/orders/:id/complete-cash — Admin: selesaikan pesanan tunai + lunas */
router.post('/:id/complete-cash', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    return;
  }

  if (existing.payment_method !== 'cash') {
    res.status(400).json({ error: 'Fitur ini hanya untuk pesanan tunai' });
    return;
  }

  if (existing.laundry_status === 'cancelled') {
    res.status(400).json({ error: 'Pesanan sudah dibatalkan' });
    return;
  }

  if (existing.laundry_status === 'completed' && existing.payment_status === 'paid') {
    res.status(400).json({ error: 'Pesanan sudah selesai dan lunas' });
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      laundry_status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone),
      tracking_status (*)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (existing.laundry_status !== 'completed') {
    await notifyOrderCompleted(existing.customer_id, String(req.params.id));
  }

  res.json({ data, message: 'Pesanan selesai dan pembayaran tunai diterima' });
});

export default router;
