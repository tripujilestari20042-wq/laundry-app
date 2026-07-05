import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';

const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'pelanggan']).default('pelanggan'),
});

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message;
      return NextResponse.json({ error: firstError || 'Data tidak valid' }, { status: 400 });
    }

    const { email, password, full_name, phone, role } = parsed.data;
    const admin = getSupabaseAdmin();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: phone || null, role },
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Gagal membuat akun auth';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { data, error } = await admin
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name,
          phone: phone ?? null,
          role,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Profil gagal disimpan' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal membuat pengguna';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
