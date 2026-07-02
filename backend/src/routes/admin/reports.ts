import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../lib/supabase';

const router = Router();

router.use(authenticate, requireRole('admin'));

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getWeekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/** GET /api/admin/reports/monthly?month=7&year=2026&payment_method=all|cash|midtrans */
router.get('/monthly', async (req: Request, res: Response) => {
  const now = new Date();
  const month = parseInt(String(req.query.month || now.getMonth() + 1), 10);
  const year = parseInt(String(req.query.year || now.getFullYear()), 10);
  const paymentMethod = String(req.query.payment_method || 'all');

  if (month < 1 || month > 12 || year < 2020) {
    res.status(400).json({ error: 'Bulan atau tahun tidak valid' });
    return;
  }

  const { start, end } = getMonthRange(month, year);
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('orders')
    .select(`
      id, total_amount, weight_qty, laundry_status, payment_status,
      payment_method, created_at, updated_at,
      profiles(full_name, email),
      services(name, price_unit)
    `)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (paymentMethod === 'cash' || paymentMethod === 'midtrans') {
    query = query.eq('payment_method', paymentMethod);
  }

  const { data: orders, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = orders ?? [];
  const completed = rows.filter((o) => o.laundry_status === 'completed');
  const cancelled = rows.filter((o) => o.laundry_status === 'cancelled');

  const totalRevenue = completed.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalWeightKg = completed.reduce((sum, o) => {
    const unit = (o.services as { price_unit?: string } | null)?.price_unit;
    if (unit === 'kg') return sum + (o.weight_qty || 0);
    return sum;
  }, 0);

  const weeklyMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const order of completed) {
    const week = getWeekOfMonth(new Date(order.created_at));
    weeklyMap[week] = (weeklyMap[week] || 0) + (order.total_amount || 0);
  }

  const weeklyTrend = Object.entries(weeklyMap).map(([week, revenue]) => ({
    week: `Minggu ${week}`,
    revenue,
  }));

  res.json({
    data: {
      month,
      year,
      payment_method: paymentMethod,
      summary: {
        total_revenue: totalRevenue,
        completed_orders: completed.length,
        cancelled_orders: cancelled.length,
        total_weight_kg: Math.round(totalWeightKg * 100) / 100,
        total_orders: rows.length,
      },
      weekly_trend: weeklyTrend,
      transactions: rows.map((o) => ({
        id: o.id,
        customer_name: (o.profiles as { full_name?: string } | null)?.full_name || '-',
        service_name: (o.services as { name?: string } | null)?.name || '-',
        total_amount: o.total_amount,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        laundry_status: o.laundry_status,
        weight_qty: o.weight_qty,
        created_at: o.created_at,
      })),
    },
  });
});

export default router;
