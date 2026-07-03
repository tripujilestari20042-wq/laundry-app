import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { createCustomerOrder } from '@/lib/orders';
import type { PaymentMethod } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const body = await request.json();
    const paymentMethod = (body.payment_method ?? 'cash') as PaymentMethod;

    if (paymentMethod === 'midtrans') {
      const externalApi = process.env.NEXT_PUBLIC_API_URL?.trim();
      const hasExternalBackend =
        externalApi &&
        !externalApi.includes('localhost') &&
        !externalApi.includes('127.0.0.1');

      if (!hasExternalBackend) {
        return NextResponse.json(
          {
            error:
              'Pembayaran Midtrans membutuhkan backend production. Pilih Tunai atau hubungi admin.',
          },
          { status: 503 }
        );
      }
    }

    const data = await createCustomerOrder(supabase, user.id, {
      service_id: body.service_id,
      weight_qty: Number(body.weight_qty),
      is_pickup_delivery: Boolean(body.is_pickup_delivery),
      pickup_lat: body.pickup_lat != null ? Number(body.pickup_lat) : undefined,
      pickup_lng: body.pickup_lng != null ? Number(body.pickup_lng) : undefined,
      pickup_address: body.pickup_address,
      delivery_lat: body.delivery_lat != null ? Number(body.delivery_lat) : undefined,
      delivery_lng: body.delivery_lng != null ? Number(body.delivery_lng) : undefined,
      delivery_address: body.delivery_address,
      notes: body.notes,
      payment_method: paymentMethod,
      payment_channel: body.payment_channel,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat pesanan';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
