import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';
import { getStoreSettings } from '../lib/store-settings';

const router = Router();

/** GET /api/config/store — Laundry store location & delivery config (from DB) */
router.get('/store', async (_req: Request, res: Response) => {
  try {
    const settings = await getStoreSettings();
    res.json({
      data: {
        lat: settings.lat,
        lng: settings.lng,
        address: settings.address,
        delivery_fee_per_km: settings.delivery_fee_per_km,
        updated_at: settings.updated_at,
      },
    });
  } catch {
    res.status(500).json({ error: 'Gagal memuat konfigurasi toko' });
  }
});

/** GET /api/config/profile — Current user profile */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.auth!.userId)
    .single();

  if (error) {
    res.status(404).json({ error: 'Profil tidak ditemukan' });
    return;
  }

  res.json({ data });
});

/** GET /api/config/users — Admin: list all users */
router.get('/users', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

export default router;
