import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultStoreFromEnv, fetchStoreSettings } from '@/lib/catalog';
import { calculateDeliveryFee, calculateOrderTotal } from '@/lib/distance';
import type { OrderCalculation, PaymentMethod } from '@/types';

export interface CalculateOrderInput {
  service_id: string;
  weight_qty: number;
  is_pickup_delivery: boolean;
  pickup_lat?: number;
  pickup_lng?: number;
}

export interface CreateOrderInput {
  service_id: string;
  weight_qty: number;
  is_pickup_delivery: boolean;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address?: string;
  notes?: string;
  payment_method: PaymentMethod;
  payment_channel?: string;
}

async function getStoreForOrder(supabase: SupabaseClient) {
  const fromDb = await fetchStoreSettings(supabase);
  return fromDb ?? defaultStoreFromEnv();
}

export async function calculateOrderPricing(
  supabase: SupabaseClient,
  input: CalculateOrderInput
): Promise<OrderCalculation & { fee_per_km: number }> {
  if (!input.service_id || !(input.weight_qty > 0)) {
    throw new Error('Layanan dan jumlah harus diisi dengan benar');
  }

  const store = await getStoreForOrder(supabase);
  const { data: service, error } = await supabase
    .from('services')
    .select('price')
    .eq('id', input.service_id)
    .eq('is_active', true)
    .single();

  if (error || !service) {
    throw new Error('Layanan tidak ditemukan');
  }

  let deliveryFee = 0;
  let distanceKm = 0;
  const feePerKm = store.delivery_fee_per_km ?? 2000;

  if (input.is_pickup_delivery && input.pickup_lat != null && input.pickup_lng != null) {
    const result = calculateDeliveryFee(
      { lat: store.lat, lng: store.lng },
      { lat: input.pickup_lat, lng: input.pickup_lng },
      feePerKm
    );
    deliveryFee = result.deliveryFee;
    distanceKm = result.distanceKm;
  }

  const { serviceCost, totalAmount } = calculateOrderTotal(
    Number(service.price),
    input.weight_qty,
    deliveryFee
  );

  return {
    service_cost: serviceCost,
    delivery_fee: deliveryFee,
    total_amount: totalAmount,
    distance_km: distanceKm,
    fee_per_km: feePerKm,
  };
}

export async function createCustomerOrder(
  supabase: SupabaseClient,
  customerId: string,
  input: CreateOrderInput
) {
  if (!input.service_id || !(input.weight_qty > 0)) {
    throw new Error('Layanan dan jumlah harus diisi dengan benar');
  }

  if (input.is_pickup_delivery && (input.pickup_lat == null || input.pickup_lng == null)) {
    throw new Error('Koordinat lokasi jemput diperlukan untuk antar-jemput');
  }

  const store = await getStoreForOrder(supabase);
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('price')
    .eq('id', input.service_id)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) {
    throw new Error('Layanan tidak ditemukan');
  }

  let deliveryFee = 0;
  let distanceKm: number | null = null;
  const feePerKm = store.delivery_fee_per_km ?? 2000;

  if (input.is_pickup_delivery && input.pickup_lat != null && input.pickup_lng != null) {
    const result = calculateDeliveryFee(
      { lat: store.lat, lng: store.lng },
      { lat: input.pickup_lat, lng: input.pickup_lng },
      feePerKm
    );
    deliveryFee = result.deliveryFee;
    distanceKm = result.distanceKm;
  }

  const { serviceCost, totalAmount } = calculateOrderTotal(
    Number(service.price),
    input.weight_qty,
    deliveryFee
  );

  const paymentStatus = input.payment_method === 'cash' ? 'pending' : 'unpaid';

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      service_id: input.service_id,
      weight_qty: input.weight_qty,
      service_cost: serviceCost,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      payment_method: input.payment_method,
      payment_channel:
        input.payment_channel ?? (input.payment_method === 'cash' ? 'cash' : 'midtrans'),
      is_pickup_delivery: input.is_pickup_delivery,
      pickup_lat: input.pickup_lat ?? null,
      pickup_lng: input.pickup_lng ?? null,
      pickup_address: input.pickup_address ?? null,
      delivery_lat: input.delivery_lat ?? input.pickup_lat ?? null,
      delivery_lng: input.delivery_lng ?? input.pickup_lng ?? null,
      delivery_address: input.delivery_address ?? input.pickup_address ?? null,
      distance_km: distanceKm,
      notes: input.notes ?? null,
    })
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

const CANCELLABLE_STATUSES = ['pending', 'pickup'] as const;

export async function requestOrderCancellation(
  supabase: SupabaseClient,
  customerId: string,
  orderId: string,
  reason: string
) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 5) {
    throw new Error('Alasan minimal 5 karakter');
  }
  if (trimmedReason.length > 500) {
    throw new Error('Alasan maksimal 500 karakter');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Pesanan tidak ditemukan');
  }

  const status = existing.laundry_status as string;

  if (status === 'pembatalan_diajukan') {
    throw new Error('Pengajuan pembatalan sudah dikirim');
  }

  if (!CANCELLABLE_STATUSES.includes(status as (typeof CANCELLABLE_STATUSES)[number])) {
    throw new Error('Pembatalan hanya bisa diajukan saat pesanan masih menunggu atau diambil kurir');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: 'pembatalan_diajukan',
      cancellation_reason: trimmedReason,
      status_before_cancel: existing.laundry_status,
    })
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .select(`
      *,
      services (id, name, price, price_unit),
      profiles (id, full_name, email, phone)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

const ORDER_SELECT = `
  *,
  services (id, name, price, price_unit),
  profiles (id, full_name, email, phone)
`;

const ORDER_DETAIL_SELECT = `
  *,
  services (id, name, price, price_unit),
  profiles (id, full_name, email, phone),
  tracking_status (id, status, notes, created_at)
`;

export async function listOrders(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  statusFilter?: string
) {
  let query = supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('customer_id', userId);
  }

  if (statusFilter) {
    query = query.eq('laundry_status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getOrderById(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  orderId: string
) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    throw new Error('Pesanan tidak ditemukan');
  }

  if (!isAdmin && data.customer_id !== userId) {
    throw new Error('Akses ditolak');
  }

  return data;
}

export async function approveOrderCancellation(
  supabase: SupabaseClient,
  orderId: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Pesanan tidak ditemukan');
  }

  if (existing.laundry_status !== 'pembatalan_diajukan') {
    throw new Error('Pesanan tidak dalam status pengajuan pembatalan');
  }

  let paymentStatus = existing.payment_status;
  let refundMessage: string | null = null;

  if (existing.payment_status === 'paid') {
    paymentStatus = 'refunded';
    if (existing.payment_method === 'midtrans' && existing.midtrans_order_id) {
      refundMessage =
        'Pembayaran ditandai refunded — proses refund Midtrans via dashboard Midtrans jika diperlukan';
    } else {
      refundMessage = 'Pembayaran ditandai refunded — proses pengembalian manual jika diperlukan';
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: 'cancelled',
      payment_status: paymentStatus,
      status_before_cancel: null,
    })
    .eq('id', orderId)
    .select(ORDER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    data,
    message: 'Pembatalan disetujui',
    refund_message: refundMessage,
  };
}

export async function rejectOrderCancellation(
  supabase: SupabaseClient,
  orderId: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Pesanan tidak ditemukan');
  }

  if (existing.laundry_status !== 'pembatalan_diajukan') {
    throw new Error('Pesanan tidak dalam status pengajuan pembatalan');
  }

  const restoreStatus = existing.status_before_cancel || 'pending';

  const { data, error } = await supabase
    .from('orders')
    .update({
      laundry_status: restoreStatus,
      cancellation_reason: null,
      status_before_cancel: null,
    })
    .eq('id', orderId)
    .select(ORDER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    data,
    message: `Pengajuan pembatalan ditolak. Status kembali ke ${restoreStatus}.`,
  };
}
