import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { fetchStoreSettings, defaultStoreFromEnv } from '@/lib/catalog';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';

const updateStoreSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1, 'Alamat wajib diisi'),
  delivery_fee_per_km: z.number().min(500, 'Biaya antar-jemput minimal Rp 500 per KM'),
});

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
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }

    const { lat, lng, address, delivery_fee_per_km } = parsed.data;

    const { data, error } = await supabase
      .from('store_settings')
      .upsert(
        {
          id: 1,
          lat,
          lng,
          address,
          delivery_fee_per_km,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('lat, lng, address, delivery_fee_per_km, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({
      data,
      message: 'Pengaturan toko berhasil disimpan',
    });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal menyimpan lokasi toko';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
