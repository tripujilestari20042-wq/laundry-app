import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';

const TOMBSTONE_EMAIL = 'deleted-accounts@system.internal';

export async function getOrCreateTombstoneUserId(
  admin: SupabaseClient
): Promise<string> {
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', TOMBSTONE_EMAIL)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TOMBSTONE_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Akun Dihapus' },
  });

  if (createError || !created.user) {
    const { data: retry } = await admin
      .from('profiles')
      .select('id')
      .eq('email', TOMBSTONE_EMAIL)
      .maybeSingle();

    if (retry?.id) return retry.id;
    throw new Error(createError?.message || 'Gagal menyiapkan akun arsip');
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      email: TOMBSTONE_EMAIL,
      full_name: 'Akun Dihapus',
      role: 'pelanggan',
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  return created.user.id;
}

/** Hapus akun pelanggan; riwayat pesanan dipindah ke akun arsip sistem. */
export async function deleteCustomerAccount(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profil tidak ditemukan');
  }

  if (profile.role !== 'pelanggan') {
    throw new Error('Hanya akun pelanggan yang dapat dihapus dari halaman ini');
  }

  const tombstoneId = await getOrCreateTombstoneUserId(admin);

  if (tombstoneId === userId) {
    throw new Error('Akun tidak valid');
  }

  const { error: orderError } = await admin
    .from('orders')
    .update({ customer_id: tombstoneId })
    .eq('customer_id', userId);

  if (orderError) {
    throw new Error(`Gagal memindahkan riwayat pesanan: ${orderError.message}`);
  }

  const { error: notifError } = await admin
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (notifError) {
    throw new Error(notifError.message);
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(authError.message);
  }
}
