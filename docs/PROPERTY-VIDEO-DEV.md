# Pemasangan video kos di DEV — 19 Oktober 2026

Target tunggal: `fhapolumdqqewwhxnjcb`. Pengguna menyetujui SQL video, migrasi edit atomik dan deploy Function. Tidak ada push, perubahan policy lama, perubahan Function owner-upload, atau penghapusan/penimpaan objek Storage.

## Dipasang dan diverifikasi

- `20261019043019_property_video.sql`: SQL persis dari proposal yang disetujui. Bucket privat `property-videos`, batas 52.428.800 byte, MIME `video/mp4`; tabel `property_video_uploads`, `property_videos`, tiga policy baru, helper baca dan RPC `owner_save_property_gallery`.
- `20261018233349_owner_edit_property_and_submit.sql`: tabel retry privat dan RPC simpan edit + pengajuan ulang. Dieksekusi dalam transaksi eksplisit, tidak mengubah isi migrasi lama.
- Keduanya dipasang selektif dengan `supabase db query --linked --project-ref ... --file ...`. Setelah objek terverifikasi, kedua versi dicatat applied dengan `supabase migration repair`. Migrasi tertunda lain tidak dijalankan.
- Function `property-video-upload` yang sudah ada di repo dideploy tanpa mengubah source, dengan `--use-api --no-verify-jwt`. Function memvalidasi token melalui `auth.getUser()`, status akun ACTIVE dan role OWNER sebelum memproses berkas; service-role key tetap hanya di backend.
- SELECT DEV memastikan kedua RPC tersedia, RLS aktif pada ketiga tabel baru, bucket privat/MP4/50 MiB, tiga policy baru tersedia, authenticated bisa menjalankan RPC galeri dan anon tidak bisa.
- Smoke test HTTP nyata: OPTIONS 200 `ok`; POST tanpa token 401 `Sesi tidak valid.`. Ini membuktikan endpoint aktif dan autentikasi ditolak, **bukan** keberhasilan upload akun owner.

## Hasil tes lokal

- 51 tes Owner lulus, termasuk tes SQL video baru dengan PGlite: metadata/objek wajib ada sebelum pemasangan, simpan+verifikasi atomik, retry menghasilkan satu pengajuan, owner lain tidak bisa membaca/mengedit, anon tidak bisa membaca draft, melepas relasi tetap mempertahankan objek.
- 109 tes root/User lulus. Fixture ditambah schema/tabel/fungsi bawaan Storage dan role service_role agar semua migrasi tetap diuji; jumlah tabel public kini 38. Tidak ada tes dilemahkan/dihapus/di-skip. Percobaan pertama menemukan fungsi bawaan storage.foldername belum dimodelkan; fixture dilengkapi lalu seluruh suite lulus.
- Typecheck dan lint Owner lulus. Enam tes khusus Function video/adapter juga lulus (validasi durasi/ukuran/MIME, retry immutable, multipart dan signed URL).
- Perintah: `npm.cmd run test --workspace=kosku-owner`, `npm.cmd test -- --test-concurrency=2` (percobaan awal), `npm.cmd test` (ulangan lulus), `npm.cmd run typecheck --workspace=kosku-owner`, `npm.cmd run lint --workspace=kosku-owner`, `node --import tsx --test --test-concurrency=2 tests/propertyVideo.test.mjs tests/propertyVideoAdapter.test.mjs`.

## Belum terbukti dan langkah pengguna

Belum mengunggah file pengguna atau mencoba authenticated upload dari Android, pemutaran codec pada perangkat, URL video pada User App, dan simpan video+persetujuan Admin end-to-end di DEV. Data dan objek uji palsu tidak ditambahkan ke DEV.

1. Reload Owner App. Buka kos > Galeri.
2. Jika masih ada unggahan tertunda, pilih **Coba unggah sisanya**; ID upload tetap sama. Jika layar sudah ditutup, pilih ulang MP4 melalui **Pilih foto & video**.
3. Video vertikal 10 detik/17 MB berada dalam batas durasi/ukuran; format MP4 tetap perlu valid. Coba pratinjau lalu **Simpan perubahan**.
4. Simpan edit mengajukan pemeriksaan ulang. Admin meninjau pengajuan terbaru, lalu Owner menekan **Periksa ulang** setelah disetujui.
5. Jika gagal lagi, catat teks error dan waktu percobaan untuk pemeriksaan log DEV. Jangan hapus foto lama atau mencoba reset database.

## Rollback

Untuk kembali ke tampilan tanpa pemilih video, revert commit UI `2674437`. Biarkan tabel/bucket/RPC aditif tetap ada; jangan DROP atau hapus objek. Rollback commit tidak membatalkan schema DEV. Menonaktifkan/redeploy Function memerlukan persetujuan terpisah. Jalur upload foto lama tidak diubah.

Referensi prosedur deploy: https://supabase.com/docs/guides/functions/deploy . Changelog markdown tidak dapat diambil melalui browser tool (content-type tidak didukung); opsi CLI diperiksa melalui `--help`.
