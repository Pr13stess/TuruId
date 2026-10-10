# Penyelarasan form pengelolaan — tahap 5

Tanggal: 11 Oktober 2026 (Asia/Jakarta).

## Cakupan

Form tambah/edit properti, tipe kamar, inventory, paket sewa, dan onboarding
verifikasi pemilik memakai `<Page aligned>`. Input putih, teks navy, radius,
ukuran teks pendukung, dan tombol mengikuti token User App yang sudah dipakai
pada tahap sebelumnya. Tombol inventory mempunyai area tekan minimal 44 px;
tombol simpan dan pengubah jumlah dinonaktifkan ketika penyimpanan berlangsung.

File utama:

- `src/presentation/components/UI.tsx`: gaya input, indikator fokus, dan switch.
- `src/presentation/screens/PropertyFormScreen.tsx`: form dan unggahan properti.
- `src/presentation/screens/RoomScreens.tsx`: kamar, inventory, daftar/form paket.
- `src/presentation/screens/AccountScreens.tsx`: onboarding verifikasi pemilik.
- `src/presentation/theme.ts`: keterangan cakupan token.

Validasi domain, repository, rumus DP/deposit, route, dan database tidak diubah.
Penyimpanan tetap menggunakan aksi dan repository sebelumnya. Edit profil
mandiri tetap memakai tampilan sebelumnya; editor identitas dalam onboarding
mengikuti gaya halaman onboarding. User App tidak diubah.

Lockfile mandiri Owner App juga disinkronkan dengan dependensi `react-native-svg`
yang sudah ditambahkan pada tahap navbar sebelumnya.

## Pemeriksaan

- TypeScript dan lint Owner App: lolos.
- Test Owner App: 15/15 lolos.
- Browser Edge, mode demo lokal: navbar Beranda/Chat/Booking/Profil berpindah
  dengan indikator aktif yang benar; tombol plus membuka tambah kos.
- Tambah/edit properti: kolom wajib dan koordinat ditolak bila tidak valid;
  foto galeri dan bukti dummy berhasil dipilih melalui file picker web,
  disimpan, dan status properti menjadi PENDING.
- Tambah/edit kamar: luas nol ditolak; kapasitas dan perubahan lantai tersimpan.
- Inventory: alasan singkat ditolak; alokasi kamar dibersihkan tersimpan dan
  tetap utuh setelah edit informasi kamar.
- Tambah/edit paket: DP di atas 100% ditolak. Sewa Rp1.000.000, DP 25%, dan
  deposit Rp200.000 menghasilkan bayar awal Rp450.000 dan sisa Rp750.000.
- Onboarding: unggah gambar dummy, simpan identitas, status PENDING, lalu buka
  form properti berhasil.
- Form diperiksa pada lebar 320 dan 390 px tanpa overflow horizontal halaman.
  Tidak ditemukan exception browser yang tidak tertangani pada skenario uji.

Pengujian memakai repository mock dan gambar dummy dari aset lokal. Data demo
browser dikembalikan ke keadaan sebelum uji. Kamera native, perangkat fisik,
unggahan Supabase, dan persetujuan admin sebenarnya belum diuji.

Tahap 6 belum dimulai.
