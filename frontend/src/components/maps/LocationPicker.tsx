'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import AddressSearchInput from './AddressSearchInput';
import { createClient } from '@/lib/supabase/client';
import { fetchStoreSettings, defaultStoreFromEnv } from '@/lib/catalog';
import { api } from '@/lib/api';
import type { Coordinates } from './MapPicker';
import type { GeocodingResult } from '@/lib/geocoding/nominatim';

const MapPicker = dynamic(() => import('@/components/maps/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-72 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">
      Memuat peta...
    </div>
  ),
});

interface LocationPickerProps {
  searchLabel: string;
  mapHint?: string;
  address: string;
  onAddressChange: (address: string) => void;
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  storeLocation?: Coordinates;
  showStore?: boolean;
  customerLabel?: string;
  required?: boolean;
}

export interface StoreLocationData {
  lat: number;
  lng: number;
  address: string;
  delivery_fee_per_km?: number;
}

export default function LocationPicker({
  searchLabel,
  mapHint = 'Pin akan berpindah otomatis saat Anda memilih alamat dari hasil pencarian',
  address,
  onAddressChange,
  value,
  onChange,
  storeLocation,
  showStore = true,
  customerLabel = 'Lokasi Jemput/Antar',
  required = false,
}: LocationPickerProps) {
  const defaultLat = parseFloat(process.env.NEXT_PUBLIC_LAUNDRY_LAT || '-6.2088');
  const defaultLng = parseFloat(process.env.NEXT_PUBLIC_LAUNDRY_LNG || '106.8456');
  const store = storeLocation || { lat: defaultLat, lng: defaultLng };

  function handleSelect(result: GeocodingResult) {
    onAddressChange(result.address);
    onChange({ lat: result.lat, lng: result.lng });
  }

  return (
    <div className="space-y-4">
      <AddressSearchInput
        label={searchLabel}
        value={address}
        onChange={onAddressChange}
        onSelect={handleSelect}
        required={required}
      />

      <div>
        <MapPicker
          center={value || store}
          marker={value}
          storeMarker={showStore ? store : undefined}
          readOnly
          showStore={showStore}
          customerLabel={customerLabel}
        />
        {value ? (
          <p className="text-xs text-gray-500 mt-2">
            {mapHint} · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-2">{mapHint}</p>
        )}
      </div>
    </div>
  );
}

export function useStoreLocation(initialStore?: StoreLocationData | null) {
  const supabase = createClient();
  const hasInitial = initialStore != null;
  const [store, setStore] = useState<StoreLocationData | null>(initialStore ?? null);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fromDb = await fetchStoreSettings(supabase);
      if (fromDb) {
        setStore(fromDb);
        return;
      }

      try {
        const json = await api.get<{ data: StoreLocationData }>('/api/config/store');
        setStore(json.data);
      } catch {
        setStore(defaultStoreFromEnv());
      }
    } catch (err) {
      setStore(defaultStoreFromEnv());
      setError(err instanceof Error ? err.message : 'Gagal memuat lokasi toko');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (hasInitial) return;
    fetchStore();
  }, [hasInitial, fetchStore]);

  return {
    store: store ?? defaultStoreFromEnv(),
    loading,
    error,
    retry: fetchStore,
  };
}

/** Banner peringatan koneksi backend — dipakai di halaman yang butuh data toko */
export function StoreLocationStatus({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        Memuat lokasi laundry...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <div className="flex items-start gap-2 flex-1 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat data toko</p>
            <p className="text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 font-medium hover:bg-amber-100 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return null;
}

export type { Coordinates };
