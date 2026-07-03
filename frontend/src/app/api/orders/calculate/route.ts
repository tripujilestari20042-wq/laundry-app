import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { calculateOrderPricing } from '@/lib/orders';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);

    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }

    const body = await request.json();
    const data = await calculateOrderPricing(supabase, {
      service_id: body.service_id,
      weight_qty: Number(body.weight_qty),
      is_pickup_delivery: Boolean(body.is_pickup_delivery),
      pickup_lat: body.pickup_lat != null ? Number(body.pickup_lat) : undefined,
      pickup_lng: body.pickup_lng != null ? Number(body.pickup_lng) : undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghitung harga';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
