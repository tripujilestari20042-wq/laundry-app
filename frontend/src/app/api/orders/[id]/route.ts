import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { isUserAdmin } from '@/lib/supabase/admin-auth';
import { getOrderById } from '@/lib/orders';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const admin = await isUserAdmin(supabase, user.id);
    const data = await getOrderById(supabase, user.id, admin, id);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat pesanan';
    const status = message === 'Pesanan tidak ditemukan' ? 404 : message === 'Akses ditolak' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
