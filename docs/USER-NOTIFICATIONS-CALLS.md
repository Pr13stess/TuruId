# Notifikasi dan panggilan User App

## Status pengerjaan lokal

Daftar notifikasi tersedia dari Beranda dan Profil: 20 per halaman, pull-to-refresh, polling 15 detik saat halaman fokus, status belum dibaca, dan membuka target BOOKING/CHAT/PROPERTY. Jenis lain tetap dapat dibaca tanpa menebak tujuan navigasi. CALL belum membuka layar panggilan.

Query membaca tabel notifications dengan filter recipient_id akun aktif. Tandai dibaca menggunakan RPC owner_profile action read yang sudah terdapat di jalur migrasi Owner. Dari kode SQL, aksi ini memeriksa profil ACTIVE dan recipient_id; tidak membuat profil owner atau mengubah role. Keberadaan dan perilakunya di DEV belum diperiksa. Jika RPC tidak tersedia, aplikasi menampilkan error, bukan mengklaim berhasil dibaca.

Tidak ada SQL, perubahan policy, dependensi baru, akses backend atau deploy pada tahap ini. Mock menampilkan daftar kosong, bukan notifikasi palsu.

## Verifikasi

- npm test: 92/92 lulus, termasuk tes SDK lokal untuk filter recipient, paginasi, pemanggilan RPC read dan kegagalan jaringan/izin.
- Typecheck User lulus; lint User lulus dengan tiga warning lama RegisterScreen.
- Tes Owner 40/40 dan lint Owner lulus. Typecheck Owner diketahui gagal pada prop disabled/aligned dari pekerjaan sebelumnya; kode Owner tidak diubah.
- Belum diuji pada perangkat atau Supabase DEV. Tes transport palsu bukan bukti notifikasi terkirim.

## Pekerjaan yang masih menunggu

Panggilan audio/video User dan push belum diimplementasikan. Perlu persetujuan dependensi react-native-agora, expo-audio, expo-notifications, expo-device, expo-dev-client, mengikuti versi Owner. Ukuran direktori paket lokal masing-masing sekitar 4,62 / 1,27 / 1,56 / 0,29 / 0,05 MiB, tidak termasuk seluruh dependensi transitif/SDK native dan bukan estimasi tambahan APK. Membutuhkan Development Build.

Backend Owner mempunyai communication_start, communication_call, agora-token dan owner-maintenance. Belum diverifikasi bahwa semuanya diterapkan di DEV. Registrasi device pada owner_profile saat ini mengunci app_kind OWNER_APP; tidak boleh dipakai begitu saja untuk token User. Solusi User membutuhkan proposal SQL/RPC tambahan dan izin terpisah, tanpa mengubah policy lama atau menggabungkan jalur migrasi.

Jalur kirim pesan User perlu diaudit untuk event notifikasi dua arah: keberadaan halaman notifikasi tidak membuktikan setiap pesan menghasilkan event. Deduplikasi, pengiriman push dan token per instalasi juga belum dibuktikan di DEV.

Langkah berikut: setelah izin dependensi, implementasi panggilan User dan kontrol media, penerimaan panggilan saat aplikasi aktif, serta integrasi navigasi dari notifikasi. Tampilkan SQL tambahan yang diperlukan sebelum dibuat/diterapkan. Uji DEV/deploy hanya setelah izin. Tidak menganggap push biasa menjamin layar incoming call muncul saat aplikasi dihentikan.
