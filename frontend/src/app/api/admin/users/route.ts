import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal memuat pengguna';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Membuat pengguna baru membutuhkan backend Railway dengan SUPABASE_SERVICE_ROLE_KEY. Gunakan halaman Register atau deploy backend.',
    },
    { status: 503 }
  );
}
