# Pilot penyelarasan Profil Owner — tahap 1–3

Tanggal: 10 Oktober 2026 (Asia/Jakarta).

## Tujuan dan batas perubahan

Profil Owner mengikuti dasar visual User App: warna teks, avatar, ukuran huruf,
kartu menu, jarak, dan tombol. Menu pengelolaan khusus Owner tetap tersedia.
Tahap 4 dan seterusnya belum dikerjakan.

Tidak ada perubahan pada repository, autentikasi, database, RPC, package/dependensi,
atau source User App. Header, dock, dan mekanisme stack Owner tetap seperti semula.
Edit profil dan halaman tujuan menu memakai implementasi yang sudah ada.

## Tahap 1: kondisi awal

Working tree bersih sebelum pengerjaan. Pemeriksaan sebelum mengubah source:

| Perintah (dari root, PowerShell) | Hasil awal |
| --- | --- |
| `npm.cmd run typecheck --workspace=kosku-owner` | Lolos |
| `npm.cmd run lint --workspace=kosku-owner` | Lolos tanpa warning |
| `npm.cmd test --workspace=kosku-owner` | 15 tes lolos |
| `npm.cmd run typecheck --workspace=@kosku/user-app` | Lolos |
| `npm.cmd run lint --workspace=@kosku/user-app` | 0 error, 3 warning lama |
| `npm.cmd test` | 34 tes root/User lolos |

Warning lama berada di `apps/user-app/src/presentation/screens/RegisterScreen.tsx`:
`setFullName`, `setPhone`, dan `setCampus` tidak digunakan. Tidak diperbaiki dalam pilot ini.

PowerShell menolak wrapper `npm.ps1`, sehingga digunakan `npm.cmd` tanpa mengubah
execution policy. Runner tes awal gagal saat membaca informasi akun Windows
(`uv_os_get_passwd`); setelah dijalankan dengan izin di luar sandbox, seluruh tes lolos.

Pratinjau menggunakan Expo web di localhost:8083, mode demo, dotenv dinonaktifkan,
dan variabel Supabase dikosongkan pada proses server. Browser pengujian menggunakan
profil terpisah.

## Tahap 2: acuan visual

Sumber acuan yang benar-benar digunakan:

- `apps/user-app/src/presentation/theme.ts`: palet dan radius.
- `apps/user-app/src/presentation/components/ProfileUi.tsx`: menu, tombol, avatar.
- `apps/user-app/src/presentation/screens/profile/ProfileScreen.tsx`: identitas,
  badge, padding halaman, dan jarak antarkelompok.

| Elemen | Keputusan pilot |
| --- | --- |
| Navy / latar / permukaan | `#2A2D45` / `#FAF7F1` / `#FFFFFF` |
| Teks / teks sekunder / garis | `#202131` / `#767680` / `#E9E6E1` |
| Aksen / latar badge | `#F58A00` / `#FFF0D9` |
| Sukses / bahaya | `#418263` / `#AA4141` |
| Avatar | 76 px, maksimal dua inisial, fallback `?` |
| Nama | 20 px, bobot 700 |
| Email dan isi | 14 px |
| Menu / tombol | 15 px; tombol bobot 700 |
| Judul kelompok / badge | 13 px / 12 px, bobot 600 |
| Radius kartu / tombol | 12 px / 10 px |
| Padding halaman / jarak kelompok | 16 px / 20 px |
| Tombol | Tinggi minimal 48 px, state busy/disabled tetap tersedia |
| Ikon menu | Chevron teks seperti MenuRow User; ikon dock belum diubah |

Token pilot ditempatkan di `src/presentation/theme.ts`, bukan langsung mengganti
objek `C` lama yang dipakai seluruh Owner App. Ini membatasi dampak ke Profil.
Nilainya masih lokal dan perlu dibandingkan dengan User App saat nanti diperluas;
belum dibuat package UI bersama.

## Tahap 3: implementasi dan alur yang dipertahankan

- `src/presentation/components/ProfileUi.tsx`: komponen tampilan avatar, menu,
  dan tombol; tidak memanggil repository atau navigasi.
- `src/presentation/screens/AccountScreens.tsx`: Profil memakai komponen pilot.
  `profile.get`, `useLoad`, `useAction`, `auth.signOut`, `profile.resetDemo`, serta
  seluruh tujuan navigasi tetap dipertahankan.
- `src/presentation/components/UI.tsx`: Page menerima `contentContainerStyle`
  opsional. Hanya Profil yang memberi override; halaman lain memakai default lama.

Badge OWNER ditampilkan sebagai “Pemilik kos”. Status DRAFT/PENDING/APPROVED/REJECTED
ditampilkan sebagai “Belum diajukan” / “Menunggu verifikasi” / “Terverifikasi” /
“Perlu perbaikan”; nilai status yang disimpan tidak berubah.

Keluar tetap menjalankan logout langsung seperti Owner sebelumnya. Hapus akun
tetap membuka halaman permintaan admin. Tidak menyalin placeholder penghapusan
atau perilaku logout User App. Tombol reset demo juga dinonaktifkan selama aksi berjalan.

## Hasil verifikasi setelah perubahan

- TypeScript Owner: lolos.
- ESLint Owner: lolos tanpa warning.
- Tes Owner: 15/15 lolos.
- `git diff --check`: lolos.
- Pemeriksaan browser demo lewat Edge headless: tidak ada uncaught exception.
- Tampilan diperiksa pada 320×740, 390×844, dan 500×900; tidak ada overflow halaman
  horizontal. Bagian bawah dapat digulir sampai tombol demo terlihat di atas dock.
- Ubah profil: nama kosong ditolak; nama baru tersimpan, kembali ke Profil, dan
  bertahan setelah reload. Nama dipulihkan setelah pemeriksaan.
- Seluruh sembilan menu tujuan diperiksa dan tombol kembali menuju Profil berhasil:
  ubah profil diuji terpisah; ubah password, keuangan, laporan, notifikasi,
  pengaturan notifikasi, bantuan, privacy, terms, dan hapus akun diuji navigasinya.
- Logout membuka login; login demo kembali berhasil.
- Nama/email panjang serta status PENDING diperiksa pada 320 px; tombol pengajuan
  verifikasi membuka onboarding.
- Reset demo membuka onboarding. Penyimpanan demo browser dipulihkan ke kondisi
  sebelum pemeriksaan; tidak ada perubahan data Supabase.

Pemeriksaan ini adalah pengujian web/demo dan tes lokal, bukan pengujian Android/iOS
fisik, email/deep link, atau Supabase cloud. Error jaringan dan loading lambat
belum disimulasikan; komponen Load/Feedback serta hooks terkait tetap memakai
implementasi sebelumnya. Tes root/User tidak diulang setelah perubahan karena
source dan dependensinya tidak berubah.

## Untuk review berikutnya

Tinjau tampilan pilot sebelum menerapkan token ke halaman lain. Perbaikan chat
lintas bucket, panggilan User, migrasi gabungan, dan pemindahan navigasi ke bottom
tabs tetap menjadi pekerjaan terpisah. Pilot ini tidak menyatakan masalah tersebut selesai.
