# Google OAuth — Fix redirect_uri_mismatch

Error **400: redirect_uri_mismatch** = URI di Google Cloud **tidak sama persis** dengan callback Supabase.

## URL proyek LaundryApp Anda

| Tempat | URL |
|--------|-----|
| **Google Cloud → Authorized redirect URIs** | `https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback` |
| **Supabase → Redirect URLs** | `http://localhost:3000/auth/callback` |
| **Supabase → Site URL** | `http://localhost:3000` |

## Perbaikan cepat (5 menit)

### 1. Google Cloud Console

1. Buka [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Klik **OAuth 2.0 Client ID** aplikasi LaundryApp
3. Di **Authorized redirect URIs**:
   - **Hapus** URI yang salah (mis. `http://localhost:3000/auth/callback`)
   - Klik **Add URI**
   - Paste **tepat** (copy-paste, jangan ketik manual):

```
https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback
```

4. Klik **Save**
5. Tunggu **1–5 menit** agar Google menerapkan perubahan

### 2. Verifikasi di Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → project Anda
2. **Authentication** → **Providers** → **Google**
3. Salin **Callback URL (for OAuth)** — harus identik dengan URI di atas
4. Pastikan **Enable Sign in with Google** = ON
5. Client ID & Client Secret terisi → **Save**

### 3. Supabase URL Configuration

**Authentication** → **URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 4. Tes ulang

1. Restart frontend: `npm run dev`
2. Buka `http://localhost:3000/login` (gunakan **localhost**, bukan 127.0.0.1)
3. Klik **Masuk dengan Google**

## Kesalahan umum

| Salah | Benar |
|-------|-------|
| `http://localhost:3000/auth/callback` di Google Cloud | `https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback` |
| `https://...supabase.co/auth/v1/callback/` (ada `/` di akhir) | Tanpa trailing slash |
| `http://` untuk Supabase callback | Harus `https://` |
| Typo project ref | `upekqyrncipkgbpazrzm` |

## Alur OAuth (memahami 2 redirect berbeda)

```
Browser → Google login
       → redirect ke Supabase: .../auth/v1/callback   ← ini yang didaftarkan di GOOGLE
       → Supabase → redirect ke app: localhost:3000/auth/callback   ← ini yang didaftarkan di SUPABASE
       → Dashboard
```
