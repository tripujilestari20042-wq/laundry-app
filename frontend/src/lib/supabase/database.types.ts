export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'pelanggan';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type LaundryStatus =
  | 'pending'
  | 'pickup'
  | 'processing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled';
export type PriceUnit = 'kg' | 'pcs' | 'set';

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
        {
          id: string;
          email: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        },
        { id: string; email: string; role?: UserRole; full_name?: string | null; phone?: string | null; avatar_url?: string | null },
        { email?: string; role?: UserRole; full_name?: string | null; phone?: string | null; avatar_url?: string | null }
      >;
      services: TableDef<
        {
          id: string;
          name: string;
          description: string | null;
          price: number;
          price_unit: PriceUnit;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        { name: string; price: number; description?: string | null; price_unit?: PriceUnit; image_url?: string | null; is_active?: boolean },
        { name?: string; description?: string | null; price?: number; price_unit?: PriceUnit; image_url?: string | null; is_active?: boolean }
      >;
      orders: TableDef<
        {
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
        },
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
        { payment_status?: PaymentStatus; laundry_status?: LaundryStatus; notes?: string | null }
      >;
      tracking_status: TableDef<
        {
          id: string;
          order_id: string;
          status: LaundryStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        },
        { order_id: string; status: LaundryStatus; notes?: string | null; created_by?: string | null },
        { status?: LaundryStatus; notes?: string | null }
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
