# Balas ulasan — hasil implementasi lokal

17 Oktober 2026. Implementasi dan tes lokal selesai; migrasi balasan telah diterapkan ke DEV fhapolumdqqewwhxnjcb atas persetujuan pengguna. Belum diuji di perangkat. Tidak ada push, dependensi baru, atau perubahan policy lama.

## Hasil penerapan DEV

- Preflight: project-ref lokal cocok DEV; kolom/RPC balasan belum ada, versi migrasi belum tercatat. RLS aktif, hanya policy SELECT reviews_select; anon/authenticated tidak memiliki UPDATE tabel atau grant UPDATE kolom. Ada satu ulasan APPROVED.
- Menjalankan hanya `supabase.cmd db query --linked --project-ref fhapolumdqqewwhxnjcb --file supabase/migrations/202610170004_owner_review_reply.sql`, berhasil.
- Mencatat versi dengan `supabase.cmd migration repair 202610170004 --status applied --linked --project-ref fhapolumdqqewwhxnjcb`, berhasil. Tidak menggunakan db push atau menerapkan migrasi lain.
- Verifikasi: kedua kolom nullable dan constraint terpasang; RPC security definer dengan search_path kosong, authenticated boleh EXECUTE, anon tidak. Authenticated tetap tidak memiliki UPDATE tabel; RLS dan policy SELECT identik dengan preflight. owner_read masih memuat to_jsonb(r).
- Jumlah ulasan tetap 1, jumlah balasan 0. Tidak menulis balasan percobaan atau mengubah moderasi ulasan nyata.
- Bukti DEV ini memverifikasi penerapan schema/izin, bukan keberhasilan kirim dan tampil melalui Android. Uji akun Owner → User masih perlu dilakukan melalui aplikasi.

## Hasil

Owner membuka detail kos → Ulasan → Balas ulasan. Satu balasan 1–2000 karakter per ulasan yang disetujui. Setelah percobaan kirim, isi terkunci untuk retry yang sama. Jika respons hilang, gunakan Periksa status balasan. Balasan yang tersimpan ditampilkan di Owner dan pada daftar/preview ulasan User. Tidak ada edit/hapus balasan atau notifikasi baru.

Draft hanya selama komponen terbuka; keluar dari halaman/aplikasi dapat membuang draft. Balasan yang sudah diterima server tetap tersimpan dan dibaca saat membuka ulang halaman. Mode demo Owner menyimpan lokal; tidak tersinkron ke User dan bukan bukti integrasi DEV.

## Database

Migrasi baru `supabase/migrations/202610170004_owner_review_reply.sql` sesuai SQL proposal: dua kolom nullable di reviews, constraint, dan RPC owner_reply_review. Tidak mengubah migrasi atau policy lama. Jalur root mengikuti addendum SPEC. Pembacaan owner_read yang memakai to_jsonb otomatis membawa kolom baru; tidak perlu mengganti RPC lama. Reader User fallback hanya untuk error kolom balasan belum tersedia, bukan error jaringan/izin.

Migrasi sudah diterapkan ke DEV sesuai hasil di atas. Untuk lingkungan lain, konfirmasi target dan periksa definisi/grant aktual reviews serta riwayat migrasi terlebih dahulu. Jika ada grant UPDATE luas atau schema konflik, berhenti; jangan mengubah policy/grant lama tanpa persetujuan baru. Jangan menggunakan db push yang bisa ikut menerapkan migrasi lain yang belum diizinkan.

## Validasi lokal

- `npm.cmd run typecheck --workspace=kosku-owner`: lulus.
- `npm.cmd run typecheck --workspace=@kosku/user-app`: lulus.
- `npm.cmd run lint --workspace=kosku-owner`: lulus.
- `npm.cmd run lint --workspace=@kosku/user-app`: tanpa error, tiga warning lama RegisterScreen.
- `npm.cmd run test --workspace=kosku-owner`: 43 tes lulus.
- `npm.cmd test`: 109 tes lulus.
- Tes khusus: Unicode/batas teks, double tap, payload tetap setelah kegagalan, SDK RPC, schema lama, kegagalan reader, mock immutable, SQL kepemilikan/role/status/moderasi, direct update ditolak, retry tidak mengubah timestamp, balasan tersembunyi bersama ulasan.
- SQL diuji memakai PGlite dengan migrasi root dan seed lokal. Tidak membuktikan konfigurasi DEV atau tampilan Android.
- Perubahan assertion tes lama hanya kolom SELECT yang bertambah; pemeriksaan filter APPROVED, property, pagination, dan error tetap ada.

## Uji manual setelah izin apply DEV

1. Gunakan ulasan APPROVED pada kos milik akun owner uji. Ulasan PENDING tidak dibuat publik secara manual untuk demo; moderasi admin masih pekerjaan terpisah.
2. Buka Owner → detail kos → Ulasan. Kirim balasan. Buka ulang dan pastikan isi tetap ada.
3. Buka User → detail kos → preview dan Lihat ulasan, refresh; balasan harus sama dan tanpa tombol edit owner.
4. Coba jaringan gagal saat kirim, pulihkan lalu Periksa status/Coba kirim lagi. Hanya satu balasan dan satu timestamp; isi tidak berubah.
5. Uji akun owner kos lain/non-owner lewat RPC, pastikan ditolak. Teks kosong/lebih 2000 karakter ditolak. Ulasan lama tanpa balasan tetap tampil.

## Rollback

Revert commit fitur untuk mengembalikan aplikasi. Bila migrasi kelak sudah diterapkan, biarkan kolom/RPC dan data aditif tetap ada; jangan DROP atau menghapus balasan. Tidak ada objek storage tersentuh. SQL balasan tidak mengaktifkan migrasi submit ulasan atau moderasi admin secara otomatis.

Diff seluruh file lama tersedia di OWNER-REVIEW-REPLY-DIFF.md.
