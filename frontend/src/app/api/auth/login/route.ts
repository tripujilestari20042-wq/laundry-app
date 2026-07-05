import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  confirmAuthUserEmail,
  findAuthUserByEmail,
  getAuthProviders,
  getProfileByUserId,
  isEmailConfirmed,
  mapLoginFailureMessage,
  roleLabel,
  signInWithEmailPassword,
  toSessionPayload,
} from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  role: z.enum(['admin', 'pelanggan']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }

    const { email, password, role } = parsed.data;

    let signIn = await signInWithEmailPassword(email, password);

    if (!signIn.ok) {
      const authUser = await findAuthUserByEmail(email);

      if (authUser) {
        const providers = getAuthProviders(authUser);
        const hasEmailProvider = providers.includes('email');

        if (hasEmailProvider && !isEmailConfirmed(authUser)) {
          await confirmAuthUserEmail(authUser.id);
          signIn = await signInWithEmailPassword(email, password);
        }
      }

      if (!signIn.ok) {
        const authUserForMessage = authUser ?? (await findAuthUserByEmail(email));
        return NextResponse.json(
          {
            error: mapLoginFailureMessage({
              email,
              authUser: authUserForMessage,
            }),
          },
          { status: 401 }
        );
      }
    }

    const profile = await getProfileByUserId(signIn.user.id);

    if (!profile) {
      return NextResponse.json(
        {
          error:
            'Profil tidak ditemukan. Hubungi admin atau daftar ulang.',
        },
        { status: 500 }
      );
    }

    if (role && profile.role !== role) {
      return NextResponse.json(
        {
          error: `Akun ini terdaftar sebagai ${roleLabel(profile.role as UserRole)}. Silakan pilih role yang sesuai.`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: {
        user: { id: signIn.user.id, email: signIn.user.email },
        session: toSessionPayload(signIn.session),
        profile,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login gagal';
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
