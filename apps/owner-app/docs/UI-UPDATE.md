# Pembaruan tampilan Turu.Id Owner

Pembaruan 10 Oktober 2026 ini mengikuti gambar Home POV Producer, View Properti POV Producer, serta gaya Profile Turu. Karena ZIP berisi aplikasi owner, profil memakai peran **Owner** dan tombol **Lihat properti saya**. Halaman rekomendasi kos untuk customer berada pada aplikasi user yang terpisah.

## Yang berubah

- Warna utama `#F58A07`, latar putih, kartu ringkasan peach, teks gelap, dan garis pembatas ringan.
- Dashboard: logo Turu.Id, notifikasi, nama owner, ringkasan 2×2, properti saya, dan aktivitas terbaru.
- Navigasi bawah: Beranda, Chat, tambah properti di tengah, Pemesanan, dan Profil.
- Daftar properti: pencarian nama/kota, ketersediaan kamar, serta menu opsi detail/edit.
- Detail kos: foto sampul, panel putih membulat, tab Profil / Fasilitas / Photo / Ulasan.
- Profil owner: avatar inisial, nama/email, status verifikasi, kartu pengelolaan kos, dan menu akun.
- Layar aktivitas lengkap untuk tombol Lihat semua.
- Form dan komponen bersama memakai gaya putih/oranye yang sama.

Ringkasan, daftar, fasilitas, foto, dan ulasan memakai repository aplikasi. Angka tidak disalin dari gambar desain. Kamar tersedia menghitung tipe kamar aktif, sementara total kamar menunjukkan kapasitas semua tipe kamar. Form edit properti, inventory, paket sewa, booking, chat, dan pengaturan akun tetap memakai alur yang sudah tersedia.

Foto kos yang sudah ada di ZIP tetap dipakai. Kualitas foto asli relatif kecil; ganti melalui form galeri kos jika tersedia foto dengan resolusi lebih tinggi.

## Cara menerapkan pada project kelompok

Commit atau buat salinan folder owner-app saat ini, lalu ekstrak ZIP ini ke folder sementara. Salin file di tabel berikut ke lokasi yang sama pada `apps/owner-app/` milik project kelompok.

| File/folder relatif dari owner-app | Fungsi |
| --- | --- |
| `App.tsx` | Mendaftarkan layar aktivitas dan warna latar aplikasi |
| `app.json` | Nama aplikasi Turu.Id Owner |
| `src/application/RepositoriesProvider.tsx` | Teks dan warna layar awal; logika repository tetap sama |
| `src/presentation/navigation.ts` | Tipe route Activities |
| `src/presentation/components/UI.tsx` | Warna, navigasi bawah, form, card, logo, tab, dan foto |
| `src/presentation/components/Icon.tsx` | Komponen ikon lokal baru |
| `src/presentation/screens/PropertyScreens.tsx` | Dashboard, daftar/detail properti, aktivitas |
| `src/presentation/screens/AccountScreens.tsx` | Profil owner dan logo halaman login |
| `assets/ui-icons/` | Seluruh aset ikon baru |

Jika kamu telah mengubah salah satu file tersebut setelah membuat ZIP awal, gabungkan perubahanmu dengan file baru terlebih dahulu. Dependency dan lockfile tetap sama. File `.env` milik project tetap berada pada project-mu.

Buka terminal dari folder `apps/owner-app/`:

```sh
npm ci
npx expo start -c
```

Atau jalankan versi web:

```sh
npm run web
```

Pada Windows, jalankan perintah di terminal VS Code dari folder owner-app. Aplikasi ini masih memakai versi Expo/React Native bawaan project; tidak ada upgrade dependency dalam pembaruan desain ini.

## Mencoba alur utama

1. Tanpa konfigurasi Supabase, aplikasi membuka dashboard demo dengan data contoh.
2. Tekan salah satu card properti untuk membuka detail kos.
3. Pindah tab untuk melihat fasilitas, foto, dan ulasan.
4. Di tab Profil, scroll ke **Edit informasi properti** untuk mengubah nama, alamat, deskripsi, fasilitas, dan foto melalui form yang sudah ada.
5. Tekan **Kelola kamar** untuk membuka tipe kamar, ketersediaan, dan paket sewa.
6. Tekan **Pemesanan kos** untuk melihat booking khusus properti tersebut.
7. Tombol `+` di navigasi bawah membuka form penambahan kos.
8. Menu Profil membuka pengaturan akun dan kartu pengelolaan properti.

Penyimpanan informasi kos tetap mengikuti aturan verifikasi project sebelumnya. Perubahan informasi dapat mengajukan pemeriksaan ulang; pembaruan tampilan tidak memberikan hak persetujuan kepada owner.

## Validasi pembaruan

- TypeScript dan ESLint berhasil.
- 15 tes domain/database yang sudah ada berhasil.
- Export bundel web, Android, dan iOS berhasil. Export native bukan APK/IPA.
- Tampilan web diperiksa pada 402×874 dan 375×812.
- Alur tab detail, pencarian, penyimpanan profil/deskripsi kos, inventory, paket sewa, aktivitas lengkap, serta tombol tambah diperiksa pada mode demo.
- Screenshot tampilan tersedia di `docs/ui-preview/`.
- Perangkat Android/iOS fisik dan layanan Supabase/Agora/push asli belum diuji dalam pembaruan ini.
