> Pembaruan 19 Oktober 2026: migrasi `20261018233349_owner_edit_property_and_submit.sql` telah diterapkan ke DEV dengan persetujuan pengguna, bersama dukungan video. RPC dan RLS telah diperiksa. Catatan ?belum diterapkan? di bawah adalah hasil tahap lokal sebelumnya. Lihat `PROPERTY-VIDEO-DEV.md`.

# Edit kos dan pengajuan ulang

19 Oktober 2026. Perubahan kode lokal; migrasi baru **belum diterapkan ke DEV**.

## Temuan dan pemulihan DEV

Project: `fhapolumdqqewwhxnjcb`. Kos Mentari (`069a315c-9956-4bc0-b943-af0a7314a269`) berstatus PENDING setelah pembaruan 18 Oktober. Pengajuan sebelumnya APPROVED (ditinjau 12 Oktober); belum ada pengajuan ulang. Fungsi DEV `owner_save_property` mengubah status tanpa memasukkan pengajuan baru.

SQL pemulihan yang ditampilkan di percakapan dan disetujui hanya menambahkan pengajuan PENDING untuk kos tersebut memakai bukti pengajuan sebelumnya. Hasil SELECT DEV: pengajuan baru `2a6c3f5a-85be-4868-830a-eba8b4ac7e9c`, waktu `2026-10-18 23:33:47.585261+00`. Pengajuan lama tetap APPROVED, kos tetap PENDING. Admin masih harus meninjau pengajuan baru. Tidak ada persetujuan otomatis, perubahan policy, atau perubahan objek Storage.

## Perubahan lokal

- Migrasi baru root `20261018233349_owner_edit_property_and_submit.sql` diambil dari SQL proposal yang disetujui. Menambah tabel retry privat dan RPC; tidak mengganti fungsi atau policy lama.
- RPC memakai validasi dan fungsi simpan/verifikasi lama dalam satu transaksi. Bukti dapat berasal dari pengajuan terdahulu yang masih valid dan dimiliki owner. Tanpa bukti valid, edit batal.
- ID retry sama harus membawa payload dan bukti yang sama. Retry sukses mengembalikan ID kos tanpa menambah pengajuan. Kegagalan pengajuan membatalkan perubahan kos.
- PropertyEditor dan cabang edit PropertyFormScreen memakai RPC baru. Jalur tambah kos tidak diubah. Tidak ada fallback simpan terpisah bila RPC belum tersedia.
- Client mempertahankan ID/payload selama layar dan provider tetap terpasang; tidak bertahan setelah aplikasi ditutup. Jika gagal, retry mengirim isi sebelumnya; UI menjelaskan perilaku itu. Jika memperbaiki isian yang ditolak, periksa hasil lalu buka ulang formulir.
- Mock menyimpan bukti, catatan retry dan pengajuan dalam satu penulisan storage. Ini bukan bukti integrasi DEV.
- Payload video tetap membutuhkan `owner_save_property_gallery`. Bila belum tersedia, RPC menolak tanpa menyimpan sebagian. Fitur video tidak dipasang melalui perubahan ini.

## Validasi dan langkah setelah izin deploy

Tes khusus menguji respons hilang, klik ganda, payload tetap, penolakan payload retry berbeda, adapter tanpa fallback, mock restart, SQL rollback setelah simpan, bukti lama, owner lain, akses anon, dan guard video. Database tes memakai PGlite lokal, bukan DEV.

Perintah: `npm.cmd run test --workspace=kosku-owner`, `npm.cmd test`, serta `typecheck` dan `lint` pada workspace `kosku-owner` dan `@kosku/user-app`.

Hasil lokal: 50 tes Owner dan 109 tes root/User lulus; typecheck kedua aplikasi lulus; lint Owner bersih dan lint User selesai tanpa error (3 warning lama pada setter yang tidak digunakan di RegisterScreen). Diff lima file lama tersedia pada `PROPERTY-EDIT-VERIFICATION.diff`.

Sebelum memakai editor baru di DEV, terapkan hanya migrasi baru ini setelah persetujuan deploy terpisah; jangan menjalankan semua migrasi tertunda atau menggabungkan jalur migrasi Owner. Verifikasi fungsi dan izin sesudah apply.

Uji manual: Admin > Kos > Menunggu > Kos Mentari; tinjau lalu setujui pengajuan baru. Owner > Kelola properti > Periksa ulang harus menunjukkan Terverifikasi. Edit deskripsi dari editor inline, lalu dari formulir edit lengkap: setiap simpan berhasil menghasilkan pengajuan terbaru di Admin. Putuskan koneksi ketika menyimpan lalu retry di layar yang sama: hanya satu pengajuan untuk ID tersebut. Uji bukti tidak valid dan pastikan isi kos tidak berubah. Persetujuan Admin tetap manual. Belum diuji melalui perangkat Android atau RPC baru di DEV.

## Rollback

Revert commit client untuk kembali ke jalur lama; bug pengajuan terputus pada jalur lama akan kembali. Biarkan tabel/fungsi aditif bila kelak terpasang, tanpa DROP atau penghapusan pengajuan. Pemulihan Kos Mentari tidak perlu dihapus: Admin dapat memutuskan pengajuan melalui alur normal. Tidak ada push.
