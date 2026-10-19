# Hosting Admin Web di Vercel

Backend tetap Supabase DEV `fhapolumdqqewwhxnjcb.supabase.co`.
Deployment web tidak menjalankan migrasi atau membuat role admin.

## Pengaturan proyek

- Root Directory: `apps/admin-web`.
- Framework Preset: Other.
- Aktifkan akses file di luar Root Directory untuk workspace npm monorepo.
- Build Command: `npm run build` (diatur dalam `vercel.json`).
- Output Directory: `dist` (diatur dalam `vercel.json`).
- Environment build: `EXPO_PUBLIC_SUPABASE_URL` dan
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari DEV.
  Hanya public/publishable key, bukan service-role key.
- `.env` lokal tidak masuk Git. Isi env pada proyek Vercel sebelum build remote.
- Jika environment berubah, deploy ulang agar konfigurasi masuk bundle web.

## Pemeriksaan sebelum deploy

Jalankan dari root repository:

```powershell
npm.cmd run typecheck --workspace=@turuid/admin-web
npm.cmd run lint --workspace=@turuid/admin-web
npm.cmd test --workspace=@turuid/admin-web
npm.cmd run build --workspace=@turuid/admin-web
```

Login CLI menggunakan `npx vercel@latest login`. Jangan membagikan token atau
password lewat chat. Deploy lewat CLI tidak memerlukan push Git.
Setelah deploy, pastikan halaman login tampil dan aset berhasil dimuat.
Pengujian keputusan admin harus memakai akun uji DEV yang memiliki role ADMIN.

Konfigurasi SPA mengikuti [panduan Expo untuk Vercel](https://docs.expo.dev/guides/publishing-websites/#vercel).
