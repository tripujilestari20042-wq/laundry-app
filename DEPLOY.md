# Panduan Deploy Production — Laundry App

Deploy lengkap: **Backend (Railway)** + **Frontend (Vercel)** + **Supabase** + **Google OAuth**.

| Komponen | URL |
|----------|-----|
| Frontend (Vercel) | https://laundry-app-liart.vercel.app |
| Backend (Railway) | *(isi setelah deploy — contoh: `https://laundry-api-production.up.railway.app`)* |
| Supabase | https://upekqyrncipkgbpazrzm.supabase.co |

---

## Checklist Cepat

- [ ] SQL migrations dijalankan di Supabase
- [ ] Backend deploy di Railway + domain publik
- [ ] Env vars backend di Railway
- [ ] Env vars frontend di Vercel (`NEXT_PUBLIC_API_URL` = URL Railway)
- [ ] Supabase Auth URL Configuration
- [ ] Google Cloud redirect URI
- [ ] Redeploy Vercel setelah env diubah

---

## 1. Supabase — Database & Auth

### 1.1 Jalankan migrations (SQL Editor)

Jalankan **berurutan** di [Supabase SQL Editor](https://supabase.com/dashboard/project/upekqyrncipkgbpazrzm/sql):

1. `supabase/schema.sql` *(jika database masih kosong)*
2. `supabase/fix-auth.sql`
3. `supabase/migration-auth-role.sql`
4. `supabase/migration-store-payment.sql`
5. `supabase/migration-cancellation-geocoding.sql`
6. `supabase/migration-cancellation-geocoding-part2.sql`
7. `supabase/migration-notifications.sql`

### 1.2 Ambil API keys

Supabase → **Project Settings** → **API**:

| Key | Dipakai di |
|-----|------------|
| Project URL | Railway + Vercel |
| `anon` `public` | Railway + Vercel |
| `service_role` `secret` | **Railway saja** (jangan di frontend!) |

### 1.3 Auth URL Configuration

Supabase → **Authentication** → **URL Configuration**:

| Field | Value |
|-------|-------|
| **Site URL** | `https://laundry-app-liart.vercel.app` |
| **Redirect URLs** | `https://laundry-app-liart.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` *(dev)* |

### 1.4 Google Provider

Supabase → **Authentication** → **Providers** → **Google**:

1. Aktifkan Google
2. Isi **Client ID** & **Client Secret** dari Google Cloud Console
3. Simpan

---

## 2. Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Pilih OAuth 2.0 Client ID (Web application)
3. **Authorized redirect URIs** — tambahkan **hanya ini** (callback Supabase, bukan Vercel):

```
https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback
```

4. **Authorized JavaScript origins** (opsional dev):

```
http://localhost:3000
https://laundry-app-liart.vercel.app
```

---

## 3. Backend — Deploy ke Railway

### 3.1 Buat project

1. Login [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Pilih repo: `tripujilestari20042-wq/laundry-app`
4. Set **Root Directory** = `backend`
5. Railway akan detect `railway.toml` dan build otomatis

### 3.2 Environment Variables

Railway → Service → **Variables** → salin dari `backend/.env.railway.example`:

```
SUPABASE_URL=https://upekqyrncipkgbpazrzm.supabase.co
SUPABASE_ANON_KEY=<anon-key-dari-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-dari-supabase>
NODE_ENV=production
FRONTEND_URL=https://laundry-app-liart.vercel.app
```

### 3.3 Domain publik

1. Railway → Service → **Settings** → **Networking**
2. **Generate Domain** → dapat URL seperti `https://laundry-api-production-xxxx.up.railway.app`
3. **Salin URL ini** — dipakai di Vercel sebagai `NEXT_PUBLIC_API_URL`

### 3.4 Verifikasi

Buka di browser:

```
https://<url-railway-anda>/health
```

Harus muncul:

```json
{"status":"ok","timestamp":"..."}
```

---

## 4. Frontend — Vercel

### 4.1 Import / redeploy

Jika belum connect GitHub:

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import repo `laundry-app`
3. **Root Directory** = `frontend`
4. Deploy

Jika sudah ada project `laundry-app-liart`:

1. Push kode terbaru ke GitHub
2. Vercel redeploy otomatis, atau klik **Redeploy** manual

### 4.2 Environment Variables

Vercel → Project → **Settings** → **Environment Variables**

Salin dari `frontend/.env.vercel.example`:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://upekqyrncipkgbpazrzm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key Supabase |
| `NEXT_PUBLIC_APP_URL` | `https://laundry-app-liart.vercel.app` |
| `NEXT_PUBLIC_API_URL` | URL Railway dari langkah 3.3 |

**Penting:** Set semua untuk environment **Production** (dan Preview jika perlu).

### 4.3 Redeploy

Setelah mengubah env vars → **Deployments** → **Redeploy** (wajib agar env baru terbaca).

---

## 5. Buat Admin Pertama

1. Buka https://laundry-app-liart.vercel.app/register
2. Daftar akun baru
3. Supabase SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'email-anda@gmail.com';
```

---

## 6. Tes Login Google

1. Buka https://laundry-app-liart.vercel.app/login
2. Pilih role → **Lanjutkan dengan Google**
3. Setelah authorize, harus redirect ke `/dashboard` atau `/admin`

Jika gagal, Anda akan diarahkan ke `/login?error=auth_callback_failed&hint=...` — baca pesan `hint`.

### Troubleshooting

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| HTTP 500 di `/auth/callback` | Kode lama / env Supabase kosong | Push kode terbaru, set env Vercel, redeploy |
| `redirect_uri_mismatch` | Google redirect URI salah | Tambahkan URL Supabase callback di Google Console |
| Backend tidak terhubung | `NEXT_PUBLIC_API_URL` masih localhost | Set ke URL Railway, redeploy Vercel |
| Login OK tapi data kosong | Backend down atau CORS | Cek `/health` Railway, pastikan `FRONTEND_URL` benar |
| Role admin tidak jalan | Profile masih `pelanggan` | Jalankan SQL UPDATE di atas |

---

## 7. Struktur Repo untuk Deploy

```
laundry-app/
├── backend/          ← Railway root directory
│   ├── railway.toml
│   └── .env.railway.example
├── frontend/         ← Vercel root directory
│   ├── vercel.json
│   └── .env.vercel.example
└── supabase/         ← SQL migrations (manual di dashboard)
```

---

## 8. Local vs Production

| | Local | Production |
|---|-------|------------|
| Frontend | http://localhost:3000 | https://laundry-app-liart.vercel.app |
| Backend | http://localhost:4000 | https://xxx.up.railway.app |
| OAuth callback | http://localhost:3000/auth/callback | https://laundry-app-liart.vercel.app/auth/callback |
