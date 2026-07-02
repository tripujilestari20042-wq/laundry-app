# LaundryApp — Full-Stack End-to-End

Aplikasi laundry online dengan Next.js, Express, dan Supabase.

## Arsitektur

```
Projek_Tari/
├── frontend/          # Next.js 15 (App Router, TypeScript, Tailwind CSS)
├── backend/           # Express API (TypeScript)
└── supabase/          # Database schema & setup guide
```

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Leaflet |
| Backend | Express, TypeScript, Zod |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Storage | Supabase Storage (gambar layanan) |
| Deploy | Vercel (frontend), Railway/Render (backend) |

## Fitur

- **Autentikasi Multi-Role**: Admin & Pelanggan dengan RBAC middleware
- **Manajemen Layanan**: CRUD layanan laundry (Admin)
- **Order & Antar-Jemput**: Peta Leaflet, kalkulasi jarak Haversine, ongkir Rp 2.000/km
- **Transaksi & Pembayaran**: Status laundry timeline, simulasi pembayaran

## Quick Start

### 1. Setup Supabase

1. Buat proyek di [supabase.com](https://supabase.com)
2. Jalankan `supabase/schema.sql` di SQL Editor
3. Ikuti panduan di `supabase/README.md`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Isi SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Backend berjalan di `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`

### 4. Buat Admin

Register akun via UI, lalu di Supabase SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'email-anda@example.com';
```

## API Endpoints

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/services` | Public | Katalog layanan aktif |
| GET | `/api/services/all` | Admin | Semua layanan |
| POST | `/api/services` | Admin | Buat layanan |
| PUT | `/api/services/:id` | Admin | Update layanan |
| DELETE | `/api/services/:id` | Admin | Nonaktifkan layanan |
| POST | `/api/orders/calculate` | Auth | Preview harga |
| POST | `/api/orders` | Pelanggan | Buat pesanan |
| GET | `/api/orders` | Auth | List pesanan |
| GET | `/api/orders/:id` | Auth | Detail + tracking |
| PATCH | `/api/orders/:id` | Auth/Admin | Update status |
| POST | `/api/orders/:id/pay` | Auth | Simulasi bayar |
| GET | `/api/config/store` | Public | Lokasi toko |

## Status Laundry Flow

```
Pending → Pickup → Processing → Ready → Delivering → Completed
```

## Environment Variables

Lihat `.env.example` di folder `frontend/` dan `backend/`.

## Deploy ke Vercel

- **Frontend**: Import repo, set root directory ke `frontend/`, tambahkan env vars
- **Backend**: Deploy ke Railway/Render, set env vars, update `NEXT_PUBLIC_API_URL` di frontend
