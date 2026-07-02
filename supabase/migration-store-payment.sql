-- ============================================================
-- MIGRATION: Store Settings + Payment Multi-Channel
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'midtrans');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'pending' to payment_status (for cash on delivery)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'pending';

-- ============================================================
-- STORE SETTINGS (singleton — lokasi outlet admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lat                 DOUBLE PRECISION NOT NULL,
  lng                 DOUBLE PRECISION NOT NULL,
  address             TEXT NOT NULL,
  delivery_fee_per_km NUMERIC(12, 2) NOT NULL DEFAULT 2000,
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.store_settings (id, lat, lng, address, delivery_fee_per_km)
VALUES (1, -6.2088, 106.8456, 'Jl. Contoh No. 123, Jakarta', 2000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read store settings" ON public.store_settings;
CREATE POLICY "Anyone can read store settings"
  ON public.store_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert store settings" ON public.store_settings;
CREATE POLICY "Admins can insert store settings"
  ON public.store_settings FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role manages store settings" ON public.store_settings;
CREATE POLICY "Service role manages store settings"
  ON public.store_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ORDERS — kolom pembayaran & Midtrans
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'cash';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_channel TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT UNIQUE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS snap_token TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_midtrans ON public.orders(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

SELECT 'Migration store_settings + payment columns selesai' AS status;
