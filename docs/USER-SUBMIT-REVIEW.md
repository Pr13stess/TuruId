# Kirim rating/ulasan User

Status 17 Oktober 2026: implementasi lokal, belum diterapkan/diuji di DEV atau perangkat.

## Alur

Booking Saya > Selesai > Detail booking > Beri / lihat ulasan. Pilih bintang vektor 1–5, isi 5–2000 karakter, lalu kirim. Ulasan yang sudah ada ditampilkan bersama status moderasinya, tanpa tombol mengirim ulasan kedua.

Form mempertahankan payload yang sama setelah kegagalan pengiriman agar retry tidak berubah menjadi ulasan baru. Setelah kegagalan pengguna dapat memeriksa status untuk memulihkan respons sukses yang hilang. Saat keluar dengan isian belum tersimpan muncul konfirmasi. Draft hanya selama layar terbuka, tidak disimpan permanen. Kegagalan tetap ditampilkan; tidak memakai fallback mock pada mode Supabase.

Backend menurunkan kos dari booking, memeriksa profil aktif dan booking COMPLETED milik pemanggil. Row lock dan UNIQUE booking_id menjaga satu ulasan per booking. Retry isi sama mengembalikan ID lama; isi berbeda ditolak. Status selalu PENDING, tidak diterima dari client. Ulasan baru tidak menaikkan rating publik sampai disetujui.

## SQL

File baru `supabase/migrations/202610170003_user_reviews.sql` menyalin hanya RPC user_submit_review dari proposal yang sebelumnya ditampilkan. Tidak mencakup laporan kos, tidak mengubah migrasi lama, policy lama, booking, pembayaran, atau storage. Deploy DEV memerlukan izin terpisah.

## Pengujian

Hasil lokal: npm test 107/107; tes Owner 40/40; typecheck User lulus; lint kedua aplikasi tanpa error (tiga warning lama RegisterScreen). Error typecheck Owner disabled/aligned yang sebelumnya tercatat tidak disentuh. Tidak ada file Owner diubah.

`tests/submit-review.test.mjs`: validasi rating/teks, mock retry, kontrak SDK dengan filter user_id, RPC tidak tersedia, serta PGlite memakai seluruh migrasi root. Tes SQL memeriksa booking belum selesai, akun ketiga, input invalid, retry, status PENDING, property_id dari booking, penolakan perubahan moderasi oleh client, anon, dan akun nonaktif.

Mock checkout belum memiliki transisi COMPLETED dari UI; jangan mengubah booking nyata hanya untuk memunculkan tombol demo. Uji manual memerlukan booking yang diselesaikan melalui alur Owner yang sah. Tes menggunakan fixture lokal sebagai bukti aturan, bukan transaksi DEV.

## Batas demo

Admin Web belum punya moderasi review. Setelah migrasi diterapkan nanti, User bisa mengirim dan melihat status ulasannya sendiri, tetapi publikasi membutuhkan proses moderasi yang belum dikerjakan. Foto ulasan dan pengeditan ulasan tidak termasuk tahap ini. Laporan kos tetap ditunda.

Uji perangkat setelah izin apply DEV: gunakan booking COMPLETED milik akun uji; kirim ulasan; buka kembali untuk melihat PENDING; ulangi kiriman setelah respons terputus; pastikan tidak ganda dan belum tampil pada daftar publik. Akun lain/belum selesai tidak boleh mengirim.

Rollback frontend: revert commit fitur. Jangan menghapus fungsi atau data backend tanpa izin baru setelah migrasi diterapkan.
