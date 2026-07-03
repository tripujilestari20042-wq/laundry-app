'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchActiveServices } from '@/lib/catalog';
import { api } from '@/lib/api';
import LocationPicker, {
  type StoreLocationData,
  StoreLocationStatus,
  useStoreLocation,
} from '@/components/maps/LocationPicker';
import Stepper from '@/components/ui/Stepper';
import { openMidtransSnap } from '@/lib/payments/midtrans';
import type { Service, OrderCalculation, PaymentMethod, Order } from '@/types';
import { PAYMENT_METHOD_LABELS, PRICE_UNIT_LABELS } from '@/types';

const STEPS = [
  { id: 1, title: 'Layanan' },
  { id: 2, title: 'Lokasi' },
  { id: 3, title: 'Bayar' },
];

interface NewOrderFormProps {
  initialServices: Service[];
  initialStore: StoreLocationData;
}

export default function NewOrderForm({ initialServices, initialStore }: NewOrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { store, loading: storeLoading, error: storeError, retry: retryStore } =
    useStoreLocation(initialStore);

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState(searchParams.get('service') || '');
  const [weightQty, setWeightQty] = useState(1);
  const [isPickupDelivery, setIsPickupDelivery] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [calculation, setCalculation] = useState<OrderCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const data = await fetchActiveServices(supabase);
      setServices(data);
      if (data.length === 0) {
        setServicesError('Belum ada layanan aktif. Hubungi admin laundry.');
      }
    } catch (err) {
      setServicesError(
        err instanceof Error ? err.message : 'Gagal memuat daftar layanan'
      );
    } finally {
      setServicesLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setServices(initialServices);
    if (initialServices.length === 0) {
      reloadServices();
    }
  }, [initialServices, reloadServices]);

  useEffect(() => {
    if (!serviceId || weightQty <= 0) return;
    async function calculate() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await api.post<{ data: OrderCalculation }>(
          '/api/orders/calculate',
          {
            service_id: serviceId,
            weight_qty: weightQty,
            is_pickup_delivery: isPickupDelivery,
            pickup_lat: pickupCoords?.lat,
            pickup_lng: pickupCoords?.lng,
          },
          session.access_token
        );
        setCalculation(res.data);
      } catch {
        setCalculation(null);
      }
    }
    calculate();
  }, [serviceId, weightQty, isPickupDelivery, pickupCoords, supabase]);

  function handleWeightQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      setWeightQty(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      setWeightQty(parsed);
    }
  }

  function canGoStep2() {
    return Boolean(serviceId && weightQty > 0 && services.length > 0);
  }

  function canGoStep3() {
    if (!canGoStep2()) return false;
    if (isPickupDelivery) return Boolean(pickupCoords && pickupAddress.trim());
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Sesi habis, silakan login kembali');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post<{ data: Order }>(
        '/api/orders',
        {
          service_id: serviceId,
          weight_qty: weightQty,
          is_pickup_delivery: isPickupDelivery,
          pickup_lat: pickupCoords?.lat,
          pickup_lng: pickupCoords?.lng,
          pickup_address: pickupAddress,
          delivery_lat: pickupCoords?.lat,
          delivery_lng: pickupCoords?.lng,
          delivery_address: pickupAddress,
          notes,
          payment_method: paymentMethod,
          payment_channel: paymentMethod === 'cash' ? 'cash' : 'midtrans',
        },
        session.access_token
      );

      const order = res.data;

      if (paymentMethod === 'midtrans') {
        const snapRes = await api.post<{
          data: { snap_token: string; snap_script_url: string; client_key: string };
        }>(`/api/payments/snap-token/${order.id}`, {}, session.access_token);

        const result = await openMidtransSnap(snapRes.data.snap_token, {
          snap_script_url: snapRes.data.snap_script_url,
          client_key: snapRes.data.client_key,
        });

        if (result === 'success' || result === 'pending') {
          router.push(`/orders/${order.id}?payment=${result}`);
        } else if (result === 'close') {
          router.push(`/orders/${order.id}?payment=cancelled`);
        } else {
          setError('Pembayaran gagal. Pesanan tersimpan — bayar ulang dari detail pesanan.');
          setLoading(false);
        }
        return;
      }

      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pesanan');
      setLoading(false);
    }
  }

  const selectedService = services.find((s) => s.id === serviceId);
  const inputClass =
    'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white';

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Pesan Laundry Baru</h1>
        <p className="text-slate-500 mt-1">Ikuti 3 langkah mudah di bawah</p>
      </div>

      <Stepper steps={STEPS} currentStep={step} />

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 text-primary-700 font-semibold">
                <Package className="w-5 h-5" /> Detail Layanan
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Layanan</label>
                {servicesLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memuat layanan...
                  </div>
                ) : services.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
                    <p className="font-medium">Daftar layanan kosong</p>
                    <p>{servicesError || 'Belum ada layanan aktif yang tersedia.'}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={reloadServices}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-medium hover:bg-amber-100"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Muat ulang
                      </button>
                      <Link
                        href="/services"
                        className="inline-flex items-center px-3 py-1.5 text-primary-700 font-medium hover:underline"
                      >
                        Lihat katalog
                      </Link>
                    </div>
                  </div>
                ) : (
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">Pilih layanan...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — Rp {s.price.toLocaleString('id-ID')}/{PRICE_UNIT_LABELS[s.price_unit]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Berat / Jumlah ({selectedService ? PRICE_UNIT_LABELS[selectedService.price_unit] : 'unit'})
                </label>
                <input
                  type="number"
                  value={weightQty > 0 ? weightQty : ''}
                  onChange={handleWeightQtyChange}
                  min={0.1}
                  step={0.1}
                  required
                  disabled={services.length === 0}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={inputClass}
                  placeholder="Instruksi khusus untuk kurir..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 text-primary-700 font-semibold">
                <Truck className="w-5 h-5" /> Lokasi & Antar-Jemput
              </div>

              <StoreLocationStatus loading={storeLoading} error={storeError} onRetry={retryStore} />

              {store && !storeError && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-sm">
                  <MapPin className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-rose-800">Lokasi Laundry</p>
                    <p className="text-rose-700 mt-0.5">{store.address}</p>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isPickupDelivery}
                  onChange={(e) => setIsPickupDelivery(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <p className="font-medium text-slate-900">Layanan Antar-Jemput</p>
                  <p className="text-xs text-slate-500">
                    + Rp {store?.delivery_fee_per_km?.toLocaleString('id-ID') || '2.000'}/km
                  </p>
                </div>
              </label>

              {isPickupDelivery && (
                <LocationPicker
                  searchLabel="Cari Alamat Jemput / Antar"
                  mapHint="Pin biru = titik jemput/antar Anda"
                  address={pickupAddress}
                  onAddressChange={setPickupAddress}
                  value={pickupCoords}
                  onChange={setPickupCoords}
                  storeLocation={store ? { lat: store.lat, lng: store.lng } : undefined}
                  customerLabel="Lokasi Jemput/Antar"
                  required
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary-700 font-semibold mb-2">
                <CreditCard className="w-5 h-5" /> Metode Pembayaran
              </div>

              {(['cash', 'midtrans'] as PaymentMethod[]).map((method) => {
                const Icon = method === 'cash' ? Banknote : CreditCard;
                const selected = paymentMethod === method;
                return (
                  <label
                    key={method}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                        : 'border-slate-200 hover:border-primary-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={selected}
                      onChange={() => setPaymentMethod(method)}
                      className="sr-only"
                    />
                    <span className={`p-2 rounded-lg ${selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{PAYMENT_METHOD_LABELS[method]}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {method === 'cash'
                          ? 'Bayar tunai saat kurir jemput/antar'
                          : 'GoPay, DANA, OVO, QRIS, VA bank via Midtrans'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-6 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !canGoStep2()) || (step === 2 && !canGoStep3())}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all"
              >
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canGoStep3()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Memproses...' : paymentMethod === 'midtrans' ? 'Buat Pesanan & Bayar' : 'Buat Pesanan'}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-4">Ringkasan</h3>
            {selectedService ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan</span>
                  <span className="font-medium text-right">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Qty</span>
                  <span>{weightQty} {PRICE_UNIT_LABELS[selectedService.price_unit]}</span>
                </div>
                {isPickupDelivery && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Antar-jemput</span>
                    <span className="text-primary-600">Ya</span>
                  </div>
                )}
                {calculation && (
                  <>
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Biaya layanan</span>
                        <span>Rp {calculation.service_cost.toLocaleString('id-ID')}</span>
                      </div>
                      {isPickupDelivery && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ongkir ({calculation.distance_km} km)</span>
                          <span>Rp {calculation.delivery_fee.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-3">
                      <span>Total</span>
                      <span className="text-primary-700">
                        Rp {calculation.total_amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Pilih layanan untuk melihat ringkasan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
