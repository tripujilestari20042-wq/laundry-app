'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Save, Loader2, MapPinned } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import AddressSearchInput from '@/components/maps/AddressSearchInput';
import type { GeocodingResult } from '@/lib/geocoding/nominatim';
import type { StoreConfig } from '@/types';

const MapPicker = dynamic(() => import('@/components/maps/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400">
      Memuat peta...
    </div>
  ),
});

export default function AdminStoreLocationPage() {
  const supabase = createClient();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [feePerKm, setFeePerKm] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get<{ data: StoreConfig & { updated_at?: string } }>('/api/config/store')
      .then((res) => {
        setCoords({ lat: res.data.lat, lng: res.data.lng });
        setAddress(res.data.address);
        setFeePerKm(res.data.delivery_fee_per_km);
      })
      .catch(() => setMessage({ type: 'error', text: 'Gagal memuat lokasi toko' }))
      .finally(() => setLoading(false));
  }, []);

  function handleAddressSelect(result: GeocodingResult) {
    setAddress(result.address);
    setCoords({ lat: result.lat, lng: result.lng });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!coords || !address.trim()) {
      setMessage({ type: 'error', text: 'Cari dan pilih alamat toko terlebih dahulu' });
      return;
    }

    if (!Number.isFinite(feePerKm) || feePerKm < 500) {
      setMessage({ type: 'error', text: 'Biaya antar-jemput minimal Rp 500 per KM' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage({ type: 'error', text: 'Sesi habis, silakan login kembali' });
      setSaving(false);
      return;
    }

    try {
      await api.put(
        '/api/config/store',
        {
          lat: coords.lat,
          lng: coords.lng,
          address: address.trim(),
          delivery_fee_per_km: feePerKm,
        },
        session.access_token
      );
      setMessage({
        type: 'success',
        text: 'Pengaturan lokasi toko dan biaya antar-jemput berhasil disimpan.',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat pengaturan lokasi...
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-600">
            <MapPinned className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan Lokasi Toko</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Cari alamat — pin merah berpindah otomatis. Simpan untuk update database.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <AddressSearchInput
            label="Cari Alamat Laundry"
            value={address}
            onChange={setAddress}
            onSelect={handleAddressSelect}
            placeholder="Contoh: Jl. Sudirman No. 1, Jakarta"
            required
          />

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <MapPicker
              center={coords || { lat: -6.2088, lng: 106.8456 }}
              marker={null}
              storeMarker={coords || undefined}
              readOnly
              showStore={Boolean(coords)}
              heightClass="h-80"
              storeLabel="Lokasi Outlet Laundry"
            />
          </div>

          {coords && (
            <p className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Biaya Antar-Jemput per KM (Rp)
          </label>
          <input
            type="number"
            value={feePerKm}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) setFeePerKm(next);
            }}
            min={500}
            step={500}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <p className="text-xs text-slate-400 mt-2">Disimpan bersama lokasi toko saat klik Simpan.</p>
        </div>

        <button
          type="submit"
          disabled={saving || !coords}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-200 active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}
