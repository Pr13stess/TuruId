# Kesiapan demo Owner — 17 Oktober 2026

## Cakupan sesi

Agora, hapus akun, dan laporan pengguna tidak dilanjutkan. Kode lama fitur tersebut dipertahankan. Push masih ditunda sesuai addendum SPEC; tidak ada instalasi dependensi, akses backend, SQL, atau deployment dalam sesi ini.

## Perbaikan lokal

- Field mendukung disabled: input benar-benar tidak bisa diedit saat pemanggil menguncinya selama penyimpanan.
- Menghapus prop layout aligned yang sudah tidak digunakan dari halaman properti, notifikasi, dan panggilan. Perubahan halaman panggilan hanya prop layout, tidak menyentuh Agora.
- Teks produk menjadi TuruId Owner/Aktivitas TuruId; bukti dummy disebut bukti uji/verifikasi. Instruksi memakai dokumen contoh dan label simulasi pembayaran tetap dipertahankan.
- Koreksi audit sebelumnya: Owner sudah memiliki tab Ulasan di PropertyEditor, dipasok dari PropertyScreens. Belum ada balasan owner. Tidak perlu membuat halaman baca ulasan kedua.

## Validasi

- Typecheck Owner dan User lulus.
- Lint Owner lulus; User tanpa error dengan tiga warning lama di RegisterScreen.
- Suite Owner lulus; suite root 107/107 lulus.
- Percobaan tes pertama terhalang sandbox Windows (uv_os_get_passwd ENOMEM); rerun di luar sandbox berhasil, tanpa mengubah atau melewati tes.
- Tes database memakai PGlite lokal; bukan bukti RPC, Storage, realtime, atau pembayaran DEV.

## Pekerjaan lanjutan dan batas izin

### Perbaikan lokal booking berikutnya

- Daftar/detail booking memuat ulang saat mendapat fokus dan setiap 15 detik selama layar terpilih; timer dihentikan saat meninggalkan layar. Ada tombol muat ulang manual, dan data sebelumnya dipertahankan selama pemuatan.
- Detail yang tidak ditemukan memiliki pesan kosong yang jelas. Check-in/checkout dikunci saat pemuatan/error, saat menyimpan, atau catatan kurang dari 5 karakter (sesuai kontrak RPC lama).
- Editor inventory mengunci pengubah angka, catatan, dan tombol simpan selama penyimpanan. Tidak mengubah rumus kapasitas, RPC, atau transaksi backend.
- Uji perangkat yang masih diperlukan: booking baru muncul tanpa membuka ulang tab, pindah kembali ke detail memperbarui status, kesalahan jaringan terlihat dan dapat dicoba lagi, simpan inventory tidak menerima perubahan angka selama proses.

1. Uji perangkat/DEV: owner membuat kos dan kamar, admin memverifikasi owner dan kos, owner mempublikasikan; User melihat listing. Periksa paket harga aktif dan kapasitas tersedia.
2. Booking User muncul di Owner; check-in sekali dan retry tidak menggandakan occupied; checkout sekali dan retry memindahkan kapasitas ke cleaning sekali; setelah dibersihkan kapasitas kembali tersedia.
3. Chat dua arah: teks, beberapa gambar, retry sebagian, gambar lama, tanda baca, keyboard, viewer swipe/zoom. Tes lokal tidak menggantikan uji sentuh Android.
4. Pembatalan khusus/refund: Owner sudah memanggil owner_booking action exception, tetapi Admin Web hanya menangani verifikasi. Siapkan desain dan SQL baru untuk penanganan admin sebelum implementasi; jangan menjadikan sukses UI sebagai bukti refund provider. Pembayaran Xendit sandbox memerlukan audit dan persetujuan terpisah untuk akses DEV.
5. Ulasan: pembacaan Owner sudah ada; publikasi ulasan User masih bergantung migrasi submit dan moderasi admin. Foto ulasan tetap mengikuti proposal REVIEW-PHOTOS-PROPOSAL.md yang belum disetujui untuk SQL/deploy.

Sebelum langkah 1–3 yang mengakses backend, minta izin spesifik DEV fhapolumdqqewwhxnjcb. Tidak ada izin produksi atau push git. Jangan mengubah status booking nyata secara manual demi menyiapkan demo.
