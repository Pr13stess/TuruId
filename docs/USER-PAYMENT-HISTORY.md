# Riwayat pembayaran User

Profil > Riwayat pembayaran sekarang membuka transaksi dari tabel payments, terbaru dahulu, 20 per halaman. Kartu menampilkan nama kos dari snapshot booking, kode booking, nominal transaksi, tanggal dibuat, dan status pembayaran. Tekan kartu untuk detail booking dan rincian refund yang sudah tersedia di sana.

Ada pull-to-refresh, reload saat kembali ke halaman, polling 15 detik saat fokus, serta tampilan kosong/error dengan retry. Ini riwayat semua status transaksi, bukan hanya pembayaran sukses dan bukan total uang yang telah dibayarkan. Label sandbox tetap tampil.

Query memakai bookings!inner dan filter bookings.user_id akun login. Ini membatasi daftar pada booking milik User meskipun akun juga berperan Owner/Admin. Tidak ada perubahan proses bayar, SQL, RLS, Function, atau dependensi.

## Validasi lokal

- npm test: 102/102 lulus, termasuk tiga tes baru validasi data, query SDK dengan transport palsu, dan perubahan status checkout mock.
- npm run typecheck --workspace=@kosku/user-app: lulus.
- npm run lint --workspace=@kosku/user-app: tanpa error, tiga warning lama RegisterScreen.
- npm run test --workspace=kosku-owner: 40/40 lulus; lint Owner lulus.
- Error typecheck Owner disabled/aligned yang sudah dicatat sebelumnya tidak diperbaiki dalam tugas ini; tidak ada file Owner diubah.

Belum mengakses backend DEV atau menjalankan UI pada perangkat. Tes SDK memastikan bentuk request, belum membuktikan respons PostgREST DEV. Mock menggunakan checkout sesi yang sudah ada dan bukan bukti isolasi login/transaksi di backend.

## Uji manual

1. Buka Profil > Riwayat pembayaran dengan akun yang punya transaksi; cocokkan status, nominal, kos, dan kode booking dengan detail booking.
2. Ketuk kartu, lalu kembali; tarik refresh untuk memperbarui data.
3. Akun tanpa transaksi menampilkan halaman kosong. Gangguan jaringan menampilkan error, bukan daftar kosong yang menyesatkan.
4. Akun berbeda atau akun dengan role User+Owner hanya boleh melihat pembayaran booking yang dibuatnya sebagai User.

Rollback: revert commit fitur ini; tidak ada perubahan database yang perlu dibatalkan. Tidak di-push.
