# Booking User App

Status lokal, 17 Oktober 2026: tab daftar dan detail sudah diimplementasikan; belum diuji end-to-end di Supabase DEV atau perangkat Android.

## Perilaku

- Tab Booking menampilkan pesanan akun yang login, terbaru dahulu, 20 per halaman.
- Filter Semua, Menunggu bayar, Aktif, Selesai, dan Dibatalkan; tersedia pull-to-refresh dan pembaruan berkala saat halaman aktif.
- Detail memakai snapshot nama dan nominal booking, tanggal masuk/keluar, serta catatan pembayaran dan refund yang sudah ada.
- Booking HELD/PENDING_PAYMENT dapat membuka kembali checkout yang sudah ada. Setelah checkout berakhir, pengguna dapat membuka detail booking.
- Query daftar/detail membatasi user_id secara eksplisit, selain RLS server. Tidak ada perubahan SQL, policy, Function, atau alur pembayaran.
- Mode mock mengikuti checkout selama sesi aplikasi. Data mock bukan bukti transaksi DEV.

## Batas yang belum selesai

- Pembayaran Xendit, webhook, pembatalan, expiry, dan perubahan status lintas Owner/User perlu diuji bersama di DEV dengan izin terpisah.
- Pengajuan pembatalan setelah pembayaran sukses/refund dari User belum tersedia. Detail hanya membaca refund yang tercatat.
- Status mengikuti server; daftar tidak mengubah hold kedaluwarsa sendiri. Pengujian perlu memastikan pekerjaan expiry server berjalan.
- Jalur checkout lama untuk membuat ulang sesi pembayaran saat redirect URL kosong belum diubah; perlu diuji sebelum demo pembayaran.

## Validasi lokal

- `npm test`: 86 tes lulus, termasuk 5 tes Booking baru (validasi snapshot, filter/paginasi, error, pembatasan pemilik pesanan, siklus mock).
- `npm run test --workspace=kosku-owner`: 40 tes lulus. Sandbox Windows awalnya menghalangi tsx dengan uv_os_get_passwd ENOMEM; pengulangan di luar sandbox lulus tanpa mengubah tes.
- Tes query menggunakan SDK dengan transport palsu; tes database memakai PGlite, bukan Supabase DEV.

## Uji manual berikutnya

1. Mode mock: pilih kos/kamar/paket, mulai checkout, buka tab Booking; pastikan muncul di Menunggu bayar.
2. Buka detail, lanjutkan checkout, simulasikan berhasil; periksa status Terkonfirmasi pada filter Aktif dan nominal snapshot.
3. Buat pesanan lain lalu batalkan atau tunggu expiry; periksa status, filter, dan pull-to-refresh.
4. Di DEV setelah izin: ulangi dengan dua akun User berbeda, pastikan daftar/detail tidak membuka pesanan akun lain; uji kegagalan jaringan dan coba lagi.
5. Bayar sandbox dan lakukan check-in/checkout dari Owner; pastikan User menampilkan status server. Verifikasi refund tercatat bila ada.

Rollback lokal: revert commit fitur Booking. Tidak ada migrasi atau data backend yang perlu dibatalkan.
