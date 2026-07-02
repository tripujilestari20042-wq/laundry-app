import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';

const router = Router();

router.use(authenticate);

/** GET /api/notifications — Daftar notifikasi pengguna */
router.get('/', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 50);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.auth!.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.auth!.userId)
    .eq('is_read', false);

  res.json({ data: data ?? [], unread_count: unreadCount ?? 0 });
});

/** PATCH /api/notifications/read-all — Tandai semua sudah dibaca */
router.patch('/read-all', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.auth!.userId)
    .eq('is_read', false);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Semua notifikasi ditandai dibaca' });
});

/** PATCH /api/notifications/:id/read — Tandai satu notifikasi dibaca */
router.patch('/:id/read', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', String(req.params.id))
    .eq('user_id', req.auth!.userId)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
    return;
  }

  res.json({ data });
});

export default router;
