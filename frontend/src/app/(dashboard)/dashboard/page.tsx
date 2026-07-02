import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CustomerDashboardView from '@/components/dashboard/CustomerDashboardView';
import type { Order, Profile, LaundryStatus } from '@/types';

const ACTIVE_STATUSES: LaundryStatus[] = [
  'pending',
  'pickup',
  'processing',
  'ready',
  'delivering',
  'pembatalan_diajukan',
];

export default async function PelangganDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const profile = profileData as Pick<Profile, 'full_name' | 'role'> | null;

  if (profile?.role === 'admin') redirect('/admin');

  const { data: ordersData, count: totalCount } = await supabase
    .from('orders')
    .select('*, services(name)', { count: 'exact' })
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: activeCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', user.id)
    .in('laundry_status', ACTIVE_STATUSES);

  const { data: activeOrderData } = await supabase
    .from('orders')
    .select('*, services(name)')
    .eq('customer_id', user.id)
    .in('laundry_status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const orders = (ordersData ?? []) as (Order & { services: { name: string } | null })[];
  const activeOrder = (activeOrderData ?? null) as (Order & { services: { name: string } | null }) | null;

  return (
    <CustomerDashboardView
      fullName={profile?.full_name || 'Pelanggan'}
      orders={orders}
      activeOrder={activeOrder}
      activeCount={activeCount ?? 0}
      totalCount={totalCount ?? orders.length}
    />
  );
}
