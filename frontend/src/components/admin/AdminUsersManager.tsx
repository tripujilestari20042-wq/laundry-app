'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import type { Profile, UserRole } from '@/types';

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
}

const emptyForm: UserFormData = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: 'pelanggan',
};

export default function AdminUsersManager() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchUsers(q?: string) {
    setLoading(true);
    setFetchError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      setFetchError('Sesi login habis. Silakan masuk kembali.');
      return;
    }

    try {
      const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await api.get<{ data: Profile[] }>(`/api/admin/users${query}`, session.access_token);
      setUsers(res.data);
    } catch (err) {
      setUsers([]);
      setFetchError(err instanceof Error ? err.message : 'Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, supabase]);

  function openCreate() {
    setEditUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setForm({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      if (editUser) {
        await api.put(
          `/api/admin/users/${editUser.id}`,
          {
            full_name: form.full_name,
            phone: form.phone || null,
            role: form.role,
          },
          session.access_token
        );
        setMessage('Pengguna berhasil diperbarui');
      } else {
        await api.post(
          '/api/admin/users',
          {
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            phone: form.phone || undefined,
            role: form.role,
          },
          session.access_token
        );
        setMessage('Pengguna baru berhasil ditambahkan');
      }
      setModalOpen(false);
      await fetchUsers(search);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await api.delete(`/api/admin/users/${deleteTarget.id}`, session.access_token);
      setMessage('Pengguna berhasil dihapus');
      setDeleteTarget(null);
      await fetchUsers(search);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500';

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">CRUD data pelanggan dan admin laundry</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Pengguna Baru
        </button>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 flex-1 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gagal memuat daftar pengguna</p>
                <p className="text-amber-700 mt-0.5">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchUsers(search)}
              className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-800 font-medium hover:bg-amber-100 transition-colors shrink-0"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-sm">
          {message}
        </div>
      )}

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau telepon..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center text-slate-500">
            Data pengguna tidak dapat dimuat. Periksa koneksi backend lalu klik &quot;Coba Lagi&quot;.
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            {search.trim() ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada pengguna terdaftar.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-medium">Nama</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Telepon</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Daftar</th>
                  <th className="text-right p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80">
                    <td className="p-4 font-medium text-slate-900">{user.full_name || '-'}</td>
                    <td className="p-4 text-slate-600">{user.email}</td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{user.phone || '-'}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                            : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Pelanggan'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {editUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {!editUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className={inputClass}>
                  <option value="pelanggan">Pelanggan</option>
                  <option value="admin">Admin Laundry</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-slate-900">Hapus Pengguna?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Yakin hapus <strong>{deleteTarget.full_name || deleteTarget.email}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium">
                Batal
              </button>
              <button type="button" onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50">
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
