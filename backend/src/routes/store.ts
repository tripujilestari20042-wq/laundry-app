import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { getStoreSettings, updateStoreSettings } from '../lib/store-settings';

const router = Router();

const updateStoreSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1, 'Alamat wajib diisi'),
  delivery_fee_per_km: z.number().positive().optional(),
});

/** GET /api/store/settings — Public store location */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getStoreSettings();
    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal memuat lokasi toko',
    });
  }
});

/** PUT /api/store/settings — Admin update store location */
router.put('/settings', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = updateStoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || 'Data tidak valid' });
    return;
  }

  try {
    const current = await getStoreSettings();
    const settings = await updateStoreSettings(
      {
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        address: parsed.data.address,
        delivery_fee_per_km: parsed.data.delivery_fee_per_km ?? current.delivery_fee_per_km,
      },
      req.auth!.userId
    );
    res.json({ data: settings, message: 'Lokasi toko berhasil disimpan' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal menyimpan lokasi toko',
    });
  }
});

export default router;
