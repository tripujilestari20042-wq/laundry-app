# Supabase Setup Guide

## 1. Buat Proyek Supabase

1. Buka [https://supabase.com](https://supabase.com) dan buat proyek baru
2. Catat **Project URL**, **Anon Key**, dan **Service Role Key** dari Settings > API

## 2. Jalankan Skema Database

1. Buka **SQL Editor** di dashboard Supabase
2. Copy seluruh isi file `schema.sql` dan jalankan
3. Verifikasi tabel: `profiles`, `services`, `orders`, `tracking_status`

## 3. Konfigurasi Auth

### Email Auth
- Authentication > Providers > Email: aktifkan
- Site URL: `http://localhost:3000` (development)
- Redirect URLs: `http://localhost:3000/auth/callback`

### Google OAuth
1. Authentication > Providers > Google: aktifkan
2. Buat OAuth credentials di [Google Cloud Console](https://console.cloud.google.com/)
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Masukkan Client ID & Client Secret ke Supabase

## 4. Buat Admin Pertama

Setelah register user pertama via aplikasi, jalankan SQL:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## 5. Storage

Bucket `service-images` dibuat otomatis oleh schema. Pastikan bucket public untuk read access.

## 6. Environment Variables

Salin keys ke:
- `frontend/.env.local`
- `backend/.env`

Lihat `.env.example` di masing-masing folder.
