import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/route-auth';
import { requireAdmin, AdminAccessError } from '@/lib/supabase/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, laundry_status, payment_status, created_at, services(name)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: { profile, orders: orders ?? [] } });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal memuat pengguna';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    const body = await request.json();
    if (id === user.id && body.role && body.role !== 'admin') {
      return NextResponse.json({ error: 'Tidak bisa menurunkan role diri sendiri' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal memperbarui pengguna';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase, request);
    if (!user) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
    }
    await requireAdmin(supabase, user.id);

    if (id === user.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', id)
      .limit(1);

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: 'Pengguna memiliki riwayat pesanan. Nonaktifkan atau ubah role saja.' },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err) {
    if (err instanceof AdminAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Gagal menghapus pengguna';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
