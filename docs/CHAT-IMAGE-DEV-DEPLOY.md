# Deploy DEV: perbaikan kegagalan upload gambar chat

Laporan ini memperbarui status deploy/runtime pada `CHAT-IMAGE-UPLOAD.md`.

## Penyebab dan tindakan

Kedua aplikasi sudah memanggil `chat-image-upload`, tetapi Function belum ada di DEV. Pemeriksaan daftar Function dan endpoint mengonfirmasi HTTP 404 `Requested function was not found`.

Setelah persetujuan pengguna:

- Mengunduh Deno 2.5.2 portable ke `.expo/tools` beserta cache dependensi Function. Tidak ada instalasi global atau perubahan package/lockfile aplikasi.
- Memperbaiki ketidakcocokan tipe Buffer Jimp dengan Uint8Array di `supabase/functions/chat-image-upload/codec.ts`.
- Menambahkan `codec_test.ts` yang menguji Jimp 1.6.0 secara langsung, bukan codec pengganti.
- Memeriksa keberadaan tabel `owner_uploads`, `messages`, `conversations`, dan `conversation_participants` melalui REST `limit=0`. Semuanya HTTP 200; tidak mengambil isi data.
- Deploy hanya `chat-image-upload` ke DEV **fhapolumdqqewwhxnjcb**, status **ACTIVE**, versi **1**.

Perintah deploy:

```powershell
supabase.cmd functions deploy chat-image-upload --project-ref fhapolumdqqewwhxnjcb --use-api --no-verify-jwt
```

Verifikasi JWT gateway untuk Function baru tidak digunakan. Function sendiri wajib memvalidasi Bearer token melalui `auth.getUser()`, memeriksa akun aktif serta peserta percakapan, sebelum memakai service-role. Function lama dan alur login aplikasi tidak diubah. Pemeriksaan tanpa token dan dengan token palsu di DEV sama-sama ditolak 401.

## Hasil pemeriksaan

| Pemeriksaan | Lingkungan | Hasil |
|---|---|---|
| Deno check entrypoint dan tes | Lokal, Deno 2.5.2 | Lulus setelah perbaikan tipe codec |
| PNG transparan menjadi JPEG putih; byte retry konsisten | Lokal, Jimp 1.6.0 | Lulus |
| JPEG besar di-resize menjadi maksimal 1600; hasil dapat didekode | Lokal, Jimp 1.6.0 | Lulus |
| PDF, MIME palsu, JPEG/PNG rusak, >5 MB | Lokal, Jimp 1.6.0 | Ditolak sesuai status yang diharapkan |
| `npm.cmd test` | Lokal | 55/55 lulus |
| `npm.cmd test --workspace=kosku-owner` | Lokal | 28/28 lulus |
| Typecheck kedua aplikasi | Lokal | Lulus |
| Lint kedua aplikasi | Lokal | Lulus; tiga warning registrasi User yang sudah ada tetap tercatat |
| OPTIONS `chat-image-upload` | DEV nyata | HTTP 200, `ok` |
| POST tanpa Authorization | DEV nyata | HTTP 401, `Sesi tidak valid.` |
| POST dengan token palsu | DEV nyata | HTTP 401, `Sesi tidak valid.` |
| Kirim gambar User ↔ Owner dengan sesi valid | DEV/perangkat | Belum diuji dari sesi ini |
| Retry objek/pesan, URL kedaluwarsa, gambar lama, isolasi akun ketiga | DEV/perangkat | Belum diuji end-to-end; bukti lokal tetap terpisah |

Perintah validasi runtime (DENO_DIR diarahkan ke `.expo/tools/deno-cache`):

```powershell
.expo/tools/deno-2.5.2/deno.exe check --no-config --no-lock supabase/functions/chat-image-upload/index.ts supabase/functions/chat-image-upload/codec_test.ts
.expo/tools/deno-2.5.2/deno.exe test --no-config --no-lock supabase/functions/chat-image-upload/codec_test.ts
```

## Diff file lama

Hanya file codec yang diubah dalam tindak lanjut ini:

```diff
-type Bitmap = { width: number; height: number; data: Uint8Array };
+type Bitmap = { width: number; height: number; data: { readonly length: number; [index: number]: number } };
-  getBuffer(mime: "image/jpeg", options: { quality: number }): Promise<Uint8Array>;
+  getBuffer(mime: "image/jpeg", options: { quality: number }): Promise<ArrayLike<number>>;
-    return image.getBuffer("image/jpeg", { quality: 80 });
+    return Uint8Array.from(await image.getBuffer("image/jpeg", { quality: 80 }));
```

Tipe input bitmap hanya mensyaratkan operasi byte yang benar-benar digunakan. Hasil encoder dikonversi menjadi Uint8Array baru; tidak memakai cast untuk menutupi ketidakcocokan tipe.

Tidak ada SQL, migrasi, perubahan Storage/RLS policy, perubahan owner-upload, penghapusan/overwrite objek storage, atau push Git. Metadata versi CLI lokal dikembalikan setelah CLI memperbaruinya otomatis.

## Coba dari Expo Android

1. Gunakan sesi login User dan Owner yang masih valid di project DEV tersebut.
2. Pada draft gagal yang masih terbuka, tekan tombol coba kirim lagi. Tidak perlu memilih ulang gambar agar ID retry tetap sama.
3. Kirim JPEG kecil dari User, lalu PNG dari Owner. Pastikan gambar terlihat di kedua sisi.
4. Jika masih gagal, catat teks error persis dan waktu percobaan. Endpoint yang hilang sudah diperbaiki, tetapi keberhasilan upload akun valid belum boleh disimpulkan hanya dari health check.

Deployment backend ini tidak memerlukan build ulang aplikasi. Bila sebelumnya pengaturan rollback `EXPO_PUBLIC_CHAT_IMAGE_UPLOAD=legacy` diaktifkan, pengaturan itu perlu dilepas dan Expo dimulai ulang untuk memakai Function baru; jangan mengubahnya jika tidak pernah diaktifkan.

## Rollback

Jangan menghapus Function atau objek. Client dapat dikembalikan secara eksplisit ke jalur upload lama menggunakan pengaturan rollback yang telah didokumentasikan. Revert commit codec hanya mengubah source lokal; tidak otomatis mengganti versi Function di DEV. Redeploy tetap memerlukan persetujuan pengguna.

Gap sebelumnya tetap berlaku: policy upload langsung chat-images masih ada, WebP tidak didukung, dan draft retry belum persisten setelah aplikasi ditutup.
