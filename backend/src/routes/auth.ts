import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseAdmin } from '../lib/supabase';
import {
  adminCreateUser,
  signInWithPassword,
  signUpUser,
  mapGoTrueError,
  GoTrueError,
} from '../lib/gotrue';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'pelanggan']).default('pelanggan'),
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  role: z.enum(['admin', 'pelanggan']).optional(),
});

function toSessionPayload(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
}

async function upsertProfile(params: {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role?: 'admin' | 'pelanggan';
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('profiles').upsert(
    {
      id: params.id,
      email: params.email,
      full_name: params.full_name,
      phone: params.phone ?? null,
      role: params.role ?? 'pelanggan',
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[auth] Profile upsert failed:', error.message, error.code, error.details);
    throw new Error(
      `Profil gagal disimpan (${error.code || 'DB_ERROR'}): ${error.message}. Pastikan tabel public.profiles sudah dibuat via schema.sql.`
    );
  }
}

async function getProfile(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, role, full_name, phone')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[auth] Profile fetch failed:', error.message);
    return null;
  }
  return data;
}

async function registerWithFallback(
  email: string,
  password: string,
  metadata: Record<string, unknown>
): Promise<string> {
  try {
    const user = await adminCreateUser({ email, password, user_metadata: metadata });
    return user.id;
  } catch (adminError) {
    console.error('[auth] adminCreateUser failed:', adminError);

    if (
      adminError instanceof GoTrueError &&
      (adminError.status === 401 || adminError.status === 403)
    ) {
      throw new GoTrueError(
        adminError.status,
        {
          message:
            'API key Supabase ditolak. Buka Supabase Dashboard → Settings → API, salin legacy anon key (JWT eyJ...) dan service_role key ke backend/.env.',
        }
      );
    }

    // Fallback signup via anon key (e.g. when admin endpoint blocked)
    console.warn('[auth] Trying public signup fallback...');
    const signup = await signUpUser({ email, password, user_metadata: metadata });
    if (!signup.user?.id) {
      throw adminError;
    }
    return signup.user.id;
  }
}

/** POST /api/auth/register */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || 'Data tidak valid' });
      return;
    }

    const { email, password, full_name, phone, role } = parsed.data;
    const metadata = { full_name, phone: phone || null, role };

    const userId = await registerWithFallback(email, password, metadata);
    await upsertProfile({ id: userId, email, full_name, phone, role });

    const session = await signInWithPassword({ email, password });
    const profile = await getProfile(userId);

    res.status(201).json({
      data: {
        user: session.user,
        session: toSessionPayload(session),
        profile,
      },
    });
  } catch (error) {
    console.error('[auth] register error:', error);
    res.status(400).json({ error: mapGoTrueError(error) });
  }
});

/** POST /api/auth/login */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || 'Data tidak valid' });
      return;
    }

    const { email, password, role } = parsed.data;
    const session = await signInWithPassword({ email, password });
    const profile = await getProfile(session.user.id);

    if (!profile) {
      res.status(500).json({
        error: 'Profil tidak ditemukan. Pastikan tabel profiles sudah dibuat dan trigger handle_new_user aktif.',
      });
      return;
    }

    if (role && profile.role !== role) {
      const roleLabel = profile.role === 'admin' ? 'Admin Laundry' : 'Pelanggan';
      res.status(403).json({
        error: `Akun ini terdaftar sebagai ${roleLabel}. Silakan pilih role yang sesuai.`,
      });
      return;
    }

    res.json({
      data: {
        user: session.user,
        session: toSessionPayload(session),
        profile,
      },
    });
  } catch (error) {
    console.error('[auth] login error:', error);
    res.status(401).json({ error: mapGoTrueError(error) });
  }
});

/** POST /api/auth/sync-role — Set role setelah OAuth (service role) */
router.post('/sync-role', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token tidak ditemukan' });
    return;
  }

  const parsed = z.object({ role: z.enum(['admin', 'pelanggan']) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Role tidak valid' });
    return;
  }

  const token = authHeader.slice(7);
  const admin = getSupabaseAdmin();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ error: 'Token tidak valid' });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Profil tidak ditemukan' });
    return;
  }

  const { role: expectedRole } = parsed.data;

  if (profile.role !== expectedRole) {
    if (expectedRole === 'admin' && profile.role === 'pelanggan') {
      await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    } else {
      res.status(403).json({
        error: `Akun terdaftar sebagai ${profile.role === 'admin' ? 'Admin Laundry' : 'Pelanggan'}`,
      });
      return;
    }
  }

  const updated = await getProfile(user.id);
  res.json({ data: { profile: updated } });
});

/** GET /api/auth/me */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token tidak ditemukan' });
    return;
  }

  const token = authHeader.slice(7);
  const admin = getSupabaseAdmin();

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Token tidak valid' });
    return;
  }

  const profile = await getProfile(user.id);
  res.json({ data: { user, profile } });
});

/** GET /api/auth/health — diagnose Supabase connectivity */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('profiles').select('id', { count: 'exact', head: true });

    res.json({
      data: {
        supabase_url: process.env.SUPABASE_URL,
        profiles_table: error ? `ERROR: ${error.message}` : 'OK',
        hint: error
          ? 'Jalankan supabase/schema.sql di SQL Editor Supabase'
          : 'Database siap',
      },
    });
  } catch (error) {
    res.status(500).json({ error: mapGoTrueError(error) });
  }
});

export default router;
