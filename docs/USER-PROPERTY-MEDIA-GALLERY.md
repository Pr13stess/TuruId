# Galeri video dan foto User — 19 Oktober 2026

Pembaruan fullscreen: foto dan video memakai satu pager horizontal native agar media bergeser berdampingan. Gerakan vertikal dan swipe-down untuk menutup dihapus; gunakan tombol X atau tombol Back Android. Pinch zoom foto tetap tersedia dengan pan horizontal saja. Teks petunjuk disesuaikan. Tidak ada perubahan pada gestur galeri chat.

Validasi pembaruan: 9 tes terarah (propertyPhotoZoom, propertyGallery, chatGesture), typecheck User, dan lint User lulus (3 warning lama RegisterScreen). Kelancaran swipe dan pinch perlu dikonfirmasi di perangkat Android; belum diuji di perangkat nyata.

Detail kos memakai satu galeri: video (jika tersedia) di indeks pertama, diikuti foto sesuai urutan semula. Preview video dimuat melalui signed URL yang sudah ada, tanpa autoplay atau pembuatan thumbnail/bucket baru. Pengguna menggeser halaman dengan indikator titik di dalam bagian bawah foto/video tanpa bar latar (titik aktif oranye tema, lainnya putih dengan garis tepi navy). Tombol Video/Foto dan teks Perbesar diganti ikon fullscreen di sudut kanan atas. Ikon ini membuka galeri fullscreen pada media terpilih; video dapat digeser ke foto pertama, foto tetap mendukung pinch zoom dan swipe. Tombol sebelumnya/berikutnya dan indikator mencakup kedua jenis media.

Hanya video pada halaman aktif yang dipasang. Membuka fullscreen melepas player inline; berpindah ke foto, meninggalkan layar, atau masuk background melepas player melalui useVideoPlayer. Cleanup tidak memanggil pause pada player yang sudah dirilis. Saat kembali, player dimuat ulang dalam keadaan berhenti; posisi pemutaran tidak dipertahankan.

File lama berubah: PropertyDetailScreen (menggunakan komponen galeri), PropertyPhotoViewer (media campuran), PropertyVideo (preview langsung, status loading/error dan lifecycle aman). File baru: domain/propertyGallery, PropertyMediaGallery, tes propertyGallery. Tidak ada backend, SQL, dependensi baru atau push.

Validasi lokal: 111 tes root/User lulus, typecheck User lulus, lint tanpa error (3 warning lama RegisterScreen), export bundle Android lulus. Tes memeriksa urutan video-foto, pemetaan indeks fullscreen, properti tanpa video/foto dan daftar kosong. Belum diuji visual atau gestur pada perangkat Android nyata.

Uji manual: reload User, buka kos dengan video, pastikan preview paling depan; play lalu geser ke foto dan pastikan suara berhenti. Perbesar video, geser ke foto, kembali ke video lewat tombol sebelumnya. Buka foto kedua dan perbesar untuk memastikan indeks sesuai. Uji kos tanpa video, rotasi layar, kembali dari background, dan menutup halaman ketika video masih loading. Preview memerlukan waktu untuk mengambil video; kegagalan menyediakan tombol Muat ulang video.
