import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../lib/supabase';

const router = Router();

router.use(authenticate, requireRole('admin'));

/** GET /api/admin/dashboard/stats */
router.get('/stats', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: todayOrders },
    { count: incomingCount },
    { count: processingCount },
    { data: statusRows },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount')
      .eq('laundry_status', 'completed')
      .gte('updated_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_status', 'pending'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('laundry_status', ['pickup', 'processing', 'ready', 'delivering']),
    supabase.from('orders').select('laundry_status'),
    supabase
      .from('orders')
      .select('id, total_amount, laundry_status, payment_status, created_at, profiles(full_name), services(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const todayRevenue = (todayOrders ?? []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const s = row.laundry_status as string;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  res.json({
    data: {
      today_revenue: todayRevenue,
      incoming_orders: incomingCount ?? 0,
      processing_orders: processingCount ?? 0,
      status_distribution: statusCounts,
      recent_orders: recentOrders ?? [],
    },
  });
});

export default router;
