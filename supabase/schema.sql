-- ============================================================
-- LAUNDRY APP - Supabase Database Schema
-- Jalankan di Supabase SQL Editor (Dashboard > SQL > New Query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'pelanggan');

CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');

CREATE TYPE laundry_status AS ENUM (
  'pending',
  'pickup',
  'processing',
  'ready',
  'delivering',
  'completed',
  'cancelled'
);

CREATE TYPE price_unit AS ENUM ('kg', 'pcs', 'set');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'pelanggan',
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Pengguna'),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    'pelanggan'::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SERVICES (Admin CRUD)
-- ============================================================

CREATE TABLE public.services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  price_unit  price_unit NOT NULL DEFAULT 'kg',
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_active ON public.services(is_active);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  service_id          UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,

  -- Order details
  weight_qty          NUMERIC(10, 2) NOT NULL CHECK (weight_qty > 0),
  service_cost        NUMERIC(12, 2) NOT NULL CHECK (service_cost >= 0),
  delivery_fee        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_amount        NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),

  -- Status
  payment_status      payment_status NOT NULL DEFAULT 'unpaid',
  laundry_status      laundry_status NOT NULL DEFAULT 'pending',

  -- Pickup & Delivery
  is_pickup_delivery  BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_lat          DOUBLE PRECISION,
  pickup_lng          DOUBLE PRECISION,
  pickup_address      TEXT,
  delivery_lat        DOUBLE PRECISION,
  delivery_lng        DOUBLE PRECISION,
  delivery_address    TEXT,
  distance_km         NUMERIC(8, 2),

  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(laundry_status);
CREATE INDEX idx_orders_payment ON public.orders(payment_status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- TRACKING STATUS (Order history timeline)
-- ============================================================

CREATE TABLE public.tracking_status (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      laundry_status NOT NULL,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_order ON public.tracking_status(order_id);
CREATE INDEX idx_tracking_created ON public.tracking_status(created_at DESC);

-- Auto-log status changes to tracking_status
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.laundry_status IS DISTINCT FROM NEW.laundry_status THEN
    INSERT INTO public.tracking_status (order_id, status, notes)
    VALUES (
      NEW.id,
      NEW.laundry_status,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Pesanan dibuat'
        ELSE 'Status diperbarui ke ' || NEW.laundry_status::TEXT
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER orders_status_tracking
  AFTER INSERT OR UPDATE OF laundry_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============================================================
-- HELPER: Check if current user is admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_status ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- SERVICES policies
CREATE POLICY "Anyone authenticated can view active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update services"
  ON public.services FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  USING (public.is_admin());

-- ORDERS policies
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Customers can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Customers can cancel own pending orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = customer_id
    AND laundry_status = 'pending'
  )
  WITH CHECK (
    auth.uid() = customer_id
    AND laundry_status = 'cancelled'
  );

-- TRACKING_STATUS policies
CREATE POLICY "Customers can view tracking for own orders"
  ON public.tracking_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = tracking_status.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all tracking"
  ON public.tracking_status FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert tracking"
  ON public.tracking_status FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================
-- STORAGE BUCKET for service images
-- Jalankan di Storage > New Bucket atau via SQL:
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read service images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update service images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'service-images' AND public.is_admin());

CREATE POLICY "Admins can delete service images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'service-images' AND public.is_admin());

-- ============================================================
-- SEED DATA (optional - sample services)
-- ============================================================

INSERT INTO public.services (name, description, price, price_unit) VALUES
  ('Cuci Kering', 'Layanan cuci kering dengan deterjen premium', 8000, 'kg'),
  ('Cuci Basah', 'Cuci basah + pengeringan mesin', 6000, 'kg'),
  ('Cuci Karpet', 'Cuci karpet per meter persegi', 25000, 'pcs'),
  ('Setrika', 'Setrika pakaian per kg', 5000, 'kg'),
  ('Dry Clean', 'Dry cleaning untuk pakaian formal', 15000, 'pcs')
ON CONFLICT DO NOTHING;
