# Branding mobile TuruId

Pembaruan 20 Oktober 2026 mengganti nama tampilan menjadi **TuruId** dan
**TuruId Owner**, termasuk login, registrasi, Tentang, teks izin lokasi,
aksesibilitas header, serta identitas contoh mock. Header teks Owner memakai
TuruId; aset logo Turu.Id yang sudah ada tetap dipakai.

Identitas teknis lama sengaja dipertahankan untuk kompatibilitas:

- Android package / iOS bundle ID `com.kosku.demo.user` dan
  `com.kosku.demo.owner`: menjaga pembaruan terhadap aplikasi terpasang.
- Expo slug `kosku` / `kosku-owner` beserta EAS project ID: menjaga hubungan
  proyek dan kredensial build yang sudah dibuat.
- Scheme `kosku` / `kosku-owner` dan redirect auth: menjaga tautan pemulihan
  serta verifikasi email yang sudah dikonfigurasi di backend.
- Kunci AsyncStorage, nama workspace npm dan project lokal Supabase:
  menjaga data instalasi, skrip, lockfile, serta alat pengembangan.
- Migrasi SQL dan catatan pengujian historis tidak ditulis ulang.

Belum ada rename identitas teknis maupun deployment backend. Teks push
`owner-maintenance` sudah diubah di source tetapi memerlukan deployment DEV
terpisah sebelum notifikasi backend memakai nama baru. Data yang sudah
tersimpan dan pesan lama tidak diubah.

Validasi lokal: 122 tes root/User dan 61 tes Owner lolos, typecheck keduanya
lolos, lint tanpa error (User masih memiliki tiga warning lama RegisterScreen).
APK yang sudah dibagikan tidak berubah otomatis; build ulang diperlukan.
