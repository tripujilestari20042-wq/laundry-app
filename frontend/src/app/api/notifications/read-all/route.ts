import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return NextResponse.json({ message: 'Semua notifikasi ditandai dibaca' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui notifikasi';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
