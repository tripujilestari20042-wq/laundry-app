import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  price_unit: z.enum(['kg', 'pcs', 'set']).default('kg'),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

const updateServiceSchema = createServiceSchema.partial();

/** GET /api/services — Public catalog (active services) */
router.get('/', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

/** GET /api/services/all — Admin: all services including inactive */
router.get('/all', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

/** GET /api/services/:id */
router.get('/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: 'Layanan tidak ditemukan' });
    return;
  }

  res.json({ data });
});

/** POST /api/services — Admin only */
router.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ data });
});

/** PUT /api/services/:id — Admin only */
router.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data });
});

/** DELETE /api/services/:id — Admin only (soft delete) */
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data, message: 'Layanan dinonaktifkan' });
});

export default router;
