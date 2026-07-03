import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';
import { approveOrderCancellation } from '@/lib/orders';

export async function POST(
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

    await requireAdmin(supabase, user.id);
    const result = await approveOrderCancellation(supabase, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal menyetujui pembatalan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
