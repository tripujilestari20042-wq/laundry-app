import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { deleteCustomerAccount } from '@/lib/auth/account-deletion';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'pelanggan') {
      return NextResponse.json(
        { error: 'Hanya akun pelanggan yang dapat menghapus akun sendiri di sini' },
        { status: 403 }
      );
    }

    await deleteCustomerAccount(user.id);

    return NextResponse.json({
      message: 'Akun Anda berhasil dihapus. Riwayat pesanan tetap tersimpan untuk keperluan operasional.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus akun';
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
