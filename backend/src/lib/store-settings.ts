import { config } from '../config';
import { getSupabaseAdmin } from './supabase';

export interface StoreSettings {
  lat: number;
  lng: number;
  address: string;
  delivery_fee_per_km: number;
  updated_at?: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  lat: config.laundry.lat,
  lng: config.laundry.lng,
  address: config.laundry.address,
  delivery_fee_per_km: config.delivery.feePerKm,
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_settings')
    .select('lat, lng, address, delivery_fee_per_km, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  return {
    lat: Number(data.lat),
    lng: Number(data.lng),
    address: data.address,
    delivery_fee_per_km: Number(data.delivery_fee_per_km),
    updated_at: data.updated_at,
  };
}

export async function updateStoreSettings(
  settings: Omit<StoreSettings, 'updated_at'>,
  updatedBy: string
): Promise<StoreSettings> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_settings')
    .upsert(
      {
        id: 1,
        lat: settings.lat,
        lng: settings.lng,
        address: settings.address,
        delivery_fee_per_km: settings.delivery_fee_per_km,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('lat, lng, address, delivery_fee_per_km, updated_at')
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan lokasi toko: ${error.message}`);
  }

  return {
    lat: Number(data.lat),
    lng: Number(data.lng),
    address: data.address,
    delivery_fee_per_km: Number(data.delivery_fee_per_km),
    updated_at: data.updated_at,
  };
}
