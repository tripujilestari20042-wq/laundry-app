'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { formatIdrInput, parseIdrInput, sanitizeIdrTyping } from '@/lib/currency';
import { uploadServiceImage, deleteServiceImage } from '@/lib/storage';
import ImageUpload from './ImageUpload';
import type { Service, PriceUnit } from '@/types';
import { PRICE_UNIT_LABELS } from '@/types';

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  price_unit: PriceUnit;
  is_active: boolean;
}

const EMPTY_FORM: ServiceFormData = {
  name: '',
  description: '',
  price: '',
  price_unit: 'kg',
  is_active: true,
};

interface ServiceFormModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceFormModal({
  service,
  open,
  onClose,
  onSaved,
}: ServiceFormModalProps) {
  const supabase = createClient();
  const isEdit = !!service;

  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (service) {
        setForm({
          name: service.name,
          description: service.description || '',
          price: formatIdrInput(service.price),
          price_unit: service.price_unit,
          is_active: service.is_active,
        });
        setImageUrl(service.image_url);
      } else {
        setForm(EMPTY_FORM);
        setImageUrl(null);
      }
      setImageFile(null);
      setError(null);
    }
  }, [open, service]);

  if (!open) return null;

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sesi habis, silakan login kembali');
    return session.access_token;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Nama layanan wajib diisi.');
      return;
    }

    const parsedPrice = parseIdrInput(form.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Harga harus berupa angka lebih dari 0 (contoh: 40000 atau 40.000).');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      let finalImageUrl = imageUrl;

      if (imageFile) {
        if (service?.image_url) {
          await deleteServiceImage(service.image_url);
        }
        finalImageUrl = await uploadServiceImage(imageFile);
      }

      const payload = {
        name: trimmedName,
        description: form.description.trim() || undefined,
        price: parsedPrice,
        price_unit: form.price_unit,
        is_active: form.is_active,
        image_url: finalImageUrl,
      };

      if (isEdit && service) {
        await api.put<{ data: Service }>(
          `/api/services/${service.id}`,
          payload,
          token
        );
      } else {
        await api.post<{ data: Service }>('/api/services', payload, token);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Layanan' : 'Tambah Layanan Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            onFileSelect={setImageFile}
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Layanan *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Cuci Kering"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Deskripsi layanan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga *
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="service-price"
                autoComplete="off"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: sanitizeIdrTyping(e.target.value) })
                }
                onBlur={() => {
                  const parsed = parseIdrInput(form.price);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    setForm({ ...form, price: formatIdrInput(parsed) });
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="40.000"
              />
              <p className="mt-1 text-xs text-gray-400">Contoh: 40000 atau 40.000</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Satuan *
              </label>
              <select
                value={form.price_unit}
                onChange={(e) =>
                  setForm({ ...form, price_unit: e.target.value as PriceUnit })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="kg">Per kg</option>
                <option value="pcs">Per pcs</option>
                <option value="set">Per set</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">Layanan aktif (tampil di katalog)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Layanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ServiceTablePreview({ service }: { service: Service }) {
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary-50 flex-shrink-0 relative">
      {service.image_url ? (
        <Image
          src={service.image_url}
          alt={service.name}
          fill
          className="object-cover"
        />
      ) : (
        <span className="flex items-center justify-center w-full h-full text-xl">🧺</span>
      )}
    </div>
  );
}

export { PRICE_UNIT_LABELS };
