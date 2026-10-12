# TuruId Admin — verifikasi owner & kos

Web app khusus dua modul: **Verifikasi owner** dan **Verifikasi kos**. Tidak ada modul pembayaran, booking, laporan, atau pengelolaan akun. Dibangun dengan React dan Expo web memakai library/versi yang sudah ada di monorepo; tidak ada paket baru yang diunduh untuk fitur ini.

## Menjalankan

1. Dari root, jalankan `npm.cmd install` jika workspace belum terpasang.
2. Salin `.env.example` menjadi `.env` di folder ini. Isi **publishable/anon key DEV** yang sama dengan aplikasi lain. Jangan gunakan service-role/secret key. URL dibatasi ke `https://fhapolumdqqewwhxnjcb.supabase.co`.
3. Jalankan `npm.cmd run start --workspace=@turuid/admin-web` dari root, lalu buka alamat lokal yang ditampilkan (port 8083).
4. Masuk dengan akun yang sudah diberi role ADMIN oleh pengelola. Tidak ada signup atau peningkatan role mandiri. Session browser menggunakan key terpisah dari aplikasi mobile.

**Saat ini antrean dan keputusan membutuhkan SQL baru yang belum disetujui/dipasang.** UI menampilkan layanan belum aktif jika RPC belum tersedia. Tidak ada fallback sukses palsu/demo. Tidak ada backend atau akun admin yang diubah saat pembuatan app.

## Alur

- Pilih tab Owner atau Kos, filter Menunggu/Disetujui/Ditolak, lalu pilih pengajuan (20 item per halaman).
- Periksa informasi dan buka bukti gambar privat. URL signed berlaku 5 menit dan diperbarui setiap 4 menit selama panel terbuka. Bukti saat ini mendukung format owner-upload: `owner-media/{owner}/verification/{file}.jpg|jpeg|png`.
- Tombol keputusan aktif setelah bukti berhasil tampil dan pengajuan merupakan pengajuan terbaru yang menunggu.
- Setujui dengan catatan opsional, atau tolak dengan alasan wajib minimal 5 dan maksimal 2.000 karakter. Konfirmasi sebelum menyimpan.
- UI tidak menyatakan berhasil sampai RPC sukses. Retry membawa ID pengajuan, keputusan, alasan, dan timestamp yang sama. Konflik versi/status meminta muat ulang.
- Persetujuan owner tidak otomatis menyetujui kos. Persetujuan kos tidak mengubah publication_status. Ini harus dijamin backend, bukan hanya UI.

## Backend yang diajukan

[SQL lengkap](../../docs/ADMIN-VERIFICATION-SQL.md): dua RPC baru, tanpa policy baru atau perubahan policy/migrasi lama. Belum menjadi file migrasi aktif dan belum dieksekusi, termasuk di PGlite. Tunggu izin sebelum pengujian SQL baru/apply/deploy. Proposal video sebelumnya tetap terpisah.

Tidak memakai service-role di browser. Guard UI/adapter hanya lapisan tambahan; semua RPC memeriksa `private.is_admin()` dan akses bukti memakai policy Storage lama. Role admin tidak dibuat oleh aplikasi. Trigger notifikasi verifikasi yang sudah ada dapat berjalan sebagai akibat perubahan status; tidak ada perubahan trigger/push pada task ini.

## Pemeriksaan

```text
npm.cmd run typecheck --workspace=@turuid/admin-web
npm.cmd run lint --workspace=@turuid/admin-web
npm.cmd test --workspace=@turuid/admin-web
npm.cmd run build --workspace=@turuid/admin-web
```

Root `typecheck`, `lint`, dan `test` yang sudah ada tidak otomatis mencakup Admin/Owner. Gunakan perintah workspace masing-masing. Tes admin memakai SDK Supabase dengan fetch mock, tanpa akses backend. SQL penguncian/idempotensi dan RLS DEV belum terbukti oleh tes adapter.

Untuk uji DEV setelah izin: login admin dan non-admin; buka bukti privat; approve owner saja lalu periksa kos tetap belum approved; approve kos dan pastikan publikasi tetap sama; tolak dengan alasan; submit ulang dari Owner; coba dua admin, retry response hilang, dan edit properti ketika sedang ditinjau. Periksa audit, satu keputusan per submission, penolakan akses non-admin/inaktif, serta trigger notifikasi lama. Browser manual dan akses DEV belum diuji oleh agent.

## Rollback

Revert commit admin lokal. Sebelum backend diaktifkan, tidak ada perubahan data untuk dipulihkan. Setelah proposal SQL nanti diterapkan, rollback aplikasi tidak membatalkan keputusan yang sudah diambil; jangan menghapus audit atau memakai DROP/reset untuk membatalkan fitur.
