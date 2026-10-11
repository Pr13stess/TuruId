# Laporan upload gambar chat — tahap 0, a, b, c

Tanggal: 11 Oktober 2026. Branch: `main`. Tidak ada push, deploy, koneksi backend, SQL baru, migrasi, perubahan policy, atau dependensi baru pada pekerjaan ini.

## Hasil per tahap

| Tahap | Hasil | Commit |
|---|---|---|
| 0 | Mencatat SPEC yang disetujui, termasuk catatan keputusan di awal dokumen. | `c3bb0e3` |
| a | Resolver `owner-media/...`, `chat-images/...`, dan path User lama `{conversation_id}/{filename}`; URL privat 30 menit, diperbarui 1 menit sebelum habis, saat aplikasi kembali aktif, atau setelah gambar gagal dimuat. Retry dibatasi agar tidak membanjiri server. | `957d739` |
| b | Function baru `chat-image-upload`: JPEG/PNG, signature, batas 5 MB, decode, kompresi JPEG, latar putih, metadata, upload tanpa overwrite dan pemeriksaan isi pada retry. | `c6b2ba4` |
| c | Kedua aplikasi memakai Function untuk gambar; ID tetap selama retry, rekonsiliasi pesan setelah respons hilang, tombol retry/batal di User, preview PNG tetap mempertahankan alpha di Owner. | Commit `feat(chat): connect validated image upload in both apps` |

Resolver tiga format belum ada di checkout awal, sehingga dimasukkan pada tahap a. Tidak ada objek lama yang dipindah, diganti nama, ditimpa, atau dihapus.

## Jalur dan perilaku

- Bucket baru tetap bucket yang sudah ada: `owner-media`. Nama objek: `{sender_id}/chat/{client_message_id}.jpg`. Kolom `messages.storage_path` berisi nama bucket juga.
- Server memperoleh sender dari JWT tervalidasi, memeriksa akun aktif dan peserta percakapan sebelum memakai service-role. Tidak ada service-role key pada aplikasi.
- Function tidak mengirim pesan. User tetap INSERT ke `messages`; Owner tetap memakai `communication_send`. Alur teks tidak diubah.
- Metadata `owner_uploads` dicatat sebelum objek. Jika upload gagal, retry dapat melanjutkan metadata tersebut. Jika objek ada, metadata, konteks percakapan, pesan yang sudah ada, dan byte JPEG diperiksa. Konflik tidak diabaikan begitu saja.
- Jika pesan sudah tersimpan tetapi respons hilang, client mencari pesan berdasarkan sender + client_message_id dan memeriksa percakapan/jenis/path sebelum menyatakan sukses. Jika pesan ada tetapi objek hilang, upload dengan ID yang sama masih dapat memperbaiki objek yang belum ada.
- Objek lama tanpa metadata yang sesuai ditolak untuk dipakai ulang; tidak diperbaiki dengan overwrite atau pemindahan.
- Payload Owner disimpan dalam draft sampai sukses/batal; caption gambar dibekukan pada percobaan kirim pertama. User mempertahankan URI pilihan dan ID untuk retry. Draft masih di memori layar, bukan antrean permanen yang bertahan setelah aplikasi ditutup. Jangan menutup layar ketika sedang menguji retry.
- Jalur normal memerlukan Function baru sudah tersedia. Sebelum tahap d selesai, jangan merilis build yang memakai jalur baru ke pengguna.

## File baru

- `apps/{user-app,owner-app}/src/domain/chatImage.ts`: pemetaan storage dan pengatur pembaruan URL.
- `apps/{user-app,owner-app}/src/presentation/components/ChatImage.tsx`: tampilan gambar chat yang dapat memperbarui URL.
- `apps/{user-app,owner-app}/src/domain/chatUpload.ts`: payload gambar dan satu identitas untuk satu percobaan kirim.
- `apps/{user-app,owner-app}/src/data/supabase/chatImageUpload.ts`: pemanggilan Function, validasi path respons, pemeriksaan pesan idempotent.
- `apps/user-app/src/data/supabase/readChatImage.ts`: pembacaan berkas native serta URI lokal browser.
- `apps/owner-app/src/presentation/chatMedia.ts`: pemilihan/kompresi gambar khusus chat dengan alpha PNG tetap utuh sampai server.
- `apps/owner-app/src/domain/sendChatImage.ts`: orkestrasi upload lalu RPC gambar, beserta rekonsiliasi.
- `supabase/functions/chat-image-upload/{index,core,codec,access,store}.ts`: Function baru dan modul yang dapat dites.
- Tes baru: `tests/chatImage.test.mjs`, `tests/chatImageSend.test.mjs`, `tests/chatImageUploadFunction.test.mjs`; `apps/owner-app/tests/{chatImage,chatImageSend,chatImageOwnerFlow}.test.mjs`.
- Laporan ini dan `docs/CHAT-IMAGE-UPLOAD-DIFF.patch`.

## File lama yang berubah dan alasan

Diff lengkap file lama, dibandingkan dengan commit tahap 0: [CHAT-IMAGE-UPLOAD-DIFF.patch](CHAT-IMAGE-UPLOAD-DIFF.patch).

| File | Alasan |
|---|---|
| `apps/user-app/src/domain/models.ts` | Menyimpan storage_path asli agar URL dapat ditandatangani ulang. |
| `apps/user-app/src/domain/repositories/ChatRepository.ts` | Kontrak resolver dan MIME untuk gambar. |
| `apps/user-app/src/data/supabase/SupabaseChatRepository.ts` | Menghubungkan resolver dan upload baru; mempertahankan upload lama untuk rollback eksplisit. |
| `apps/user-app/src/data/mock/MockChatRepository.ts` | Menyediakan resolver lokal untuk demo. |
| `apps/user-app/src/presentation/screens/chat/ChatScreen.tsx` | Menampilkan ChatImage, mempertahankan ID gambar gagal, serta retry/batal. |
| `apps/owner-app/src/domain/repositories/SupportRepository.ts` | Kontrak upload/resolver/konfirmasi khusus gambar chat. |
| `apps/owner-app/src/data/supabase/Repositories.ts` | Adapter khusus chat; upload properti/verifikasi dan RPC komunikasi lama tetap dipakai. |
| `apps/owner-app/src/data/mock/Repositories.ts` | Memenuhi kontrak chat baru dalam demo tanpa backend. |
| `apps/owner-app/src/presentation/components/ChatConversation.tsx` | Menggunakan ChatImage untuk gambar pesan. |
| `apps/owner-app/src/presentation/screens/ChatScreens.tsx` | Draft gambar, ID retry dan alur upload lalu RPC gambar. |

`owner-upload`, `media.ts` umum Owner, migrasi lama, policy lama, dan package/lockfile tidak diubah.

## Pengujian lokal

| Pemeriksaan | Setelah a | Setelah b | Setelah c |
|---|---:|---:|---:|
| `npm.cmd test` (root, mencakup User dan unit Function) | 38/38 | 49/49 | 55/55 |
| `npm.cmd test --workspace=kosku-owner` | 19/19 | 19/19 | 28/28 |
| `npm.cmd run typecheck --workspace=@kosku/user-app` | Lulus | Lulus | Lulus |
| `npm.cmd run typecheck --workspace=kosku-owner` | Lulus | Lulus | Lulus |
| `npm.cmd run lint --workspace=@kosku/user-app` | Lulus* | Lulus* | Lulus* |
| `npm.cmd run lint --workspace=kosku-owner` | Lulus | Lulus | Lulus |

*Tiga warning lama di `RegisterScreen.tsx`: setter fullName, phone, campus belum digunakan. Tidak ada error lint. Warning tersebut tidak diubah karena di luar cakupan.

Pemeriksaan tambahan:

```powershell
node_modules/.bin/tsc.cmd --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --allowImportingTsExtensions supabase/functions/chat-image-upload/core.ts supabase/functions/chat-image-upload/codec.ts supabase/functions/chat-image-upload/access.ts
node_modules/.bin/eslint.cmd --config apps/user-app/eslint.config.js supabase/functions/chat-image-upload/core.ts supabase/functions/chat-image-upload/codec.ts supabase/functions/chat-image-upload/access.ts supabase/functions/chat-image-upload/store.ts
git diff --check
```

Ketiganya lulus. Tes awal sempat terhalang `uv_os_get_passwd` di sandbox Windows; pengulangan dengan akses lokal yang diizinkan lulus. Kesalahan lint komponen baru diperbaiki, tanpa menghapus atau mematikan tes/rule.

Percobaan tambahan menjalankan ESLint Node terhadap seluruh folder Function menghasilkan dua `import/no-unresolved` untuk import `npm:` pada entrypoint. Ini belum menjadi validasi runtime Deno: Deno tidak tersedia. Entry point beserta Jimp 1.6 harus dicek dengan runtime yang benar sebelum deploy. Tidak ada rule lint yang dimatikan untuk menyembunyikan hasil ini.

Unit Function berjumlah 11: validasi akses peserta, adapter Storage, MIME/signature, batas ukuran/decode, PNG transparan, pixel blending, body streaming terbatas, concurrency, kegagalan sebagian, konflik objek/metadata/pesan, dan error Storage. Tes decode lokal memakai `jimp-compact` yang sudah ada sebagai dependensi transitif Expo melalui adapter. Produksi Function memakai import `jimp@1.6.0` yang sudah digunakan Function lama. Tes lokal ini tidak membuktikan kesetaraan runtime Deno + Jimp 1.6.

## Ditemukan/diuji lokal dibandingkan terbukti di DEV

| Skenario | Bukti lokal | Bukti DEV |
|---|---|---|
| PDF/MIME palsu ditolak | Unit signature + MIME lulus, decoder tidak dipanggil untuk signature salah. | Belum diuji. |
| Lebih dari 5 MB ditolak | Unit sebelum decode, setelah encode, dan streaming body lulus. | Belum diuji. |
| PNG transparan menjadi JPEG putih | Decode/encode nyata dengan codec lokal yang tersedia; unit blending lulus. | Jimp 1.6/Deno belum diuji. |
| Retry tidak menggandakan objek/pesan | Store memori concurrent + SDK dengan fetch palsu lulus. | Storage/RPC nyata belum diuji. |
| URL kedaluwarsa diperbarui tanpa membuka ulang | Fake clock, resume, offline retry, throttle, unmount lulus. | Perangkat/browser nyata belum diuji. |
| Owner ↔ User melihat gambar | Kedua adapter mengarah ke path sama; RPC Owner tetap sama. | Belum end-to-end. |
| Akun ketiga tidak membaca pesan/objek | Unit gate upload menolak akun ketiga; tes RLS lama PGlite tetap lulus. | Policy Storage dan akses gambar nyata belum diuji. |
| Gambar lama tiga format | Unit resolver menentukan bucket/key yang benar untuk ketiganya. | Objek lama nyata belum dibuka. |

Seluruh tes database di atas memakai PGlite lokal, bukan database Supabase. Tidak ada klaim keberhasilan DEV dari demo/mock.

## SQL/policy dan prasyarat DEV

Tidak ada SQL, policy, atau migrasi yang diajukan/diterapkan. Function ditempatkan di root `supabase/functions` sesuai sumber kebenaran dalam catatan SPEC; dua jalur migrasi tidak digabung.

Function mengandalkan `owner_uploads`, bucket privat `owner-media`, policy baca peserta, tabel messages dan RPC Owner yang sudah ditemukan di kode. Definisi owner_uploads/bucket/policy saat ini berada di `apps/owner-app/supabase/migrations/202610020003_storage_permissions.sql`. Keberadaannya pada DEV belum diperiksa. Jika prasyarat tidak ada di DEV, berhenti dan ajukan SQL aditif terpisah untuk persetujuan; jangan menerapkan migrasi lama secara membabi buta.

## Sisa gap dan risiko

- Direct upload policy lama `chat-images` masih ada: client lama atau client buatan sendiri tetap bisa melewati Function baru pada bucket itu. Tidak diubah sesuai instruksi.
- WebP sengaja ditolak dan tidak dikerjakan.
- Belum ada pengujian Deno/Jimp persis, Storage/RLS/RPC/realtime nyata, maupun pengujian perangkat. Pembacaan gambar lokal web/native juga perlu diuji pada platform target.
- Draft retry belum persisten setelah layar/app ditutup. Pembatalan setelah upload dapat meninggalkan objek/metadata tanpa pesan; tidak ada pembersihan otomatis agar aturan tidak menghapus objek tetap dipatuhi.
- Jalur rollback lama tetap memiliki keterbatasan validasi/idempotensi lamanya. Gunakan hanya dengan keputusan eksplisit, bukan fallback otomatis.
- Function baru belum dideploy. Jalur baru akan gagal unggah apabila build dijalankan terhadap backend yang belum memiliki Function/prasyaratnya.

## Tahap d yang diusulkan — belum dijalankan

1. Dapatkan project ref/URL DEV yang benar, email user/owner/akun ketiga, dan persetujuan akses/deploy. Nilai pada instruksi awal masih placeholder. Password/secret tetap di env lokal dan tidak dicetak.
2. Cocokkan konfigurasi lokal dengan ref DEV tanpa mencetak secret. Hentikan bila tidak cocok. Setelah mendapat izin akses backend, cek keberadaan prasyarat secara read-only; jangan akses production.
3. Siapkan pemeriksaan runtime Deno + Jimp 1.6 lokal. Bila perlu memasang alat/dependensi yang belum tersedia, ajukan alasan dan ukuran terlebih dahulu. Jalankan check dan fixture decode pada versi persis tersebut sebelum deploy.
4. Deploy hanya `chat-image-upload` ke project ref DEV yang sudah dikonfirmasi. Tidak deploy `owner-upload`, tidak menjalankan migrasi, dan tidak mengubah policy.
5. Jalankan matriks uji di bawah; catat request status, ID pesan, path objek, jumlah objek/pesan, dan waktu URL. Jangan mencatat token/password/signed URL lengkap ke laporan.

## Langkah uji manual setelah deploy disetujui

1. Buka User dan Owner sebagai peserta percakapan yang sama di DEV. Pastikan pengaturan rollback `EXPO_PUBLIC_CHAT_IMAGE_UPLOAD=legacy` tidak aktif.
2. Kirim JPEG dari Owner dan PNG transparan dari User. Pastikan tampil di kedua sisi, PNG berlatar putih, path baru memakai owner-media/sender/chat/client_message_id.jpg, dan caption/teks masih berfungsi.
3. Dari alat uji terautentikasi DEV, kirim PDF asli dengan deklarasi application/pdf lalu deklarasi image/jpeg, JPEG dideklarasikan PNG, gambar ber-signature benar tetapi rusak, serta payload >5 MB. Harapkan 415/422/413 sesuai kasus, tanpa objek/pesan baru. Menguji picker saja tidak membuktikan validasi server.
4. Simulasikan kegagalan koneksi upload, kemudian kegagalan respons setelah upload sukses/sebelum INSERT/RPC sukses. Gunakan tombol retry tanpa memilih ulang/batal. Pastikan ID tetap, satu objek, satu metadata dan satu pesan. Coba retry bersamaan dengan ID sama serta payload berbeda: payload berbeda harus ditolak tanpa overwrite.
5. Biarkan chat terbuka melewati 30 menit, lalu uji background/resume dan putus-sambung jaringan. Gambar harus dapat dimuat kembali tanpa keluar-masuk chat. Bukti lokal menjadwalkan refresh pada menit 29; waktu nyata harus diobservasi.
6. Buka contoh pesan lama untuk setiap format path di kedua aplikasi. Jangan membuat ulang atau memindahkan objek lama.
7. Dengan sesi akun ketiga, coba SELECT pesan, download objek langsung, dan membuat signed URL untuk path kedua peserta. Harus ditolak/tidak mendapat data. Jangan memberikan signed URL peserta ke akun ketiga: signed URL merupakan bearer URL hingga kedaluwarsa.
8. Jalankan ulang perintah unit/typecheck/lint kedua aplikasi, lalu simpan hasil lulus/gagal DEV terpisah dari tes lokal.

## Rollback

- Rollback sumber tahap c: `git revert <hash-commit-tahap-c>` (ambil hash dari log berdasarkan pesan commit di tabel). Ini mempertahankan resolver tahap a dan Function tahap b. Tidak perlu menghapus Function atau objek.
- Alternatif jalur upload lama tanpa membuang resolver: set `EXPO_PUBLIC_CHAT_IMAGE_UPLOAD=legacy` di konfigurasi build kedua aplikasi, kemudian restart/rebuild. Variabel ini bukan secret. Selesaikan/batalkan draft yang sedang berjalan sebelum berganti build agar satu ID tidak dipakai pada dua format path.
- Rollback tahap b jika diperlukan: `git revert c6b2ba4`, setelah client kembali ke jalur lama. Revert source tidak menghapus Function yang mungkin telah dideploy nanti.
- Tahap a dapat di-revert tersendiri dengan `git revert 957d739` setelah tahap c, tetapi gambar lintas format dan pembaruan URL akan kehilangan perbaikannya. Lebih aman mempertahankannya.
- Tidak ada rollback database atau penghapusan objek. Gambar yang telah tersimpan tetap di tempatnya.
