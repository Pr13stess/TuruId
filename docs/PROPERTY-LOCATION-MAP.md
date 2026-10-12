# Pemilih lokasi kos — 12 Oktober 2026

Form Tambahkan/Edit kos Owner mengganti input latitude dan longitude dengan tombol Pilih lokasi kos. Pemilik menggeser atau mengetuk OpenStreetMap, lalu menekan Gunakan lokasi ini. Koordinat masuk ke state formulir, kemudian disimpan melalui RPC properti yang sudah ada ketika Simpan kos ditekan. Menutup modal/Back tidak mengubah titik sebelumnya. Lokasi tetap opsional; tombol Lepaskan titik lokasi mengembalikan kedua koordinat ke null.

Edit membuka titik tersimpan pada zoom 17. Kos baru membuka gambaran Indonesia tanpa menganggap titik awal sebagai pilihan. Konfirmasi dinonaktifkan sampai peta siap dan titik dipilih, juga selama peta bergerak atau gagal dimuat. Ada timeout dan tombol muat ulang. Alamat lengkap tetap diisi di form; tidak ada permintaan GPS atau geocoding. Peta memerlukan internet.

WebView 13.16.1 ditambahkan ke Owner sesuai persetujuan pengguna, memakai versi yang sudah tersedia di monorepo. Android/iOS memakai WebView, web memakai iframe dengan pemeriksaan sumber pesan. Leaflet 1.9.4 dimuat dari CDN, tiles dari OpenStreetMap. Atribusi terlihat, aplikasi mengidentifikasi dirinya sebagai TuruIdOwner/0.1, dan cache WebView tetap aktif. Tidak ada prefetch/offline download. Rujukan: [kebijakan tiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

File baru:

- `apps/owner-app/src/domain/propertyLocation.ts`: validasi koordinat dan status konfirmasi.
- `apps/owner-app/src/presentation/components/PropertyLocationPicker.tsx`: modal dan aksi konfirmasi/cancel/retry.
- `apps/owner-app/src/presentation/components/propertyMapHtml.ts`: peta, pin, atribusi, pesan pergerakan dan kegagalan.
- `apps/owner-app/src/presentation/components/PropertyMapSurface.tsx` dan `.web.tsx`: host native/web.
- `apps/owner-app/tests/propertyLocation.test.mjs`: validasi pesan, batas koordinat, nilai nol, cancel, serta gating konfirmasi.

File lama: `PropertyFormScreen.tsx`, Owner `package.json`, dan root `package-lock.json`. Diff lengkap: [PROPERTY-LOCATION-MAP-DIFF.patch](PROPERTY-LOCATION-MAP-DIFF.patch), baseline `4e50161`.

Validasi lokal:

| Pemeriksaan | Hasil |
|---|---|
| `npm.cmd test` | 73/73 lolos |
| `npm.cmd test --workspace=kosku-owner` | 38/38 lolos |
| Typecheck kedua workspace | Lolos |
| Lint kedua workspace | Lolos tanpa error; tiga warning lama RegisterScreen User |
| Expo export Owner Android + web, offline, `--no-bytecode` | Lolos; `.expo/property-map-owner` |
| `git diff --check` | Lolos |

Belum diuji sentuhan/perenderan tile di perangkat fisik atau penyimpanan di Supabase DEV. Uji manual: buka Tambahkan kos → Pilih lokasi kos → geser/tap → Gunakan lokasi ini → buka lagi dan pastikan titik tetap. Coba ubah lalu tutup tanpa konfirmasi: titik lama harus tetap. Matikan jaringan dan muat ulang peta: tampil error, jangan bisa konfirmasi; nyalakan jaringan lalu coba lagi. Setelah diizinkan menguji DEV, simpan kos dan buka ulang untuk memastikan koordinat persisten.

Tidak ada SQL, migrasi, deploy, perubahan backend, atau push. SQL/deploy fitur video sebelumnya tetap menunggu persetujuan terpisah. Rollback lokal: revert commit fitur peta lalu commit dependensi; kolom DB koordinat tidak berubah.
