-- ============================================================
-- MIGRATION PART 1: Tambah enum laundry_status
-- Jalankan file INI DULU di Supabase SQL Editor, lalu RUN.
-- Setelah sukses, jalankan migration-cancellation-geocoding-part2.sql
-- ============================================================
--
-- Catatan PostgreSQL: nilai enum baru tidak boleh dipakai
-- (index, RLS, dll.) dalam transaksi yang sama dengan ADD VALUE.

ALTER TYPE public.laundry_status ADD VALUE IF NOT EXISTS 'pembatalan_diajukan';

SELECT 'Part 1 selesai — sekarang jalankan migration-cancellation-geocoding-part2.sql' AS status;
