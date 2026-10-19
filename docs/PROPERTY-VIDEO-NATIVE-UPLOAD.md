# Upload video native — 19 Oktober 2026

Gejala perangkat: `VIDEO_NETWORK`. Error ini berarti fetch tidak memperoleh respons HTTP; belum membuktikan penyebab spesifik (URI file, jaringan, TLS, atau pemrosesan request native). Perubahan ini memperbaiki transport file yang dipakai Android/iOS; keberhasilan upload file pengguna masih harus diuji pada perangkat.

## Perubahan

- Dependensi langsung `expo-file-system` dipin ke 57.0.7 dengan persetujuan pengguna. Versi tersebut sudah tersedia melalui Expo; lockfile hanya bertambah satu entri dependensi workspace, bukan versi paket baru. Folder paket lokal sekitar 7,5 MiB, bukan estimasi tambahan APK.
- `propertyVideoTransport.native.ts` membentuk multipart dengan objek `File` dari URI picker, bukan object `{uri,name,type}` yang dicast menjadi Blob. File dicek keterbacaan/ukuran sebelum request, tanpa konversi base64 atau pembacaan seluruh video ke memori JS.
- RepositoriesProvider mengarahkan hanya POST ke endpoint persis `/functions/v1/property-video-upload` pada host Supabase terkonfigurasi ke `expo/fetch`. SDK tetap menyuntikkan token sesi/API key; auth, REST, foto, chat dan endpoint lain memakai fetch sebelumnya.
- Web tetap menggunakan browser File dan transport SDK. ID upload sama pada retry; server tetap memvalidasi MP4/durasi/ukuran dan tidak menimpa objek.
- Error `VIDEO_FILE` meminta pilih ulang bila URI tidak tersedia. `VIDEO_SIZE` menolak di atas 50 MiB sebelum jaringan. Error network/HTTP sebelumnya tetap dipertahankan.
- Tidak ada SQL, perubahan policy, deploy Function, atau push.

## Validasi

55 tes Owner lulus, termasuk preflight metadata 17 MiB, file kosong/hilang/oversize, ID stabil, routing endpoint tepat, header SDK dan multipart tanpa Content-Type manual. Tiga tes adapter video root lulus. Typecheck dan lint Owner lulus. Fixture file pada unit test bukan video nyata dari Android.

Export bundle Android melalui Metro juga lulus (1342 modules); artefak disimpan di folder sementara, tidak di-publish. Ini memverifikasi bundling native, bukan upload pada perangkat nyata.

## Uji perangkat dan rollback

Reload penuh aplikasi agar provider memakai fetch baru. Pilih ulang video dari Galeri jika draft sebelumnya hilang akibat reload; jika draft masih ada, pilih Coba unggah sisanya. Tunggu pratinjau lalu Simpan perubahan. Jika `VIDEO_FILE`, batalkan sisa unggahan dan pilih ulang berkas lokal. Jika gagal lagi, laporkan kode yang ditampilkan; jangan menyimpulkan ukuran/orientasi sebagai penyebab tanpa bukti.

Rollback dengan git revert commit transport native; backend DEV dan objek lama tidak berubah. Referensi: https://docs.expo.dev/versions/latest/sdk/filesystem/#uploading-files-using-expofetch .
