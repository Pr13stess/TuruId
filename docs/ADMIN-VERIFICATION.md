> Pembaruan 12 Oktober 2026: SQL verifikasi telah disetujui, diuji lokal, dan diterapkan ke DEV fhapolumdqqewwhxnjcb. [Hasil dan batas pengujian](ADMIN-VERIFICATION-DEV.md). Keterangan belum diterapkan di bawah adalah catatan tahap awal.

# Admin verifikasi — hasil lokal, 12 Oktober 2026

Aplikasi baru di `apps/admin-web`, khusus verifikasi owner dan kos yang terpisah. Folder mengikuti SPEC; npm workspace `@turuid/admin-web`. Menggunakan React + Expo web dan dependensi yang sudah terpasang. Root workspaces `apps/*` tetap, tidak mengubah scripts default atau kode User/Owner.

Yang dibuat: login admin, pemeriksaan role ADMIN dan akun ACTIVE, dua tab verifikasi, filter Menunggu/Disetujui/Ditolak, pagination 20 item, detail pengajuan, bukti gambar privat melalui URL 5 menit dengan pembaruan 4 menit, konfirmasi persetujuan, alasan penolakan wajib 5–2.000 karakter, feedback error/empty/loading, serta penanganan konflik versi. Data berubah atau pengajuan lama tidak dapat diputuskan dari UI. Backend tetap wajib memeriksa semuanya.

Proposal [SQL verifikasi](ADMIN-VERIFICATION-SQL.md) menambah dua RPC tanpa mengubah policy lama. **Belum disetujui, belum diuji SQL, belum diterapkan ke DEV.** App menampilkan layanan belum aktif ketika RPC belum ada; tidak ada mock sukses. Tidak ada akun atau role ADMIN yang dibuat, deploy web, atau akses backend pada tahap ini. Proposal SQL video sebelumnya tetap terpisah dan belum disetujui.

Konfigurasi lokal `.env` Admin sudah disiapkan hanya dari URL dan publishable/anon key User App, setelah memastikan ref DEV `fhapolumdqqewwhxnjcb`. File diabaikan Git dan nilainya tidak dicetak. Tidak menyalin password atau secret. Session admin memiliki storage key sendiri. Untuk menjalankan:

```text
npm.cmd run start --workspace=@turuid/admin-web
```

Gunakan alamat lokal port 8083 yang ditampilkan dan akun admin yang sudah diberikan pengelola. [README](../apps/admin-web/README.md) memuat alur, setup dari checkout baru, serta uji manual.

| Pemeriksaan lokal | Hasil |
|---|---|
| `npm.cmd test --workspace=@turuid/admin-web` | 8/8 lolos, SDK fetch mock; bukan RLS/DEV |
| `npm.cmd test` | 73/73 lolos |
| `npm.cmd test --workspace=kosku-owner` | 38/38 lolos |
| Typecheck ketiga aplikasi | Lolos |
| Lint ketiga aplikasi | Tanpa error; 3 warning lama RegisterScreen User |
| Expo export Admin web offline | Lolos, `.expo/admin-verification-web` |
| `git diff --check` | Lolos |

Typecheck awal menemukan deklarasi CSS dan nullability; diperbaiki. Lint menemukan import Buffer tes yang belum eksplisit; diperbaiki tanpa menonaktifkan aturan atau mengurangi tes. Tes memastikan config hanya DEV/public key, non-admin/inaktif ditolak sebelum endpoint admin, alasan penolakan wajib, format bukti dibatasi, signed URL bertenggat, payload retry identik, konflik ditampilkan, dan tidak ada sukses palsu saat RPC hilang.

File baru utama: `App.tsx` (UI dan sesi), `src/styles.css`, `src/repository.ts` (Supabase), `src/verification.ts` (validasi), `tests/verification.test.mjs`, konfigurasi workspace, README, dan proposal SQL. **Satu-satunya file lama yang berubah: root `package-lock.json`**, hanya registrasi workspace dan link Admin; tidak ada versi package baru. Diff: [ADMIN-VERIFICATION-DIFF.patch](ADMIN-VERIFICATION-DIFF.patch).

Belum terbukti: login admin/non-admin nyata, render/interaksi browser manual, pembacaan bukti privat DEV, keputusan atomik, dua admin bersamaan, audit tunggal saat retry, pembaruan hasil di Owner, atau efek trigger notifikasi lama. Pengujian SQL baru menunggu izin. Akun ADMIN harus sudah tersedia/diberikan oleh pengelola melalui tindakan terpisah yang diizinkan.

Langkah berikut setelah izin: verifikasi env aktif dan prasyarat schema DEV secara read-only; jadikan proposal migrasi root baru; uji lokal isolasi akses/locking/idempotensi/audit; ajukan perubahan bila SQL perlu direvisi; apply hanya migrasi yang disetujui. Tidak perlu deploy Edge Function baru untuk modul ini. Deploy situs web juga menunggu persetujuan. Rollback app memakai git revert; jangan menghapus keputusan/audit atau DROP/reset database.
