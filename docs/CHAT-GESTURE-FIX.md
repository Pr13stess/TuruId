# Perbaikan gesture viewer

Laporan pengguna: swipe dan pinch tidak bekerja di perangkat. Belum direproduksi pada perangkat oleh agent. Kode lama hanya meminta responder setelah gerakan dan membiarkan elemen gambar menerima sentuhan. Perbaikan mengambil responder sejak sentuhan pertama, mempertahankan native View target (collapsable=false), dan menjadikan gambar di dalam viewer noninteraktif agar tidak berebut responder.

Controller baru chatGesture.ts membaca koordinat touch langsung, menangani penambahan/pengurangan jari, mempertahankan zoom 1–4x dan pan, serta tidak berpindah foto ketika pinch/pan atau gesture dibatalkan. Viewer fullscreen kedua aplikasi diubah; upload, storage, kolase, dan backend tidak berubah. Tidak ada dependensi baru.

Validasi: npm test (67 tes), npm test --workspace=kosku-owner (32 tes), typecheck dan lint kedua workspace lolos. Tiga warning lama User RegisterScreen tetap ada. Tes baru mensimulasikan urutan koordinat sentuhan; bukan pengujian dispatch native Android. Diff file lama: CHAT-GESTURE-FIX-DIFF.patch.

Uji Android setelah reload penuh Expo: buka kolase minimal dua foto, geser kiri/kanan mulai dari tengah gambar; cubit dua jari untuk zoom; angkat satu jari lalu geser gambar; perkecil kembali sebelum pindah foto; geser turun untuk tutup. Tombol sebelumnya/berikutnya dan Tutup tetap tersedia. Di fullscreen, placeholder gambar tidak menerima tap retry; pembaruan URL otomatis tetap aktif, atau tutup dan buka kembali untuk mencoba memuat lagi.

Belum diverifikasi pada perangkat fisik. Tidak ada deploy atau push. Rollback dengan git revert commit perbaikan gesture.
