# Pemeriksaan publikasi kos (lokal)

Detail kos Owner sekarang menampilkan kartu Status tampil di User: verifikasi owner, verifikasi kos, status tayang, kamar aktif, dan keberadaan paket aktif. Periksa ulang memuat ulang dashboard dan data pendukung. Tombol Atur status tayang membuka formulir lama, dengan penjelasan bahwa penyimpanan mengajukan verifikasi ulang.

Temuan kode:

- `apps/owner-app/supabase/migrations/202610020001_owner.sql`: owner_save_property mengubah verification_status menjadi PENDING saat update, termasuk perubahan publication_status saja. Belum diverifikasi terhadap definisi RPC DEV terbaru. Tidak diubah pada tahap ini.
- `supabase/migrations/202609270003_catalog.sql`: pencarian melakukan join kamar dan paket aktif dengan periode sesuai pilihan. Tidak mewajibkan video atau kapasitas tersedia positif. Koreksi audit sebelumnya: kos penuh bukan otomatis hilang dari pencarian berdasarkan query ini.
- Kartu kesiapan bukan jaminan tampil: status akun server, filter User, periode/harga/jarak juga berlaku. Kartu belum memeriksa status akun karena model profil Owner tidak mengembalikannya.

Validasi: typecheck dan lint Owner lulus, tes Owner 44/44. Tidak ada SQL, akses backend, perubahan User, atau push. Belum diuji di Android.

Pekerjaan berikutnya: setelah izin pemeriksaan DEV, bandingkan definisi RPC aktif. Bila masih mengajukan verifikasi ulang hanya karena perubahan status tayang, ajukan RPC publikasi terpisah melalui migrasi aditif; tampilkan SQL dan minta persetujuan sebelum implementasi/apply. Jangan mengedit migrasi lama atau menyiasati verifikasi lewat client.
