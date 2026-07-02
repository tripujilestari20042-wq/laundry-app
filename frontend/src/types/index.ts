export type UserRole = 'admin' | 'pelanggan';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'midtrans';
export type LaundryStatus =
  | 'pending'
  | 'pickup'
  | 'processing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'pembatalan_diajukan';
export type PriceUnit = 'kg' | 'pcs' | 'set';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: PriceUnit;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  service_id: string;
  weight_qty: number;
  service_cost: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_channel?: string | null;
  midtrans_order_id?: string | null;
  snap_token?: string | null;
  paid_at?: string | null;
  laundry_status: LaundryStatus;
  is_pickup_delivery: boolean;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_address: string | null;
  distance_km: number | null;
  notes: string | null;
  cancellation_reason?: string | null;
  status_before_cancel?: LaundryStatus | null;
  created_at: string;
  updated_at: string;
  services?: Pick<Service, 'id' | 'name' | 'price' | 'price_unit'>;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
  tracking_status?: TrackingStatus[];
}

export interface TrackingStatus {
  id: string;
  order_id: string;
  status: LaundryStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'new_order' | 'order_completed';
  title: string;
  message: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface StoreConfig {
  lat: number;
  lng: number;
  address: string;
  delivery_fee_per_km: number;
}

export interface OrderCalculation {
  service_cost: number;
  delivery_fee: number;
  total_amount: number;
  distance_km: number;
  fee_per_km: number;
}

export const LAUNDRY_STATUS_LABELS: Record<LaundryStatus, string> = {
  pending: 'Menunggu',
  pickup: 'Diambil Kurir',
  processing: 'Sedang Diproses',
  ready: 'Siap Diambil',
  delivering: 'Diantar Kurir',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  pembatalan_diajukan: 'Pengajuan Pembatalan',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Belum Bayar',
  pending: 'Pending (Tunai)',
  paid: 'Lunas',
  refunded: 'Dikembalikan',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai (Bayar di Tempat)',
  midtrans: 'E-Wallet & Transfer Bank',
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  kg: 'kg',
  pcs: 'pcs',
  set: 'set',
};
