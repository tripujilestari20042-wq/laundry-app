'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import ServiceFormModal, { ServiceTablePreview, PRICE_UNIT_LABELS } from '@/components/admin/ServiceFormModal';
import type { Service } from '@/types';

export default function AdminServicesManager() {
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi habis');

      const res = await api.get<{ data: Service[] }>(
        '/api/services/all',
        session.access_token
      );
      setServices(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat layanan');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function openCreate() {
    setEditingService(null);
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setModalOpen(true);
  }

  async function handleToggleActive(service: Service) {
    setActionLoading(service.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi habis');

      if (service.is_active) {
        await api.delete(`/api/services/${service.id}`, session.access_token);
      } else {
        await api.put(
          `/api/services/${service.id}`,
          { is_active: true },
          session.access_token
        );
      }
      await fetchServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Layanan</h1>
          <p className="text-gray-500 mt-1">
            CRUD layanan laundry — hanya admin yang dapat mengakses halaman ini
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          Tambah Layanan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Memuat layanan...</div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>Belum ada layanan.</p>
            <button
              onClick={openCreate}
              className="mt-3 text-primary-600 hover:underline font-medium"
            >
              Tambah layanan pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left p-4">Layanan</th>
                  <th className="text-left p-4">Harga</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Dibuat</th>
                  <th className="text-right p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ServiceTablePreview service={service} />
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-gray-400 text-xs line-clamp-1 max-w-xs">
                            {service.description || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      Rp {service.price.toLocaleString('id-ID')}
                      <span className="text-gray-400">/{PRICE_UNIT_LABELS[service.price_unit]}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          service.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {service.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 whitespace-nowrap">
                      {new Date(service.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(service)}
                          className="px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(service)}
                          disabled={actionLoading === service.id}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
                            service.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {actionLoading === service.id
                            ? '...'
                            : service.is_active
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ServiceFormModal
        service={editingService}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchServices}
      />
    </div>
  );
}
