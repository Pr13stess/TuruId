# Galeri kos: 10 foto dan 1 video

Status: kode lokal siap ditinjau; video BELUM aktif di Supabase DEV. Tidak ada akses backend, SQL baru yang dijalankan, migrasi aktif baru, deploy, atau push pada tahap ini. SQL lengkap ada di [PROPERTY-GALLERY-SQL.md](PROPERTY-GALLERY-SQL.md), menunggu persetujuan.

## Perubahan

| Area | Perilaku |
|---|---|
| Owner: Tambahkan/Edit kos | Pilih foto dan video sekaligus. Maksimal total 10 foto + 1 video, termasuk media yang sudah ada. |
| Video | MP4, maksimal 60 detik, 50 MiB (52.428.800 byte). Informasi picker dicek di client; isi container diperiksa ulang oleh Function. |
| Upload foto | Tetap menggunakan owner-upload. Foto diproses satu per satu, JPEG maksimal 5 MB. Function lama tidak diubah. |
| Kegagalan sebagian | Foto/video yang berhasil masuk formulir dipertahankan. Tombol retry melanjutkan item yang belum berhasil. Sisa antrean bisa dibatalkan agar hasil yang sudah sukses dapat disimpan. |
| Preview Owner | Video dapat dibuka di formulir. Sampul tetap foto. Melepas video hanya melepas relasi ketika disimpan, tidak menghapus file storage. |
| Detail User | Foto tetap menjadi hero; thumbnail bisa digulir horizontal. Video terpisah di galeri dan diputar dengan kontrol native, tanpa autoplay. |
| Signed URL | Bucket video baru privat. URL diperoleh saat pemutar dibuka; tombol muat ulang menerbitkan URL baru. Masa berlaku 30 menit. |
| Kompatibilitas | Jika tabel video belum ada (PGRST205/42P01), pembacaan foto tetap berfungsi. Kegagalan lain tidak dianggap sukses. Penyimpanan tanpa video memakai RPC foto lama. |

Dependensi disetujui pengguna: expo-video ~57.0.5 di kedua aplikasi. Ukuran paket metadata npm setelah ekstraksi 10.887.445 byte; bukan ukuran tambahan APK.

## File

File baru utama:

- Owner `src/domain/propertyGallery.ts`: batas pilihan dan antrean retry.
- Owner `src/presentation/propertyMedia.ts`: picker campuran dan kompresi foto.
- Owner `src/data/supabase/propertyVideo.ts`: multipart upload video, ID tetap selama retry.
- Kedua aplikasi `src/presentation/components/PropertyVideo.tsx`: pemutar yang tidak autoplay, pause ketika halaman kehilangan fokus/aplikasi ke background, muat ulang URL.
- `supabase/functions/property-video-upload/{index,core}.ts`: autentikasi owner aktif, validasi container, metadata hash dan upload immutable dengan pemeriksaan ulang objek setelah konflik/response hilang.
- `tests/propertyVideo.test.mjs`, `tests/propertyVideoAdapter.test.mjs`, Owner `tests/propertyGallery.test.mjs`.

File lama:

- `apps/owner-app/package.json`, `apps/user-app/package.json`, `package-lock.json`: dependensi pemutar.
- Owner `src/domain/models.ts`, `src/domain/repositories/SupportRepository.ts`: path video opsional dan kontrak upload.
- Owner `src/data/{mock,supabase}/Repositories.ts`: baca relasi video, route save video ke RPC baru, signed URL, mock lokal.
- Owner `src/presentation/screens/PropertyFormScreen.tsx`: picker/antrean, penghitung, preview, pelepasan video.
- User `src/domain/models.ts`, `src/domain/repositories/PropertyRepository.ts`: kontrak video.
- User `src/data/mock/MockPropertyRepository.ts`, `src/data/supabase/SupabasePropertyRepository.ts`: baca video dan resolve URL.
- User `src/presentation/screens/PropertyDetailScreen.tsx`: video dan thumbnail horizontal.
- `tests/adapters.test.mjs`: fixture endpoint video baru dan assertion path video; assertion lama tetap.

Diff lengkap file lama: [PROPERTY-GALLERY-DIFF.patch](PROPERTY-GALLERY-DIFF.patch), baseline commit `9997dbc`. Tidak ada modifikasi owner-upload, chat, auth, booking, pembayaran, inventory, policy lama, migrasi lama, atau objek storage.

## Bukti lokal

| Perintah | Hasil |
|---|---|
| `npm.cmd test` | 73/73 lolos, termasuk unit Function video dan adapter; SQL yang diuji hanya schema lama. |
| `npm.cmd test --workspace=kosku-owner` | 35/35 lolos, termasuk batas media dan partial retry. |
| `npm.cmd run typecheck --workspace=@kosku/user-app` | Lolos. |
| `npm.cmd run typecheck --workspace=kosku-owner` | Lolos. |
| `npm.cmd run lint --workspace=@kosku/user-app` | Tanpa error, tiga warning lama RegisterScreen. |
| `npm.cmd run lint --workspace=kosku-owner` | Lolos. |
| Deno `check --no-remote --no-lock supabase/functions/property-video-upload/index.ts` | Lolos memakai cache lokal. Percobaan flag `--cached-only` sebelumnya tidak didukung Deno 2.5.2; diganti flag yang didukung. |
| Expo export Android offline `--no-bytecode` kedua aplikasi | Lolos; output `.expo/property-video-user` dan `.expo/property-video-owner`. Bukan uji perangkat. |
| `git diff --check` | Lolos. |

Test video mencakup container MP4 v0/v1, MIME/PDF palsu, ukuran/durasi berlebih, truncation, metadata-only retry, lost upload response, objek berbeda, penolakan unknown storage errors, kontrak multipart dan RPC, serta fallback schema belum terpasang. Fixture MP4 sintetis untuk container; bukan bukti stream dapat didecode/diputar.

## Batas yang belum selesai / risiko

1. SQL baru belum disetujui/diuji/dipasang dan Function video belum deploy. Upload video di mode Supabase akan gagal sampai tahap backend selesai; jangan anggap fitur video siap demo. Foto masih menggunakan jalur lama.
2. Belum ada bukti picker campuran Android, native multipart, pemutaran MP4 nyata, file 50 MiB, RLS video draft/publik, atau akses lintas aplikasi bekerja di DEV.
3. Validasi server memeriksa struktur container, MIME, brand, keberadaan video track/data, ukuran, dan durasi header. Tidak mendecode frame, memvalidasi seluruh sample table, transcode codec, atau menghapus metadata video. Container yang lolos bisa tetap tidak dapat diputar. MOV/fragmented MP4 tidak diterima.
4. Upload 50 MiB memakai multipart dan buffering di Function. Wajib uji memori/durasi dan koneksi lambat di DEV sebelum menyatakan siap. [Batas runtime resmi Supabase](https://supabase.com/docs/guides/functions/limits) mencantumkan memori 256 MB dan idle timeout 150 detik. Belum ada upload resumable; retry mengirim file utuh.
5. Foto tetap tunduk rate limit owner-upload lama (10 unggahan/menit). Retry antrean melewati hasil yang sudah dikonfirmasi. Response foto yang hilang masih dapat menyebabkan objek orphan/duplikat di storage karena Function foto lama memakai UUID acak; tidak diubah tanpa izin. Video memakai ID tetap + hash + objek immutable.
6. Antrean hanya selama halaman terbuka. Draft/mock memakai URI lokal, bukan penyimpanan lintas perangkat. File yang diunggah lalu batal disimpan dapat tersisa sebagai objek tak terpasang; tidak dihapus otomatis.
7. Batas baru 10 foto dapat meminta kos lama dengan 11–12 foto dikurangi di formulir sebelum save. File storage tidak dihapus. Backend RPC lama tetap menerima 12 foto; pengetatan jalur lama di luar proposal aditif ini.
8. Signed URL yang sudah diterbitkan berlaku sampai kedaluwarsa walaupun listing kemudian menjadi privat. Pemutar dapat dimuat ulang manual untuk URL baru; tidak ada timer refresh video otomatis.

## Setelah persetujuan SQL dan deploy DEV

1. Verifikasi env lokal/CLI menunjuk project DEV `fhapolumdqqewwhxnjcb` tanpa mencetak key. Periksa schema/prasyarat aktual secara read-only.
2. Salin SQL yang disetujui menjadi file migrasi baru root. Uji PGlite untuk hak akses owner lain/anon, batas foto, video milik orang lain, partial upload, rollback transaksi, unlink video, dan kompatibilitas RPC lama.
3. Tampilkan perbedaan jika hasil inspeksi memerlukan perubahan proposal; minta persetujuan lagi sebelum apply SQL yang berbeda.
4. Apply hanya migrasi baru dan deploy hanya `property-video-upload` ke DEV setelah diizinkan. Tidak memakai db reset atau menjalankan migrasi lama ulang.
5. Uji Android Owner: pilih 10 foto + 1 MP4, retry setelah putus jaringan, simpan dan buka lagi; coba 11 foto, 2 video, 61 detik, >50 MiB, PDF yang diganti nama MP4.
6. Uji User: listing yang sudah publik menampilkan foto sampul dan video, playback hanya setelah tindakan pengguna, pause/background, serta reload setelah URL kedaluwarsa. Uji akun lain tidak membaca video draft; listing publik memang boleh dibaca pencari kos.
7. Uji akun tanpa login/tanpa peran OWNER tidak bisa upload, dan caller tidak dapat memasang video owner lain. Bandingkan jumlah object/path dan metadata setelah retry.

## Rollback

Revert commit UI sebelum dependensi. Function baru bisa dibiarkan tanpa caller; perubahan deployment memerlukan izin. Proposal SQL belum berdampak ke DB. Jika nanti diterapkan, tabel/bucket baru dapat dibiarkan tanpa digunakan saat rollback aplikasi. Jangan menghapus objek/bucket atau menjalankan DROP untuk rollback.
