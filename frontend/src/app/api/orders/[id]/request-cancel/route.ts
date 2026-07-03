import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { requestOrderCancellation } from '@/lib/orders';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason : '';

    const data = await requestOrderCancellation(supabase, user.id, orderId, reason);

    return NextResponse.json({
      data,
      message: 'Pengajuan pembatalan berhasil dikirim. Menunggu persetujuan admin.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal mengajukan pembatalan';
    const status =
      message === 'Pesanan tidak ditemukan'
        ? 404
        : message.includes('hanya bisa') || message.includes('sudah dikirim') || message.includes('Alasan')
          ? 400
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
