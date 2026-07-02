-- ============================================================
-- MIGRATION: Role dari metadata saat OAuth / register
-- Opsional — jalankan jika Google OAuth selalu jadi pelanggan
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role TEXT;
  resolved_role public.user_role;
BEGIN
  meta_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '');

  IF meta_role IN ('admin', 'pelanggan') THEN
    resolved_role := meta_role::public.user_role;
  ELSE
    resolved_role := 'pelanggan'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Pengguna'),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    resolved_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role      = COALESCE(EXCLUDED.role, public.profiles.role);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user gagal untuk user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

SELECT 'Trigger handle_new_user — role dari metadata aktif' AS status;
