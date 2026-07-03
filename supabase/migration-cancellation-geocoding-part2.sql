-- ============================================================
-- MIGRATION PART 2: Kolom pembatalan + index + RLS
-- Jalankan SETELAH Part 1 (migration-cancellation-geocoding.sql) sukses.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status_before_cancel public.laundry_status;

CREATE INDEX IF NOT EXISTS idx_orders_cancellation
  ON public.orders(laundry_status)
  WHERE laundry_status = 'pembatalan_diajukan';

-- Hapus policy lama & policy baru (aman di-run ulang)
DROP POLICY IF EXISTS "Customers can cancel own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can request cancel on own orders" ON public.orders;

CREATE POLICY "Customers can request cancel on own orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = customer_id
    AND laundry_status IN ('pending', 'pickup')
  )
  WITH CHECK (
    auth.uid() = customer_id
    AND laundry_status IN ('pembatalan_diajukan', 'cancelled')
  );

SELECT 'Part 2 selesai — migrasi pembatalan_diajukan complete' AS status;
