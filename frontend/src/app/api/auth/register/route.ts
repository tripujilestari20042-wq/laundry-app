import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';
import {
  getProfileByUserId,
  signInWithEmailPassword,
  toSessionPayload,
  upsertProfile,
} from '@/lib/auth/server-auth';

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'pelanggan']).default('pelanggan'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }

    const { email, password, full_name, phone, role } = parsed.data;
    const admin = getSupabaseAdmin();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), phone: phone?.trim() || null, role },
    });

    if (createError || !created.user) {
      const msg = createError?.message ?? 'Gagal membuat akun';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await upsertProfile({
      id: created.user.id,
      email: email.trim(),
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      role,
    });

    const signIn = await signInWithEmailPassword(email, password);

    if (!signIn.ok) {
      return NextResponse.json({
        data: {
          user: { id: created.user.id, email: created.user.email ?? email },
          session: null,
          message: 'Registrasi berhasil. Silakan login dengan email dan password Anda.',
        },
      });
    }

    const profile = await getProfileByUserId(created.user.id);

    return NextResponse.json(
      {
        data: {
          user: { id: created.user.id, email: created.user.email ?? email },
          session: toSessionPayload(signIn.session),
          profile: profile ?? undefined,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registrasi gagal';
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
