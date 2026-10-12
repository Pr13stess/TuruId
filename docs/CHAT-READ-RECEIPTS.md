# Ikon status chat User dan Owner

- Centang satu: pesan sendiri sudah tersimpan/terbaca kembali dari server, bukan konfirmasi diterima perangkat lawan bicara.
- Centang dua biru: waktu pesan lebih awal dari `last_read_at` peserta lain. Kolase memakai seluruh pesan fotonya; satu foto baru yang belum dibaca membuat status kolase tetap terkirim.
- Memakai RPC lama `communication_messages(cid)` untuk mencatat waktu baca dari server, lalu SELECT peserta melalui RLS lama. Tidak ada SQL, policy, migrasi, dependensi, atau deploy baru.
- Konvensi **dibaca = percakapan dibuka saat aplikasi aktif**, bukan pelacakan setiap bubble masuk viewport, atau bukti foto berhasil diunduh. RPC lama menandai waktu percakapan dan mengembalikan maksimal 300 pesan; payload ini tidak mengganti daftar pesan User.
- Polling receipt setiap 5 detik hanya ketika halaman fokus, aplikasi aktif, dan pemuatan pesan berhasil. Respons lama setelah pindah halaman diabaikan. Request yang sudah dikirim sebelum pindah halaman tidak dapat membatalkan penandaan server yang sudah terjadi.
- Owner kini mengambil 300 pesan terakhir melalui SELECT ber-RLS, dibalik urutannya untuk tampilan, tanpa efek marking read. Pemeriksaan sesi/profil ACTIVE dipertahankan di adapter. Penandaan server tetap menggunakan RPC yang memvalidasi akun aktif dan peserta.
- Jika endpoint/kolom belum tersedia atau koneksi gagal, tidak membuat status dibaca palsu; pengiriman pesan tetap memakai jalur lama. Tidak ada retry kirim atau ID pesan yang diubah.
- Mock/demo tidak mengarang receipt lawan bicara: hanya tampil terkirim.

## Validasi

Tes root mencakup kedua implementasi receipt: null/invalid/batas waktu, kolase parsial, parameter RPC, query peserta selain diri sendiri, error RPC dan query. Pengujian memakai SDK fetch mock, bukan Supabase DEV. Typecheck dan lint kedua aplikasi dijalankan; 3 warning lama pada RegisterScreen User tetap ada.

Belum diuji lintas perangkat/DEV pada pekerjaan ini. Tidak mengakses backend atau mengubah data di DEV. Uji manual: User kirim teks/foto saat Owner menutup chat (centang satu), buka chat Owner (centang dua dalam sekitar 5–10 detik), ulangi arah sebaliknya, buka layar lain/background lalu kirim pesan, uji offline, kolase dan retry kirim gagal. Akun ketiga tidak boleh membaca peserta/pesan lewat RLS. Centang read memerlukan kedua aplikasi versi baru untuk siklus baca dua arah yang konsisten.

Rollback kode menggunakan git revert commit fitur; tidak ada migrasi untuk dibalik dan receipt lama di server tidak dihapus.
