import type { SupabaseClient } from '@supabase/supabase-js';

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getWeekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

export async function getMonthlyReport(
  supabase: SupabaseClient,
  month: number,
  year: number,
  paymentMethod: string
) {
  if (month < 1 || month > 12 || year < 2020) {
    throw new Error('Bulan atau tahun tidak valid');
  }

  const { start, end } = getMonthRange(month, year);

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
    throw new Error(error.message);
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

  return {
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
  };
}
