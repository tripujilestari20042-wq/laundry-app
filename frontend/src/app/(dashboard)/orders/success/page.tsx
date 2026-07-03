import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderSuccessView from '@/components/orders/OrderSuccessView';
import type { Order } from '@/types';

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; payment?: string }>;
}) {
  const { id, payment } = await searchParams;

  if (!id) {
    redirect('/orders/new');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: orderData } = await supabase
    .from('orders')
    .select('*, services(name, price_unit)')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (!orderData) {
    redirect('/orders');
  }

  const order = orderData as Order & {
    services: { name: string; price_unit: string } | null;
  };

  return <OrderSuccessView order={order} paymentNotice={payment} />;
}
