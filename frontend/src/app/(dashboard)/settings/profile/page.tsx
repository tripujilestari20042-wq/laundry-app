'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Save, Trash2, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import type { Profile } from '@/types';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name || '');
        setPhone(p.phone || '');
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', profile.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
    }
    setSaving(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'HAPUS') return;

    setDeleting(true);
    setMessage(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage({ type: 'error', text: 'Sesi habis, silakan login kembali' });
      setDeleting(false);
      return;
    }

    try {
      await api.post<{ message: string }>('/api/account/delete', {}, session.access_token);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus akun',
      });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat profil...
      </div>
    );
  }

  const isPelanggan = profile?.role === 'pelanggan';

  return (
    <div className="max-w-lg animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-600">
          <User className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Profil</h1>
          <p className="text-slate-500 text-sm">Perbarui informasi akun Anda</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">No. Telepon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      {isPelanggan && (
        <div className="mt-8 bg-white rounded-2xl border border-rose-200 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Hapus Akun</h2>
              <p className="text-sm text-slate-500 mt-1">
                Akun Anda akan dihapus permanen dan tidak bisa login lagi. Riwayat pesanan
                tetap disimpan untuk operasional laundry (tanpa data profil pribadi Anda).
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm('');
                  setShowDeleteModal(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 border-2 border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Akun Saya
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Hapus Akun Permanen?</h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Tindakan ini tidak dapat dibatalkan. Ketik <strong>HAPUS</strong> untuk
              melanjutkan.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Ketik HAPUS"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'HAPUS'}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
