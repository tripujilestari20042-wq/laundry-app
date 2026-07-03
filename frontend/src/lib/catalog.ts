import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreLocationData } from '@/components/maps/LocationPicker';
import type { Service } from '@/types';

export async function fetchActiveServices(supabase: SupabaseClient): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Service[];
}

export async function fetchStoreSettings(
  supabase: SupabaseClient
): Promise<StoreLocationData | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('lat, lng, address, delivery_fee_per_km')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    lat: Number(data.lat),
    lng: Number(data.lng),
    address: data.address,
    delivery_fee_per_km: Number(data.delivery_fee_per_km),
  };
}

export function defaultStoreFromEnv(): StoreLocationData {
  return {
    lat: parseFloat(process.env.NEXT_PUBLIC_LAUNDRY_LAT || '-6.2088'),
    lng: parseFloat(process.env.NEXT_PUBLIC_LAUNDRY_LNG || '106.8456'),
    address: process.env.NEXT_PUBLIC_LAUNDRY_ADDRESS || 'Jl. Contoh No. 123, Jakarta',
    delivery_fee_per_km: 2000,
  };
}
