# Favorit User App

Status 17 Oktober 2026: implementasi dan pengujian lokal selesai; grant/policy Favorit terverifikasi tersedia di DEV `fhapolumdqqewwhxnjcb`. Pengujian melalui perangkat belum dilakukan.

Saat preflight dengan persetujuan pengguna, kedua policy insert/delete dan grant authenticated ternyata sudah ada, identik dengan migrasi lokal, sementara versi 202610170001 belum tercatat. SQL tidak dijalankan ulang dan policy lama tidak diubah. Hanya `supabase migration repair 202610170001 --status applied --linked --project-ref fhapolumdqqewwhxnjcb` dijalankan untuk mencatat keadaan yang telah diverifikasi. Pemeriksaan sesudahnya: versi tercatat, grant INSERT/DELETE aktif, jumlah favorit tetap satu. Tidak ada data favorit ditambah/dihapus dalam pemeriksaan ini.

- Detail kos memiliki tombol Simpan kos / Tersimpan. Menekan Tersimpan menghapus favorit.
- Profil > Favorit membuka daftar terbaru, 20 kos per halaman, dengan pull-to-refresh, akses detail, dan hapus favorit.
- Kos yang tidak lagi publik ditampilkan sebagai Kos tidak tersedia, tetap bisa dihapus.
- Retry menggunakan primary key user_id + property_id dengan ON CONFLICT DO NOTHING, tanpa memperbarui waktu simpan favorit lama. Status diverifikasi kembali setelah operasi.
- Mode demo menyimpan favorit per akun selama sesi aplikasi; bukan penyimpanan permanen.

## Migrasi yang telah diverifikasi di DEV

`supabase/migrations/202610170001_favorites.sql` sesuai SQL yang disetujui pengguna: menambahkan grant INSERT/DELETE dan dua policy milik sendiri. Insert hanya untuk kos publik. Policy SELECT lama tidak diubah. Tidak ada perubahan storage, booking, auth, atau pembayaran.

Jalur root dipakai karena sumber kebenaran migrasi proyek adalah `supabase/migrations`.

Kesiapan grant/policy sudah terbukti di DEV; keberhasilan simpan/hapus dari aplikasi dan persistensi setelah login ulang tetap perlu diuji pada perangkat.

## Bukti lokal

- `npm test`: 91/91 lulus, termasuk 3 tes Favorit baru menggunakan SDK dengan transport palsu, mock, dan seluruh migrasi dalam PGlite lokal.
- Pengujian policy: baca/hapus lintas akun ditolak, insert atas nama akun lain ditolak, insert kos nonpublik ditolak, retry tidak menduplikasi, favorit kos diarsipkan tetap dapat dihapus pemiliknya, anon tidak dapat insert.
- Typecheck User lulus; lint User tanpa error dengan 3 warning lama RegisterScreen.
- Tes dan lint Owner berjalan; typecheck Owner masih gagal pada prop disabled/ aligned yang tidak sesuai definisi komponen di kode yang tidak disentuh tugas ini.
- Belum ada uji layar di perangkat maupun akses DEV.

## Uji manual DEV setelah izin terpisah

1. Konfirmasi project DEV sebelum koneksi, periksa status migrasi/policy aktif, lalu terapkan hanya migrasi tambahan ini setelah izin.
2. Akun A menyimpan kos publik, membuka Profil > Favorit, lalu membuka detailnya kembali.
3. Ulangi simpan/retry; pastikan hanya satu favorit. Tutup/buka aplikasi, pastikan favorit tetap ada.
4. Akun B tidak melihat atau dapat menghapus favorit A.
5. Hapus dari daftar; kembali ke detail, tombol kembali menjadi Simpan kos.
6. Putuskan jaringan saat simpan/hapus; UI harus menampilkan kegagalan dan retry tidak menduplikasi data.

Rollback UI: git revert commit fitur. Jangan menghapus data favorit atau mencabut policy tanpa persetujuan baru. Migrasi yang sudah diterapkan tidak diedit ulang.
