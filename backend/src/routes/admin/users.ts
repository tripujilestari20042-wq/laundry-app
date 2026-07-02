import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../lib/supabase';
import { adminCreateUser } from '../../lib/gotrue';

const router = Router();

router.use(authenticate, requireRole('admin'));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['admin', 'pelanggan']).default('pelanggan'),
});

const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'pelanggan']).optional(),
});

/** GET /api/admin/users — Daftar pengguna + pencarian */
router.get('/', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const q = (req.query.q as string)?.trim();

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

/** GET /api/admin/users/:id — Detail + riwayat pesanan */
router.get('/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, created_at, updated_at')
    .eq('id', req.params.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    return;
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_amount, laundry_status, payment_status, created_at, services(name)')
    .eq('customer_id', req.params.id)
    .order('created_at', { ascending: false });

  res.json({ data: { profile, orders: orders ?? [] } });
});

/** POST /api/admin/users — Buat pengguna baru */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, full_name, phone, role } = parsed.data;
  const supabase = getSupabaseAdmin();

  try {
    const user = await adminCreateUser({
      email,
      password,
      user_metadata: { full_name, phone: phone || null, role },
    });

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email,
          full_name,
          phone: phone ?? null,
          role,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Gagal membuat pengguna',
    });
  }
});

/** PUT /api/admin/users/:id — Update profil */
router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (req.params.id === req.auth!.userId && parsed.data.role && parsed.data.role !== 'admin') {
    res.status(400).json({ error: 'Tidak bisa menurunkan role diri sendiri' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    res.status(error?.code === 'PGRST116' ? 404 : 500).json({
      error: error?.message || 'Pengguna tidak ditemukan',
    });
    return;
  }

  res.json({ data });
});

/** DELETE /api/admin/users/:id — Hapus pengguna */
router.delete('/:id', async (req: Request, res: Response) => {
  if (req.params.id === req.auth!.userId) {
    res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', req.params.id)
    .limit(1);

  if (orders && orders.length > 0) {
    res.status(400).json({
      error: 'Pengguna memiliki riwayat pesanan. Nonaktifkan atau ubah role saja.',
    });
    return;
  }

  const userId = String(req.params.id);

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    res.status(500).json({ error: authError.message });
    return;
  }

  res.json({ message: 'Pengguna berhasil dihapus' });
});

export default router;
