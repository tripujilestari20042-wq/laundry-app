import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardView, { type DashboardStats } from '@/components/dashboard/AdminDashboardView';
import type { LaundryStatus, Profile } from '@/types';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null;

  if (profile?.role !== 'admin') redirect('/dashboard');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: cancelRequests },
    { data: todayOrders },
    { count: incomingOrders },
    { count: processingOrders },
    { data: statusRows },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('laundry_status', 'pembatalan_diajukan'),
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

  const statusDistribution: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    const status = row.laundry_status as LaundryStatus;
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  }

  return (
    <AdminDashboardView
      fullName={profile.full_name || 'Admin'}
      cancelRequests={cancelRequests ?? 0}
      stats={{
        today_revenue: todayRevenue,
        incoming_orders: incomingOrders ?? 0,
        processing_orders: processingOrders ?? 0,
        status_distribution: statusDistribution,
        recent_orders: (recentOrders ?? []) as unknown as DashboardStats['recent_orders'],
      }}
    />
  );
}
