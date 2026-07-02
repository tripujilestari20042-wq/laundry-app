import { getSupabaseAdmin } from './supabase';

export type NotificationType = 'new_order' | 'order_completed';

interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  order_id?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('notifications').insert(input);
  if (error) {
    console.error('[notifications] insert failed:', error.message);
  }
}

export async function notifyAllAdmins(
  params: Omit<CreateNotificationInput, 'user_id'>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (error || !admins?.length) return;

  await Promise.all(
    admins.map((admin) => createNotification({ ...params, user_id: admin.id }))
  );
}

function shortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export async function notifyNewOrder(
  orderId: string,
  customerName: string,
  totalAmount: number
): Promise<void> {
  await notifyAllAdmins({
    type: 'new_order',
    title: 'Pesanan Baru Masuk',
    message: `${customerName} membuat pesanan #${shortOrderId(orderId)} — Rp ${totalAmount.toLocaleString('id-ID')}`,
    order_id: orderId,
  });
}

export async function notifyOrderCompleted(
  customerId: string,
  orderId: string
): Promise<void> {
  await createNotification({
    user_id: customerId,
    type: 'order_completed',
    title: 'Pesanan Selesai! ✨',
    message: `Pesanan laundry Anda ${shortOrderId(orderId)} telah SELESAI dan siap diambil/diantar! ✨`,
    order_id: orderId,
  });
}
