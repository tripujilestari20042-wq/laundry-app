import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { fetchStoreSettings, defaultStoreFromEnv } from '@/lib/catalog';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';

export async function GET() {
  try {
    const supabase = await createClient();
    const store = await fetchStoreSettings(supabase);
    const data = store ?? defaultStoreFromEnv();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat konfigurasi toko';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    const body = await request.json();
    const { data, error } = await supabase
      .from('store_settings')
      .upsert(
        {
          id: 1,
          lat: body.lat,
          lng: body.lng,
          address: body.address,
          delivery_fee_per_km: body.delivery_fee_per_km,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('lat, lng, address, delivery_fee_per_km, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal menyimpan lokasi toko';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
