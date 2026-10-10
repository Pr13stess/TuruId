# Penyelarasan halaman baca — tahap 4

Tanggal: 10 Oktober 2026 (Asia/Jakarta).

## Hasil dan cakupan

Dashboard, daftar properti, daftar booking, dan notifikasi menggunakan token
visual dari pilot Profil/User App: kartu radius 12, tombol navy radius 10,
padding halaman 16, warna teks `ink`/`muted`, dan ukuran teks pendukung yang lebih
terbaca. Filter booking memiliki area tekan minimal 44 px dan status radio yang
terbaca di web maupun native.

Halaman menggunakan `<Page aligned>` untuk mengaktifkan tampilan baru pada
kontennya saja. Komponen umum membaca context internal untuk memilih gaya;
default tetap tampilan lama. Header/dock dan mekanisme stack tidak diganti.
Profil dari tahap sebelumnya tetap menggunakan komponen pilotnya.

File utama:

- `src/presentation/components/UI.tsx`: opt-in Page, teks, judul, kartu, badge,
  tombol, link, filter, loading, error, kosong, dan radius foto.
- `src/presentation/screens/PropertyScreens.tsx`: dashboard dan daftar properti.
- `src/presentation/screens/BookingScreens.tsx`: daftar booking saja.
- `src/presentation/screens/SupportScreens.tsx`: inbox notifikasi saja.
- `src/presentation/theme.ts`: keterangan cakupan token diperbarui.

Komponen Metric dipakai bersama dashboard dan ringkasan detail properti; teks
angka dan labelnya ikut diselaraskan di kedua tempat. Tidak ada perubahan pada
form, repository, hooks, kontrak route, database, dependensi, atau source User App.

## Perilaku yang dipertahankan

- Jumlah kamar tersedia tetap memakai `available(inventory)`; jumlah booking
  baru tetap menghitung status CONFIRMED; angka keuangan tetap berasal dari repository.
- Kartu properti membuka ID yang sama. Tambah kos, onboarding, keuangan, dan
  lihat semua tetap menuju route sebelumnya.
- Filter booking mempertahankan kondisi ALL, WAIT, CONFIRMED, ACTIVE, HISTORY.
  Status data dan pembayaran tidak diubah.
- Notifikasi tetap menjalankan `markRead` sebelum membuka target. Tombol
  dinonaktifkan saat aksi berlangsung; polling tetap 15 detik.
- Loading/error/retry tetap dikendalikan `useLoad`. Aksi menggunakan `useAction`.
- Foto tetap menggunakan implementasi `Photo` dan pengambilan URL privat yang ada.

## Verifikasi

- `npm.cmd run typecheck --workspace=kosku-owner`: lolos.
- `npm.cmd run lint --workspace=kosku-owner`: lolos tanpa warning.
- `npm.cmd test --workspace=kosku-owner`: 15/15 lolos.
- `git diff --check`: lolos.
- Browser demo, Edge headless: diperiksa pada 320×740, 390×844, 500×900.

Skenario browser yang berhasil:

1. Masing-masing dari empat halaman: loading → error → Coba lagi → data kosong.
2. Dashboard: tombol booking baru, keuangan, lihat semua properti bekerja.
3. Properti: buka detail, kembali, buka form tambah, kembali.
4. Booking: buka detail dan kembali; filter sesuai fixture: WAIT kosong,
   CONFIRMED KK-2601, ACTIVE KK-2602, HISTORY KK-2603, ALL ketiganya.
5. Filter terpilih memiliki `aria-checked=true` di browser.
6. Notifikasi booking membuka detail yang sesuai dan kembali dengan status sudah dibaca.
7. Teks panjang pada identitas dashboard, properti, booking, notifikasi serta foto
   properti kosong pada 320 px. Tidak ada overflow horizontal halaman.
8. Regresi Profil tahap 3: edit/validasi/simpan/reload, seluruh menu, logout/login,
   onboarding, dan reset demo masih berhasil.

Untuk loading/error/kosong, metode repository mock diganti sementara dalam memori
browser pengujian. Fixture panjang hanya ditulis ke storage profil browser demo
terpisah dan dipulihkan sesudahnya. Tidak ada test switch di aplikasi dan tidak
ada data Supabase yang disentuh. Cache Metro dibangun ulang setelah perubahan
agar pengujian memakai source terbaru.

Tidak ditemukan uncaught exception dalam skenario tersebut. Ada log web lama
“Unexpected text node” saat membuka detail booking dengan `cancel_note` kosong;
ekspresi `b.cancel_note && ...` pada detail tidak diubah oleh tahap ini. Detail
booking dan penanganan kondisi tersebut perlu ditinjau pada tahap alur sensitif.

Ini belum memverifikasi perangkat Android/iOS fisik atau layanan Supabase cloud.
Tahap 5 (form pengelolaan) belum dimulai.
