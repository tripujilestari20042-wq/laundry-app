export type UserRole = 'admin' | 'pelanggan';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
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
  created_at: string;
  updated_at: string;
}

export interface TrackingStatus {
  id: string;
  order_id: string;
  status: LaundryStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderWithRelations extends Order {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
  services?: Pick<Service, 'id' | 'name' | 'price' | 'price_unit'>;
  tracking_status?: TrackingStatus[];
}

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  role: UserRole;
}

type TableDef<T, I = Partial<T>, U = Partial<T>> = {
  Row: T;
  Insert: I;
  Update: U;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        { id: string; email: string; role?: UserRole; full_name?: string | null; phone?: string | null; avatar_url?: string | null },
        Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      >;
      services: TableDef<
        Service,
        { name: string; price: number; description?: string | null; price_unit?: PriceUnit; image_url?: string | null; is_active?: boolean },
        Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>
      >;
      orders: TableDef<
        Order,
        {
          customer_id: string;
          service_id: string;
          weight_qty: number;
          service_cost: number;
          total_amount: number;
          delivery_fee?: number;
          payment_status?: PaymentStatus;
          laundry_status?: LaundryStatus;
          is_pickup_delivery?: boolean;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_address?: string | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_address?: string | null;
          distance_km?: number | null;
          notes?: string | null;
        },
        Partial<Pick<Order, 'payment_status' | 'laundry_status' | 'notes'>>
      >;
      tracking_status: TableDef<
        TrackingStatus,
        { order_id: string; status: LaundryStatus; notes?: string | null; created_by?: string | null },
        Partial<Pick<TrackingStatus, 'status' | 'notes'>>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      payment_status: PaymentStatus;
      laundry_status: LaundryStatus;
      price_unit: PriceUnit;
    };
    CompositeTypes: Record<string, never>;
  };
}
