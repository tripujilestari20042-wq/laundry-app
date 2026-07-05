import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';

const syncRoleSchema = z.object({
  role: z.enum(['admin', 'pelanggan']),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = syncRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    const { data: { user }, error: userError } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 });
    }

    const { role: expectedRole } = parsed.data;

    if (profile.role !== expectedRole) {
      if (expectedRole === 'admin' && profile.role === 'pelanggan') {
        await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
      } else {
        const roleLabel = profile.role === 'admin' ? 'Admin Laundry' : 'Pelanggan';
        return NextResponse.json(
          { error: `Akun terdaftar sebagai ${roleLabel}` },
          { status: 403 }
        );
      }
    }

    const { data: updated } = await admin
      .from('profiles')
      .select('id, email, role, full_name, phone')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ data: { profile: updated } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal sinkronisasi role';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
