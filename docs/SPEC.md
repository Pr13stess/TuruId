# Spesifikasi Aplikasi Pencarian Kos (TuruId)

Versi revisi 2.0 untuk proyek kuliah · 22 September 2026 · Android dan iOS · Admin web

---

## Catatan keputusan (addendum, mengalahkan isi di bawah bila bertentangan)

Bagian ini ditambahkan setelah spesifikasi v2.0 dan **berlaku lebih dulu** daripada teks asli di bawahnya.

1. **Provider pembayaran: Xendit (mode test/sandbox), bukan Midtrans.**
   - Berlaku untuk Bagian 7, 8, 17, 18, 21 (R3 sampai R6), dan AC07 sampai AC10, AC25. Setiap kata "Midtrans" di bawah dibaca "Xendit".
   - Aturan bisnis tidak berubah: hold 15 menit, status booking dan pembayaran terpisah, webhook idempotent, harga dari snapshot server, sukses terlambat masuk refund atau rekonsiliasi, serta label "DEMO / SANDBOX PAYMENT".
   - Hal yang khusus provider mengikuti dokumentasi Xendit: verifikasi webhook (callback token, bukan signature SHA512), pemetaan status provider ke status internal, dan mekanisme refund. Detailnya ditetapkan setelah audit kode, bukan ditebak di sini.
   - Rahasia Xendit hanya boleh ada di backend.
2. **Nama produk: TuruId.** Sebagian kode dan konfigurasi masih memakai "KosKu / KosKu Owner". Rebranding teks dan logo dikerjakan lebih dulu; identitas teknis (package ID, scheme, key penyimpanan) dikerjakan terpisah.
3. **Cakupan pengerjaan saat ini.** Item berikut tetap menjadi bagian spesifikasi, tetapi **sedang ditunda** dan harus dinyatakan sebagai batas cakupan, bukan fitur selesai, bila belum dikerjakan: booking dan checkout dari User App (termasuk pembayaran dan refund end-to-end), voice/video call dengan Agora pada perangkat nyata, serta notifikasi push. Ubah catatan ini bila status berubah.
4. **Sumber kebenaran migrasi database:** `supabase/migrations` di root. Konsolidasi dilakukan lewat migrasi tambahan yang aditif, tanpa mengedit riwayat yang sudah diterapkan.

---

## 1. Tujuan dan ruang lingkup

Aplikasi membantu mahasiswa dan pekerja mencari kos berdasarkan lokasi, membandingkan pilihan, melakukan survei virtual, lalu memesan tipe kamar melalui pembayaran simulasi. Dokumen ini menjadi acuan bersama untuk wireframe, rancangan database, implementasi, pengujian, dan demonstrasi proyek kuliah.

Sistem terdiri atas dua aplikasi mobile terpisah untuk pencari kos dan pemilik kos, serta satu admin web. Ketiganya berada dalam satu monorepo dan menggunakan satu backend, database, serta sistem autentikasi Supabase. Satu akun dapat memiliki peran USER dan OWNER sekaligus.

### Keputusan inti produk

- Pencarian memakai lokasi umum dan jarak garis lurus Haversine. Kampus merupakan salah satu titik acuan, bersama kantor, kota, stasiun, rumah sakit, dan tempat lain.
- Inventory berupa jumlah per tipe kamar. Owner mengelola kondisi aktual; sistem menghitung kapasitas tersedia dan menahan kapasitas selama checkout serta booking confirmed.
- Booking memakai tipe kamar dan pricing plan. Pembayaran sukses yang diverifikasi backend menghasilkan konfirmasi otomatis. Status booking dan status pembayaran disimpan terpisah.
- Midtrans Sandbox memakai konsep Model A *(lihat addendum: provider diganti Xendit)*. Seluruh pembayaran, refund, pendapatan, dan payout pada demo merupakan simulasi tanpa perpindahan dana nyata.
- Chat teks dan gambar, voice call, video call, bookmark, serta satu catatan privat per user per kos termasuk cakupan wajib. Catatan dan bookmark tetap dapat digunakan selama video call.

### Batas cakupan

MVP mencakup verifikasi manual owner dan properti, laporan, moderasi, notifikasi, ulasan penyewa, penghapusan akun, serta mockup Privacy Policy dan Terms. Tidak ada penomoran kamar fisik, mesin reservasi kalender, pembayaran produksi, rekaman panggilan, dokumen chat, atau kontrak elektronik. Masa tinggal tidak berakhir otomatis karena penyewa lupa memesan ulang.

Urutan dokumen: arsitektur dan pencarian; inventory, booking, pembayaran; komunikasi dan pengelolaan; keamanan dan data; kebijakan demo; implementasi dan kriteria penerimaan.

---

## 2. Arsitektur dan peran pengguna

### Aplikasi terpisah dengan kode bersama

| Komponen | Tanggung jawab |
|---|---|
| `apps/user-app` | React Native dan Expo untuk pencarian, detail kos, favorit, catatan, chat, panggilan, booking, pembayaran, dan ulasan. |
| `apps/owner-app` | React Native dan Expo untuk properti, tipe kamar, inventory, harga, booking masuk, komunikasi, dan ringkasan aktivitas. |
| `apps/admin-web` | React web untuk verifikasi, moderasi, laporan, pembatalan khusus, transaksi, dan audit. |
| `packages` | UI, auth, types, database client, chat, utils, dan config yang dapat dibagikan. Komponen visual mobile dan web disesuaikan dengan platform. |
| `supabase` | Migrasi schema, RLS, fungsi database, Edge Functions, konfigurasi, dan seed setelah schema stabil. |

Ketiga aplikasi memakai satu Supabase Project untuk lingkungan demo, meliputi PostgreSQL, Auth, Storage, Realtime, dan Edge Functions. Integrasi pembayaran, penerbitan token Agora, serta operasi sensitif berada di backend. Agora menangani media panggilan; notifikasi push memakai layanan yang sesuai perangkat.

### Identitas dan hak akses

- **USER** mencari dan memesan kos, berkomunikasi, menulis catatan sendiri, dan memberikan ulasan yang memenuhi syarat.
- **OWNER** mengelola properti miliknya. Akun tanpa properti melihat keadaan kosong dengan aksi Tambahkan Kos. Peran owner tidak otomatis berarti sudah terverifikasi.
- **ADMIN** memakai admin web. Peran ini diberikan oleh pengelola sistem dan tidak dapat dipilih sendiri saat registrasi.

Relasi `user_roles` mendukung beberapa peran untuk satu identitas Supabase Auth. Login dengan email yang sama di kedua aplikasi membaca identitas yang sama, dengan sesi masing-masing. Tidak ada tombol beralih menjadi aplikasi owner di dalam App User.

### Akses awal

Splash dilanjutkan onboarding singkat yang dapat dilewati, lalu login atau daftar melalui email dan password. Registrasi meminta nama, email, password, serta nomor HP; kampus bersifat opsional. Verifikasi email, lupa password, ubah profil, ubah password, dan logout tersedia. Owner baru menjalani pendaftaran owner dan verifikasi melalui Owner App.

Navigasi utama App User: Home, Chat, Booking Saya, dan Profil. Favorit, Catatan Saya, riwayat pembayaran, pengaturan, bantuan, dan kebijakan dapat diakses dari Profil. Admin web menggunakan navigasi dashboard berbasis modul.

---

## 3. Pencarian lokasi dan pengalaman penemuan

### Titik acuan yang berlaku untuk semua pengguna

User dapat mencari nama kos, area, kecamatan, kota, kampus, kantor, mall, rumah sakit, stasiun, atau landmark. Setiap pilihan lokasi menyimpan label, latitude, dan longitude yang jelas. Hasil lokasi yang namanya sama dibedakan melalui alamat atau kota sebelum dipilih.

Home menampilkan pencarian, lokasi acuan, tombol Filter dan Urutkan, notifikasi, serta kartu kos. Izin lokasi diminta setelah user memilih Aktifkan Lokasi dan membaca penjelasan kegunaannya. Jika izin ditolak, pencarian manual tetap berfungsi. Tidak ada kebutuhan pelacakan lokasi di latar belakang.

### Sumber pencarian dan peta

- Saran nama kos diambil dari database Supabase. Riwayat pencarian terakhir tersedia untuk user.
- Pencarian tempat melalui geocoding dijalankan saat user menekan Cari. Public Nominatim tidak dipakai untuk autocomplete per karakter. Gunakan cache, identitas aplikasi, serta antrean dengan batas total maksimal satu permintaan per detik apabila memakai layanan publik tersebut. [R1]
- OpenStreetMap digunakan sebagai sumber peta dengan atribusi yang terlihat. Penyedia tile harus mengikuti kebijakan layanannya; tile publik bukan layanan tanpa batas. Konfigurasi sumber geocoding dan tile dapat diganti. [R2]

### Jarak Haversine

Backend menghitung jarak garis lurus dari koordinat titik acuan ke koordinat properti menggunakan Haversine, dengan radius bumi sekitar 6.371 km. Koordinat diubah ke radian sebelum perhitungan. Gunakan nilai numerik penuh untuk filter dan sorting; pembulatan hanya dilakukan saat menampilkan meter atau kilometer.

Label antarmuka berbunyi "± 850 m dari lokasi pilihanmu" dengan keterangan jarak garis lurus. MVP tidak menampilkan estimasi waktu perjalanan atau jarak rute. Urutkan Terdekat hanya aktif jika koordinat acuan tersedia; jika tidak, user diminta memilih lokasi atau memilih urutan lain.

### Filter dan sorting dalam bottom sheet

Satu bottom sheet memiliki kelompok Filter dan kelompok Urutkan yang berbeda. Filter meliputi harga, jarak maksimum, tipe kos Putra atau Putri atau Campur, paket sewa, fasilitas kamar, fasilitas umum, serta rating minimal. Urutkan menyediakan Terdekat, Harga Terendah, dan Rating Tertinggi. Tersedia Terapkan, Reset, serta indikator filter aktif.

Harga dibandingkan dalam periode paket yang sama; harga harian tidak dibandingkan langsung dengan harga tahunan. Kartu menampilkan "mulai dari", periode harga, foto, nama, jarak, rating, jumlah ulasan, serta ketersediaan agregat. Harga dan fasilitas yang ditampilkan harus berasal dari tipe kamar yang benar-benar cocok dengan filter. Hasil dipaginasi dan memakai pengurutan tambahan berdasarkan ID untuk hasil yang seri.

---

## 4. Properti dan inventory per tipe kamar

### Struktur kos

Satu property mewakili satu kos dan memiliki banyak room type. Perbedaan lantai, ukuran, kamar mandi, fasilitas, atau harga dapat diwakili tipe berbeda, misalnya Standard Lantai 1 dan Deluxe Lantai 4. Setiap tipe mempunyai jumlah kapasitas dan beberapa pricing plan. User memesan satu unit dari satu tipe; penempatan kamar fisik dilakukan owner di luar aplikasi.

Detail kos menampilkan galeri dengan zoom, alamat dan peta, deskripsi, fasilitas umum, peraturan, tipe kamar beserta fasilitas dan harga, jumlah tersedia, badge verifikasi, profil ringkas owner, serta rating dan ulasan. Aksi mencakup Chat, Call, Booking, Catatan, Bookmark, Bagikan, dan Laporkan. Metrik waktu respons hanya ditampilkan bila tersedia data yang dapat dihitung.

### Jumlah yang dikelola owner dan sistem

| Jumlah | Pengelola | Makna |
|---|---|---|
| `total` | Owner | Kapasitas fisik tipe kamar. |
| `occupied` | Owner melalui alur tervalidasi | Unit sedang ditempati, termasuk penyewa di luar aplikasi. |
| `cleaning` | Owner | Unit sedang dibersihkan. |
| `maintenance` | Owner | Unit sedang diperbaiki. |
| `inactive` | Owner | Unit sengaja tidak ditawarkan. |
| `temporary_hold` | Sistem | Unit ditahan selama checkout yang masih berlaku. |
| `reserved_confirmed` | Sistem | Unit sudah confirmed tetapi belum ditempati. |
| `available` | Dihitung sistem | Sisa kapasitas yang dapat dipesan. |

```
available = total − occupied − cleaning − maintenance − inactive − temporary_hold − reserved_confirmed
```

`reserved_confirmed` merupakan alokasi sistem, bukan status tambahan yang harus diisi owner. Tanpa alokasi ini, kapasitas yang sudah dibayar berisiko terbuka kembali ketika hold berakhir. Setiap unit hanya dihitung dalam satu kelompok pada satu waktu.

### Kontrol ketersediaan

UI owner memakai kontrol tambah atau kurang untuk jumlah per kondisi. Available ditampilkan sebagai hasil perhitungan, bukan kolom input bebas. Semua jumlah berupa bilangan bulat nonnegatif dan penjumlahan alokasi tidak boleh melebihi total. Penurunan total atau perubahan kondisi yang bertabrakan dengan booking ditolak dan dijelaskan.

Contoh: total 10, occupied 5, cleaning 1, maintenance 1, inactive 0, hold 1, dan reserved 1 menghasilkan available 1. Saat check-in, reserved turun 1 dan occupied naik 1 secara bersamaan. Saat penyewa keluar, occupied berpindah ke cleaning; tersedia kembali hanya setelah owner menyatakan siap. Pergantian bulan atau akhir paket harga tidak mengosongkan inventory otomatis.

---

## 5. Alur booking dan penguncian kapasitas

### Alur utama

1. User membuka detail kos, memilih room type dan pricing plan yang aktif, lalu membaca biaya, peraturan, dan kebijakan pembatalan. Tanggal rencana masuk boleh dicatat untuk koordinasi, tetapi tidak memesan jendela ketersediaan di masa depan.
2. Saat user melanjutkan checkout, backend memeriksa identitas, verifikasi dan status listing, pembatasan owner terhadap user, harga terbaru, serta available. Backend mengunci data inventory dan membuat booking beserta hold satu unit dalam satu transaksi database.
3. Checkout menampilkan ringkasan biaya dan hitung mundur hold. Default demo adalah 15 menit berdasarkan waktu server. Satu user tidak boleh menumpuk hold aktif yang sama untuk tipe yang sama.
4. Backend membuat transaksi pembayaran sandbox dari snapshot nominal booking, kemudian memberikan sesi checkout kepada aplikasi. Jika pembuatan transaksi gagal, sistem menangani retry dengan ID yang sama atau melepas hold secara aman.
5. Webhook pembayaran yang sah memicu pemeriksaan status. Jika pembayaran valid dan alokasi masih berlaku, backend mengubah booking menjadi CONFIRMED dan memindahkan hold ke `reserved_confirmed` secara atomik. Owner menerima notifikasi tanpa tahap persetujuan normal setelah pembayaran.
6. Owner menandai check-in sebagai ACTIVE setelah penyewa benar-benar masuk. Saat masa tinggal selesai dan penyewa keluar, owner menandai COMPLETED melalui alur checkout. Inventory berpindah ke cleaning atau kondisi aktual lainnya.

### Perlindungan terhadap booking ganda

Pemeriksaan available dan penambahan hold dilakukan di dalam transaksi PostgreSQL dengan penguncian baris atau mekanisme setara. Pembacaan kapasitas dari aplikasi hanya untuk tampilan. Untuk dua permintaan bersamaan pada unit terakhir, tepat satu permintaan boleh memperoleh hold.

Perubahan inventory oleh owner menggunakan penguncian yang sama. Aplikasi tidak boleh menulis available, reserved, atau hold secara langsung. Pembaruan berulang harus idempoten: mengulang permintaan tidak menambah booking, memotong kapasitas, atau mengirim refund dua kali.

### Kedaluwarsa dan gangguan jaringan

Hold dibersihkan oleh pekerjaan backend berkala dan diperiksa kembali saat akses checkout atau pembuatan hold berikutnya. Masa berlaku sesi pembayaran diselaraskan dengan hold jika metode mendukungnya. Saat user kembali setelah koneksi putus, aplikasi mengambil status server dan tidak memulai transaksi baru tanpa pemeriksaan.

Pembayaran sukses yang tiba setelah hold dilepas tidak boleh mengambil alokasi milik user lain. Booking tetap CANCELLED, pembayaran sukses dicatat, lalu masuk penanganan refund atau rekonsiliasi admin. Notifikasi webhook yang terlambat atau berulang tidak boleh mengubah booking terminal menjadi confirmed secara sepihak.

---

## 6. Status booking dan kebijakan pembatalan

### Status booking yang berlaku

| Status | Arti dan pemicu | Dampak inventory |
|---|---|---|
| `DRAFT` | Pilihan dan ringkasan awal; belum checkout. | Tidak mengalokasikan unit. |
| `HELD` | Backend berhasil menahan kapasitas. | Temporary hold satu unit. |
| `PENDING_PAYMENT` | Sesi pembayaran tersedia dan menunggu hasil. | Hold tetap berlaku hingga batas server. |
| `CONFIRMED` | Pembayaran sah dan booking terkonfirmasi. | Hold dipindahkan ke reserved. |
| `ACTIVE` | Owner mengonfirmasi penyewa sudah masuk. | Reserved dipindahkan ke occupied. |
| `COMPLETED` | Owner mengonfirmasi masa tinggal selesai. | Occupied dipindahkan ke cleaning atau kondisi lain. |
| `CANCELLED` | Dibatalkan sebelum aktif atau hold berakhir. | Alokasi dilepas sesuai kondisi aktual. |

Status normal: DRAFT → HELD → PENDING_PAYMENT → CONFIRMED → ACTIVE → COMPLETED. Penyebab batal disimpan terpisah, misalnya `USER_CANCELLED`, `HOLD_EXPIRED`, `PAYMENT_FAILED`, `OWNER_EXCEPTION`, atau `LATE_PAYMENT`. Riwayat menyimpan aktor, alasan, status sebelumnya, dan waktu server.

### Aturan operasional pembatalan demo

- **Sebelum pembayaran sukses:** user dapat membatalkan checkout. Backend membatalkan upaya pembayaran jika memungkinkan, menandai booking CANCELLED, dan melepas hold. Tidak ada refund untuk pembayaran yang belum berhasil. Menutup layar pembayaran saja tidak dianggap pembatalan definitif.
- **Setelah CONFIRMED dan sebelum ACTIVE:** pembatalan user memicu refund penuh atas jumlah yang telah dibayar saat booking dalam simulasi demo. Sisa sewa yang belum dibayar tidak termasuk refund. Kebijakan ini ditampilkan sebelum checkout.
- **Setelah ACTIVE:** tombol pembatalan biasa dinonaktifkan. User menghubungi owner atau admin untuk penghentian masa tinggal, penyelesaian biaya, serta deposit. Alur ini tidak otomatis mengubah kamar menjadi available.
- **Owner** tidak menolak booking confirmed sebagai alur normal. Kasus luar biasa menggunakan permintaan pembatalan dengan alasan dan penanganan admin. Pembatalan akibat owner sebelum masuk memicu refund simulasi penuh.

Pembatalan, pelepasan alokasi, dan refund adalah tindakan berbeda. Booking dapat CANCELLED sementara pembayaran REFUND_PENDING. Selesainya refund tidak mengubah inventory lagi. Jika alasan pembatalan menunjukkan kamar bermasalah, owner atau admin memindahkan kapasitas ke maintenance atau inactive dalam operasi yang sama.

---

## 7. Status pembayaran dan integrasi provider

*(Teks asli menyebut Midtrans; lihat addendum, provider yang dipakai adalah Xendit.)*

### Status pembayaran terpisah

| Status internal | Makna |
|---|---|
| `PENDING` | Transaksi sudah dibuat dan belum memiliki hasil akhir. |
| `SUCCESS` | Pembayaran dinyatakan berhasil oleh backend setelah verifikasi provider. |
| `FAILED` | Upaya pembayaran gagal atau ditolak secara definitif. |
| `EXPIRED` | Batas pembayaran berakhir. |
| `CANCELLED` | Upaya pembayaran dibatalkan tanpa sukses sebelumnya. |
| `REFUND_PENDING` | Pembayaran pernah sukses dan pengembalian sedang ditangani. |
| `REFUNDED` | Seluruh jumlah yang diminta pada refund penuh telah terkonfirmasi kembali dalam simulasi. |

Satu booking dapat mempunyai beberapa payment attempt. Setiap attempt menyimpan `order_id` unik, transaction_id provider, nominal, metode, status mentah provider, status internal, dan waktu perubahan. Nilai null atau belum adanya payment row pada DRAFT tidak disamakan dengan gagal bayar.

### Alur backend dan verifikasi

App → Edge Function pembuat transaksi → provider sandbox → simulator pembayaran → webhook backend → database → pembaruan tampilan App User dan Owner App. Client callback hanya membantu navigasi; tidak menetapkan pembayaran sukses.

Endpoint webhook harus dapat diakses provider melalui HTTPS. Backend memverifikasi keaslian notifikasi, mencocokkan identitas pesanan serta nominal, dan menggunakan status provider yang terverifikasi untuk transisi. Simpan kunci server hanya di backend. *(Teks asli untuk Midtrans: signature SHA512 dari order_id, status_code, gross_amount, dan ServerKey. Untuk Xendit mengikuti mekanisme callback token milik Xendit.)* [R3]

Pemetaan minimum (versi Midtrans): pending ke PENDING; settlement ke SUCCESS; capture dengan fraud_status accept ke SUCCESS; deny ke FAILED; expire ke EXPIRED; cancel ke CANCELLED. Capture dengan challenge belum dianggap sukses dan perlu rekonsiliasi. Status tidak dikenali atau urutan meragukan diperiksa melalui API status provider. Padanan untuk Xendit ditetapkan setelah audit kode. [R4]

Gunakan pencatatan event dan idempotency agar webhook berulang tidak menggandakan efek bisnis. Status pending yang datang terlambat tidak boleh menurunkan pembayaran sukses. Pengujian wajib mencakup salah verifikasi, salah nominal, duplikasi, urutan terbalik, dan sukses setelah booking dibatalkan.

### Refund dan metode pembayaran

Gunakan metode sandbox yang sudah diuji, misalnya virtual account, dan tampilkan hanya metode yang tersedia pada akun uji. Refund provider memakai endpoint sandbox untuk metode serta status transaksi yang mendukung. Jika tidak didukung, admin memakai alur simulasi internal berlabel jelas; catatan tidak boleh mengklaim refund provider telah berhasil. [R5]

Booking Saya dan riwayat pembayaran menampilkan kedua status secara berdampingan, misalnya "Booking dibatalkan" dan "Pengembalian sedang diproses". Riwayat sukses asli tetap tersimpan saat status berjalan menjadi REFUND_PENDING.

---

## 8. Pricing plan dan simulasi Model A

### Paket harga yang fleksibel

Setiap room type memiliki pricing plan dengan nama, `duration_unit`, `duration_value`, `price`, currency IDR, aturan `booking_down_payment`, `security_deposit`, ketentuan pengembalian deposit, dan `is_active`. Paket harian, mingguan, bulanan, tiga bulanan, enam bulanan, dan tahunan dapat ditawarkan sesuai owner. Harga setiap paket berdiri sendiri dan tidak wajib merupakan perkalian harga harian.

DP booking adalah bagian dari harga sewa. Security deposit adalah jaminan terpisah dan tidak mengurangi sisa sewa. Owner dapat mengatur DP nominal atau persentase dan deposit tidak ada, nominal, atau persentase harga paket. Konfigurasi menentukan hak pengembalian deposit serta kondisi potongan yang harus terlihat sebelum booking.

Backend menghitung semua nominal dalam rupiah bulat, memvalidasi DP tidak melebihi harga paket, serta menyimpan snapshot harga dan kebijakan pada booking. Perubahan harga owner tidak mengubah checkout yang sudah memperoleh hold maupun transaksi sebelumnya.

### Contoh ringkasan biaya

| Komponen | Nominal | Penjelasan |
|---|---|---|
| Harga sewa satu bulan | Rp1.500.000 | Total sewa paket yang dipilih. |
| DP booking | Rp500.000 | Bagian dari harga sewa. |
| Security deposit | Rp500.000 | Dibayar bersama DP saat booking. |
| Bayar saat booking | Rp1.000.000 | DP ditambah security deposit. |
| Sisa sewa saat masuk | Rp1.000.000 | Harga sewa dikurangi DP. |
| Total kewajiban awal | Rp2.000.000 | Harga sewa ditambah deposit; DP tidak dihitung dua kali. |

```
Bayar sekarang = DP booking + security deposit
Sisa sewa      = harga paket − DP booking
```

Sisa sewa saat check-in dicatat sebagai penyelesaian dengan owner dalam demo; MVP tidak menambahkan tagihan berulang otomatis.

### Model A dalam lingkungan akademik

Konsep penerimaan pembayaran adalah User → Platform → Owner. Sistem mencatat pembayaran sandbox pada platform, alokasi untuk owner, serta simulasi payout. Owner tidak memerlukan akun submerchant untuk demo. Tidak ada uang nyata masuk ke platform atau ditransfer ke rekening owner.

Laporan memisahkan `gross_amount`, bagian DP, bagian deposit, `platform_fee`, `owner_amount`, refund, dan `payout_status`. Deposit ditampilkan sebagai jaminan yang perlu diselesaikan, bukan pendapatan platform. Default fee demo adalah nol; skenario komisi boleh dikonfigurasi dan diberi label simulasi. Angka komisi contoh tidak menetapkan kebijakan komersial.

Seluruh checkout dan laporan menampilkan "DEMO / SANDBOX PAYMENT". Pembayaran uji hanya melalui simulator atau kredensial uji provider. Referensi virtual account atau QR sandbox tidak dibayar memakai bank maupun dompet digital nyata. [R6]

---

## 9. Chat serta voice dan video call

### Percakapan sebelum booking

User dapat memulai chat dari detail kos tanpa booking. Percakapan terikat pada property, user, dan owner, sehingga konteks kos tidak hilang ketika owner mengelola beberapa properti. Daftar chat menampilkan nama, foto, preview pesan terakhir, waktu, dan jumlah pesan belum dibaca.

Jenis pesan MVP adalah `TEXT`, `IMAGE`, dan `CALL_EVENT`. User dan owner dapat mengirim teks serta gambar, termasuk dari galeri atau kamera. Lampiran PDF, DOCX, ZIP, audio, video, dan file bebas tidak diterima. Indikator sedang mengetik serta tanda baca rinci merupakan tambahan setelah fungsi inti stabil.

Pesan disimpan ke PostgreSQL, lalu disebarkan melalui Supabase Realtime kepada peserta yang berhak. Gambar dikompresi, divalidasi, disimpan di bucket privat, dan ditampilkan melalui akses yang terotorisasi. Pengiriman berulang memakai ID pesan client untuk mencegah duplikat. Kegagalan unggah memiliki tombol coba lagi dan tidak menampilkan pesan seolah sudah terkirim.

### Siklus panggilan

1. Pemanggil memilih voice atau video dari detail atau chat. Backend memeriksa peserta, pembatasan, dan status panggilan, lalu membuat `call_id` serta channel unik untuk satu sesi.
2. Backend menerbitkan token Agora dengan masa berlaku terbatas untuk peserta yang sah. Penerima memperoleh sinyal incoming call melalui Realtime atau push. Agora menangani aliran audio dan video. [R7]
3. Penerima dapat menerima atau menolak. Aplikasi menyediakan kontrol mikrofon, kamera, ganti kamera, speaker, dan akhiri panggilan sesuai jenis call. Kondisi sibuk, izin ditolak, gagal tersambung, dan jaringan terputus ditampilkan dengan jelas.
4. Setelah berakhir, backend menyimpan hasil panggilan dan menambahkan `CALL_EVENT` pada percakapan. Panggilan yang tidak dijawab menjadi missed call setelah timeout; sinyal incoming call yang sudah kedaluwarsa tidak boleh membuka sesi lama.

### Riwayat metadata saja

Metadata mencakup `call_id`, `conversation_id`, `caller_id`, `receiver_id`, `type`, `created_at`, `started_at`, `answered_at`, `ended_at`, `duration_seconds`, dan `status`. Status berjalan dapat memakai RINGING atau CONNECTED; hasil akhir mencakup COMPLETED, MISSED, DECLINED, CANCELLED, dan FAILED.

Durasi bicara dihitung sejak `answered_at` hingga `ended_at`; panggilan tidak dijawab berdurasi nol. Tidak ada perekaman audio atau video, penyimpanan frame, maupun transkrip. Catatan user disimpan sebagai data tersendiri dan bukan bagian dari rekaman panggilan.

### Kebutuhan platform

Integrasi Agora native diuji memakai Expo Development Build untuk kedua aplikasi. Expo Go cukup untuk sebagian prototipe UI, tetapi bukan target integrasi panggilan. Perubahan library native atau konfigurasi native memerlukan build ulang. [R8] Izin kamera dan mikrofon diminta dalam konteks penggunaan, dengan alternatif voice ketika kamera tidak diizinkan.

---

## 10. Catatan pribadi dan bookmark saat survei virtual

### Satu user satu catatan untuk setiap kos

Setiap pasangan `user_id` dan `property_id` mempunyai maksimal satu note yang terus dapat diedit. Constraint `UNIQUE(user_id, property_id)` wajib ada. Catatan dapat dibuat, dibaca, diperbarui, dan dihapus oleh pembuatnya; owner, user lain, dan admin melalui fitur admin web tidak dapat membaca isi catatan.

Tiga pintu masuk membuka catatan yang sama: tombol Catatan pada Detail Kos, tombol Notes saat video call, dan halaman Catatan Saya. Halaman Catatan Saya menampilkan nama kos, cuplikan, waktu pembaruan, aksi edit, serta shortcut Lihat Kos. Jika listing tidak lagi publik, catatan tetap tersedia dengan label kos tidak tersedia dan tanpa membuka data listing privat.

Catatan memiliki `property_id` yang wajib. Referensi `call_id` bersifat opsional sebagai konteks terakhir dan tidak membuat catatan baru per call. Perubahan pada satu perangkat memakai `updated_at` atau versi untuk mendeteksi konflik agar tidak menimpa edit terbaru secara diam-diam.

### Notes dan picture in picture

| Mode | Tampilan | Interaksi |
|---|---|---|
| VIDEO FULL | Video utama besar dan preview kamera sendiri. | Notes membuka editor; Bookmark mengubah favorit. |
| NOTE LARGE + VIDEO PiP | Editor catatan dan keyboard, dengan video kecil tetap terlihat. | Simpan catatan, perkecil panel, atau perbesar video. |
| VIDEO FULL + NOTE MINIMIZED | Video kembali besar dan catatan diminimalkan. | Buka Notes untuk melanjutkan isi yang sama. |

PiP di sini adalah video mengambang di dalam layar aplikasi selama editor terbuka. Ukurannya dapat diperbesar kembali dengan satu tombol; PiP sistem operasi di luar aplikasi bukan syarat MVP. Pergantian mode tidak memutus channel, membuang isi editor, atau mengubah status kamera dan mikrofon.

Editor menyediakan Simpan serta indikator perubahan belum tersimpan. Ketika panel ditutup dengan perubahan, user dapat menyimpan atau membuang perubahan. Draft tetap dipertahankan selama perpindahan mode dan call berakhir. Pada layar kecil, video serta kontrol akhiri panggilan harus tetap dapat dijangkau ketika keyboard terbuka.

### Bookmark adalah aksi terpisah

Tombol Bookmark pada video call memakai data `favorites` yang sama dengan Home, Detail Kos, dan Favorit. Menekan tombol langsung menambah atau menghapus favorit, memperbarui ikon, dan menampilkan pesan kecil tanpa berpindah layar atau menghentikan panggilan.

Bookmark tidak membuat catatan, dan menulis catatan tidak otomatis menambahkan favorit. Hapus bookmark tidak menghapus note. Constraint `UNIQUE(user_id, property_id)` pada favorites mencegah duplikasi. Bila pembaruan gagal, ikon dikembalikan ke status sebelumnya dan user memperoleh aksi coba lagi.

---

## 11. Pengelolaan owner dan admin web

### Alur owner

Owner mengisi profil dan dokumen atau foto bukti uji, lalu mengajukan verifikasi. Dashboard menampilkan properti, kapasitas per kondisi, booking baru, pesan, dan ringkasan transaksi simulasi. Owner dapat menambah atau mengedit kos, koordinat, foto, peraturan, room type, pricing plan, serta jumlah inventory.

Verifikasi owner dan property disimpan terpisah dengan status DRAFT, PENDING, APPROVED, atau REJECTED. Admin memberi alasan penolakan dan owner dapat mengajukan ulang. Listing publik mensyaratkan owner approved, property approved, serta listing aktif. Booking baru juga mensyaratkan tipe dan plan aktif serta available positif. Kos penuh tetap dapat dilihat, tetapi tidak dapat dipesan. Badge menunjukkan pemeriksaan administratif demo.

Status tayang seperti ACTIVE atau SUSPENDED dipisahkan dari `verification_status`. Suspensi menghentikan penawaran dan booking baru. Booking confirmed atau active yang sudah ada tetap tercatat dan ditangani melalui alur khusus; tidak otomatis dihapus.

### Block dan restrict user

Dari chat atau profil lawan bicara, owner dapat memilih Cegah komunikasi dan atau Cegah booking baru, disertai alasan Spam, Perilaku buruk, atau Lainnya. Pembatasan berlaku pada properti milik owner tersebut, bukan seluruh platform.

Pembatasan komunikasi menghentikan pesan dan call baru. Pembatasan booking menghentikan pembuatan hold baru. Listing publik masih dapat dilihat. Riwayat transaksi tetap dapat diakses pihak terkait. Block tidak membatalkan booking confirmed atau active; jalur bantuan admin tetap tersedia untuk penyelesaian hak dan kewajiban yang sudah ada.

Pembatasan diterapkan di backend pada saat membuat chat atau call atau hold. Admin dapat meninjau alasan, menindak penyalahgunaan, dan mencabut restriction. Hold yang sudah dibuat sebelum pembatasan mengikuti alur checkout atau pembatalan khusus yang tercatat, bukan diubah diam-diam.

### Modul admin web

- Dashboard statistik dasar, Users, Owners, Properties, dan antrean Verification dengan dokumen privat serta tombol Approve atau Reject.
- Bookings, Payments, Refunds, dan simulasi Payout untuk menelusuri status, nominal, anomali pembayaran, serta permintaan pembatalan owner.
- Reports dan moderasi review atau foto, suspend listing atau akun, tinjau restriction, serta audit tindakan admin.

### Laporan dan moderasi

User dapat melaporkan kos, akun, pesan, atau ulasan; owner dapat melaporkan user. Laporan menyimpan target yang jelas, kategori, uraian, serta bukti gambar opsional. Kategori meliputi informasi palsu, alamat tidak sesuai, penipuan, spam, dan perilaku mengganggu.

Status laporan: OPEN → INVESTIGATING → RESOLVED atau REJECTED. Admin mencatat tindakan dan alasan, sementara pelapor melihat perkembangan yang sesuai. Akses bukti chat dibatasi pada laporan yang ditangani; admin web bukan sarana membaca semua percakapan. Ringkasan laporan operasional owner hanya mencakup properti miliknya.

---

## 12. Notifikasi, ulasan, dan pengaturan akun

### Peristiwa notifikasi

| Peristiwa | Penerima | Tujuan saat dibuka |
|---|---|---|
| Chat baru | Lawan bicara | Percakapan terkait. |
| Incoming call atau missed call | Penerima panggilan | Sesi aktif atau riwayat panggilan. |
| Booking confirmed atau cancelled | User dan owner | Detail booking. |
| Payment success atau failed atau expired | User; owner untuk hasil relevan | Riwayat pembayaran atau detail booking. |
| Perubahan refund | User, owner terkait, dan admin yang menangani | Detail pengembalian. |
| Hasil verifikasi owner atau property | Owner pengaju | Status verifikasi dan alasan. |
| Perubahan penting properti atau booking | User dengan booking terkait | Detail perubahan yang perlu ditindaklanjuti. |
| Pembaruan report atau restriction | Pelapor atau pihak yang relevan | Status kasus atau pemberitahuan pembatasan. |

Kotak notifikasi dalam aplikasi menyediakan daftar, waktu, status dibaca, dan tautan ke objek terkait. Notifikasi status hanya dibuat setelah transaksi database berhasil. Retry memakai identitas event agar tidak membuat duplikasi. Pengingat pembayaran, bila aktif, harus dikirim sebelum hold berakhir dan tidak memakai jadwal lama yang lebih panjang dari hold.

Push memakai FCM untuk Android dan jalur APNs yang sesuai untuk iOS. Simpan token per instalasi dan jenis aplikasi; hapus token tidak valid serta lepaskan kaitan saat logout. Pengaturan user membedakan izin OS dan preferensi aplikasi. Informasi sensitif, isi notes, dokumen verifikasi, dan rincian pembayaran lengkap tidak ditampilkan di layar kunci.

Skenario incoming call diuji saat app terbuka, di latar belakang, dan dihentikan. Tampilan panggilan yang menyerupai panggilan sistem memerlukan integrasi native khusus platform; push biasa tidak diasumsikan menjamin layar panggilan muncul. Bila panggilan tidak tersambung, missed call dan riwayat tetap diperbarui secara konsisten.

### Ulasan penyewa terverifikasi

User dapat memberikan rating 1 sampai 5 dan teks setelah booking miliknya COMPLETED, maksimal satu review per booking. Backend memvalidasi kelayakan dan menautkan review ke property melalui booking. Badge Penyewa Terverifikasi menunjukkan dasar transaksi di sistem. Foto ulasan bersifat opsional; bukti tinggal fisik tidak diklaim telah diverifikasi di luar alur demo.

Review tampil di Detail Kos setelah lolos kebijakan moderasi. Rating agregat dihitung hanya dari review yang ditayangkan. Review yang dilaporkan dapat disembunyikan admin dengan alasan dan audit; owner tidak dapat mengubah isi atau rating user.

### Profil dan pengaturan

Profil menyediakan Favorit, Catatan Saya, Booking Saya, riwayat pembayaran, notifikasi, ubah password, bantuan atau FAQ, Tentang Aplikasi, Privacy Policy, Terms, Delete Account, dan Logout. Booking Saya mengelompokkan Menunggu Pembayaran, Terkonfirmasi, Sedang Ditempati, serta Riwayat Selesai atau Dibatalkan. Alasan pembatalan dan status refund selalu terlihat pada detail.

---

## 13. Keamanan dan batas akses data

### Otorisasi pada server dan database

RLS diaktifkan pada tabel yang diekspos melalui Supabase Data API, disertai kebijakan SELECT, INSERT, UPDATE, dan DELETE yang sesuai. Identitas berasal dari sesi Auth yang tervalidasi. Perubahan role, pembayaran, inventory, atau status verifikasi tidak dipercayakan kepada data kiriman client. [R9]

| Data atau operasi | Akses minimum |
|---|---|
| Listing publik | Hanya proyeksi data listing approved dan aktif yang boleh dilihat publik. |
| Properti dan harga | Owner hanya mengelola miliknya; perubahan status sensitif melalui backend. |
| Notes dan favorites | CRUD hanya oleh `user_id` yang sama dengan `auth.uid()`. Admin web tidak diberi akses notes. |
| Chat dan metadata call | Hanya peserta percakapan; bukti laporan tersedia terbatas untuk admin yang menangani. |
| Booking | User pemesan dan owner terkait membaca data yang diperlukan. Transisi sensitif melalui backend. |
| Payment dan refund | User terkait membaca ringkasan; owner membaca ringkasan properti sendiri; penulisan oleh backend. |
| Dokumen verifikasi dan reports | Pengaju atau pelapor melihat miliknya; admin berwenang memproses. |
| Role dan audit | Penetapan role terprivileg hanya backend; audit tidak dapat diubah user biasa. |

### Kunci dan operasi sensitif

`service_role` Supabase, kunci server provider pembayaran, dan rahasia penerbitan token Agora disimpan di lingkungan backend. Kunci publik client tidak menggantikan RLS. Semua Edge Function yang menerima permintaan user memeriksa JWT, peran, kepemilikan objek, serta payload. Endpoint webhook memakai verifikasi provider, bukan sesi user mobile.

Gunakan transaksi atomik untuk hold dan inventory, validasi harga di server, idempotency pada create payment dan refund, serta audit untuk perubahan penting. Endpoint kritis diberi pembatasan laju dan proteksi dari penumpukan hold. Pencarian publik tidak membocorkan nomor HP, dokumen, atau atribut internal profil.

### Storage dan privasi

Bucket gambar chat, bukti laporan, dan dokumen verifikasi bersifat privat dengan policy akses serta URL bertenggat. Foto listing yang memang dipublikasikan boleh memakai jalur publik terpisah. Validasi isi dan MIME, ukuran, ekstensi, serta kepemilikan objek; jangan hanya percaya nama file. Metadata lokasi pada gambar dihapus sebelum publikasi bila tersedia.

Log tidak menyimpan password, token, rahasia provider, isi catatan pribadi, atau payload sensitif lengkap. Akses backend yang dapat melewati RLS dibatasi dan diaudit; fitur privat tidak berarti pengelola infrastruktur secara teknis mustahil mengakses data. Pengujian wajib memakai setidaknya dua akun user dan dua owner untuk membuktikan isolasi data.

---

## 14. Model data inti

Rancangan berikut menetapkan entitas dan constraint utama sebagai acuan ERD. Seluruh entitas menggunakan ID stabil, timestamp server, foreign key, dan index sesuai pola akses. Tidak ada tabel rooms dengan nomor kamar individual.

| Entitas | Atribut atau relasi utama | Aturan penting |
|---|---|---|
| `profiles` dan `user_roles` | Identitas Auth, nama, kontak privat, avatar; pasangan user_id dan role. | `UNIQUE(user_id, role)`; role ADMIN tidak dapat dinaikkan sendiri. |
| `owner_profiles` | user_id, data owner, verification_status. | Satu profil owner per user; bukti privat terpisah. |
| `properties` | owner_id, nama, alamat, koordinat, gender_type, rules, verification_status, publication_status. | Owner wajib valid; koordinat dalam rentang; penawaran publik melalui proyeksi aman. |
| `room_types` | property_id, nama, lantai, ukuran, bathroom_type, fasilitas, is_active. | Tipe mewakili kelompok dengan karakteristik dan harga yang sesuai. |
| `room_type_inventory` | room_type_id, total, occupied, cleaning, maintenance, inactive, version. | Angka nonnegatif; satu baris per tipe. Available dihitung bersama alokasi sistem. |
| `pricing_plans` | room_type_id, nama, unit dan nilai durasi, price, aturan DP dan deposit, is_active. | Harga IDR; durasi positif; nominal tervalidasi. |
| `bookings` | user_id, room_type_id, pricing_plan_id, quantity, status, snapshot biaya dan kebijakan, rencana masuk, waktu check-in dan checkout. | `quantity = 1` pada MVP; property dan owner diturunkan dari tipe. |
| `inventory_allocations` | booking_id, room_type_id, quantity, kind, expires_at, released_at. | Satu alokasi efektif per booking; kind HOLD atau RESERVED; transisi atomik. |
| `payments` | booking_id, order_id, provider_transaction_id, nominal, status internal dan provider, payment_method, paid_at. | `order_id` unik; beberapa attempt per booking; sukses tidak dihitung ulang. |
| `refunds` dan `payout_simulations` | payment_id atau booking_id, nominal, sumber simulasi, status, alasan, idempotency_key. | Refund kumulatif tidak melebihi uang dibayar; deposit dipisahkan dari pendapatan. |

### Hubungan dan rekonsiliasi

Property memiliki banyak tipe; tipe memiliki banyak pricing plan dan booking; booking memiliki payment attempt serta alokasi. Saat ACTIVE, alokasi RESERVED ditutup dan occupied bertambah dalam transaksi yang sama. Penyewa yang tidak memesan melalui aplikasi tetap masuk occupied dengan catatan penyesuaian owner.

Simpan `inventory_events` dan `booking_events` untuk penelusuran. Nilai calculated dapat diwujudkan sebagai query atau view; jika memakai cache, sediakan rekonsiliasi agar nilainya konsisten. Perubahan jumlah occupied yang terkait booking aktif dilakukan melalui alur booking, bukan pengurangan angka bebas yang melepaskan kapasitas masih ditempati.

---

## 15. Data komunikasi dan pendukung

| Entitas | Isi utama | Constraint dan akses |
|---|---|---|
| `property_media` dan fasilitas | Foto listing; katalog fasilitas dan relasi fasilitas properti atau tipe. | Urutan foto eksplisit; hanya owner terkait mengelola. |
| `favorites` | user_id, property_id, created_at. | `UNIQUE(user_id, property_id)`; privat per user. |
| `notes` | user_id, property_id, content, optional call_id, version, timestamps. | `UNIQUE(user_id, property_id)`; satu note yang sama di semua pintu akses. |
| `conversations` dan participants | property_id, user_id, owner_id, daftar peserta. | Satu konteks percakapan per pasangan user dan owner pada property. |
| `messages` | conversation_id, sender_id, type, text atau storage_path, client_message_id. | TEXT atau IMAGE atau CALL_EVENT; hanya peserta berwenang. |
| `calls` | conversation_id, caller_id, receiver_id, channel_id, type, waktu, durasi, status. | Channel unik per sesi; metadata saja; tidak ada recording_url. |
| `reviews` | booking_id, user_id, rating, text, moderation_status. | `UNIQUE(booking_id)`; hanya booking COMPLETED milik reviewer. |
| `user_restrictions` | owner_id, user_id, block_communication, block_booking, reason, status. | Satu aturan aktif per pasangan owner dan user; perubahan diaudit. |
| `verification_submissions` | target owner atau property, evidence_path, status, reviewer, reason. | Target wajib tunggal; bukti privat; keputusan admin tercatat. |
| `reports` | reporter_id, target type dan ID, kategori, description, evidence_path, status, handled_by. | Satu target valid; akses pelapor dan admin yang menangani. |
| `notifications` dan `device_tokens` | recipient_id, event_id, objek tujuan, read_at; token, platform, app_kind. | Deduplikasi event; token terkait instalasi, bukan seluruh akun. |
| `policy_acceptances` dan `deletion_requests` | user_id, versi kebijakan, accepted_at; status permintaan hapus, waktu, alasan tertunda. | User hanya mengakses miliknya; penghapusan auth oleh backend. |
| `audit_logs` dan `payment_events` | Aktor, tindakan, objek, waktu, perubahan status, identitas event provider. | Append-only bagi peran aplikasi; batasi konten sensitif. |

### Aturan referensi dan penghapusan

Entitas transaksi tidak dihapus berantai ketika profil dihapus. Gunakan identitas anonim yang konsisten atau foreign key nullable dengan snapshot yang diperlukan untuk riwayat. Sebaliknya, notes, favorites, token perangkat, dan foto profil dihapus melalui alur penghapusan akun.

Soft delete atau arsip listing mempertahankan referensi booking dan catatan tanpa membuka listing yang sudah tidak publik. Catatan tetap privat bagi pembuatnya selama akun aktif. Pilihan index mencakup `room_type_id`, pasangan peserta percakapan, booking pemilik, status laporan, serta timestamp untuk pagination.

---

## 16. Mockup Privacy Policy dan Terms

### Tampilan dan persetujuan

Pada registrasi, aplikasi menampilkan tautan Terms and Conditions serta Privacy Policy, dengan kotak persetujuan yang tidak dicentang otomatis. Masing-masing tautan membuka modal atau halaman yang dapat digulir. Versi kebijakan dan waktu persetujuan dicatat. Kedua dokumen juga tersedia dari Pengaturan, dengan label akademik tetap terlihat.

Teks pembuka untuk kedua dokumen:

> MOCKUP AKADEMIK. Dokumen ini dibuat untuk prototipe aplikasi pencarian kos dalam proyek kuliah. Lingkungan ini memakai data uji dan pembayaran sandbox. Dokumen ini bukan kebijakan layanan komersial.

### Isi mockup Privacy Policy

**Tujuan pemrosesan.** Aplikasi menggunakan data akun untuk autentikasi, profil untuk komunikasi, lokasi pilihan untuk pencarian kos, serta data booking dan pembayaran uji untuk menjalankan demonstrasi. Catatan pribadi digunakan hanya untuk membantu pengguna mencatat pertimbangan kos.

**Data yang diproses.** Data dapat meliputi nama, email, nomor HP, foto profil, lokasi yang dipilih atau diizinkan, chat dan gambar, catatan pribadi, favorit, metadata panggilan, booking, transaksi sandbox, laporan, dan bukti verifikasi uji. Gunakan data dummy untuk dokumen identitas selama demonstrasi.

**Akses dan layanan pendukung.** Owner menerima data yang diperlukan untuk percakapan dan booking terkait. Catatan hanya tersedia bagi pembuat melalui aplikasi. Supabase memproses penyimpanan dan autentikasi, Agora memproses media panggilan, penyedia pembayaran memproses transaksi uji, dan layanan notifikasi mengirim pemberitahuan. Audio dan video panggilan tidak direkam oleh fitur aplikasi.

**Izin perangkat.** Lokasi, kamera, mikrofon, galeri, dan notifikasi diminta sesuai kebutuhan fitur. User dapat menolak atau mencabut izin melalui pengaturan perangkat. Pencarian manual tetap tersedia ketika lokasi ditolak; fitur terkait dapat terbatas ketika izin kamera atau mikrofon ditolak.

**Kontrol data.** User dapat mengubah profil, menghapus catatan dan favorit, mengatur notifikasi, serta mengajukan hapus akun. Penghapusan dan anonimisasi mengikuti alur pada Bagian 17. Bantuan tersedia melalui menu Pusat Bantuan dalam lingkungan uji. Riwayat transaksi atau kasus yang belum selesai ditangani sebelum identitas akun dilepas.

### Isi mockup Terms and Conditions

**Penggunaan demo.** Layanan dipakai untuk pembelajaran dan pengujian terbatas. Listing serta identitas uji tidak menjadi penawaran sewa nyata. Pengguna harus menjaga kredensial, memberikan data uji yang sesuai, dan tidak menggunakan layanan untuk spam, penipuan, atau perilaku mengganggu.

**Booking dan biaya.** User memilih tipe kamar dan paket, membaca DP serta security deposit, lalu mengikuti masa berlaku hold. Konfirmasi booking bergantung pada ketersediaan dan hasil pembayaran yang diverifikasi backend. Kebijakan pembatalan sebelum aktif dan penyelesaian setelah aktif mengikuti Bagian 6.

**Pembayaran dan verifikasi.** Semua pembayaran memakai simulator sandbox, tanpa dana nyata. Badge verifikasi menunjukkan pemeriksaan administratif pada demo. Pengelola dapat meninjau laporan dan membatasi akun atau listing dengan alasan yang dicatat. Jika prototipe dikembangkan menjadi layanan publik, kebijakan operasional dan dokumen legal harus ditinjau kembali sebelum peluncuran.

---

## 17. Penghapusan akun dan konfigurasi demo

### Alur Delete Account

1. User membuka Profil → Pengaturan → Delete Account. Aplikasi menjelaskan data yang akan dihapus, riwayat yang akan dianonimkan, serta transaksi atau kasus yang perlu diselesaikan.
2. User melakukan autentikasi ulang atau konfirmasi identitas yang setara, lalu mengonfirmasi tindakan. Backend membuat `deletion_request` dengan status REQUESTED.
3. Backend memeriksa booking confirmed atau active, refund tertunda, properti aktif milik owner, dan laporan yang masih ditangani. Jika ada ketergantungan, permintaan menjadi NEEDS_RESOLUTION dengan penjelasan serta jalur bantuan admin. Satu identitas dengan peran USER dan OWNER diproses untuk kedua peran.
4. Setelah dapat diproses, backend menonaktifkan akses, mencabut sesi, melepas token perangkat, menghapus notes, favorites, foto profil, dokumen uji yang tidak lagi diperlukan, serta data profil privat. Listing owner diarsipkan.
5. Booking dan pembayaran historis yang diperlukan untuk konsistensi demo dianonimkan. Pesan milik akun dihapus isinya atau diganti placeholder, dan gambar terkait dihapus; pengecualian bukti kasus aktif dicatat hingga kasus selesai. Identitas Auth dihapus oleh backend, lalu request menjadi COMPLETED.

Kegagalan sebagian menghasilkan status FAILED_RETRYABLE dan dapat dilanjutkan tanpa menggandakan efek. User tidak langsung diperlihatkan "akun terhapus" sebelum proses backend selesai. Setelah selesai, login serta akses dengan token lama harus ditolak.

### Retensi data untuk lingkungan akademik

Data uji dipertahankan selama siklus pengujian dan penilaian. Setelah kegiatan selesai, pengelola menjalankan reset atau purge lingkungan uji; tidak ada penyimpanan identitas uji tanpa tujuan. Backup, bila digunakan, mengikuti jadwal penghapusan tersendiri yang diinformasikan kepada tester. Dokumen ini tidak menetapkan masa retensi sebagai kewajiban hukum.

### Default implementasi yang dapat dikonfigurasi

Nilai berikut adalah baseline teknis demo untuk memudahkan implementasi. Perubahannya harus konsisten antara validasi backend, tampilan aplikasi, dan pengujian; tidak mengubah keputusan arsitektur inti.

| Parameter | Default demo |
|---|---|
| Temporary hold | 15 menit berdasarkan waktu server. |
| Quantity per booking | 1 unit dari satu room type. |
| Gambar chat | JPEG, PNG, atau WebP; maksimal 5 MB setelah pemrosesan; validasi server. |
| Panjang note | 10.000 karakter; simpan eksplisit dengan indikator perubahan. |
| Timeout incoming call | 30 detik sebelum MISSED jika belum dijawab. |
| Pagination hasil kos | 20 kartu per halaman. |
| Platform fee | 0 untuk skenario dasar; skenario komisi diberi label simulasi. |

---

## 18. Tahapan implementasi dan data demonstrasi

### Urutan pengerjaan

1. Tetapkan wireframe utama, kontrak status, ERD, RLS, dan migrasi. Lakukan uji awal Agora pada dua Development Build serta webhook pembayaran untuk memastikan jalur integrasi dapat berjalan sejak awal.
2. Bangun autentikasi multi-role, profil, owner onboarding, verifikasi admin, properti, tipe kamar, inventory, dan pricing plan. Aktifkan policy keamanan sebelum data dipakai bersama.
3. Bangun pencarian lokasi, peta, Haversine, bottom sheet filter dan sorting, detail, favorites, serta satu note per property. Setelah schema stabil, buat seed yang mengikuti seluruh constraint.
4. Implementasikan transaksi hold, checkout, pembayaran sandbox, webhook, status terpisah, pembatalan, refund, serta ringkasan Model A. Uji perebutan unit terakhir sebelum memperluas skenario.
5. Integrasikan chat teks dan gambar, voice dan video call, metadata riwayat, PiP notes, bookmark saat call, serta notifikasi untuk kedua aplikasi.
6. Selesaikan restriction, reports, ulasan, Delete Account, popup kebijakan, dashboard admin, audit, dan skenario demonstrasi menyeluruh. Semua fitur wajib harus selesai sebelum penilaian akhir.

### Seed setelah schema stabil

Seed dibuat dari data fiktif yang jelas berlabel demo, bukan identitas atau dokumen orang nyata. Dataset mencakup beberapa kota dan lokasi acuan umum, owner terverifikasi dan belum terverifikasi, kos aktif dan suspended, beberapa tipe per kos, paket harga bervariasi, serta semua kondisi inventory.

Sediakan akun user berbeda, satu akun multi-role, owner tanpa properti, catatan privat, favorit, chat teks dan gambar uji, riwayat call, booking pada setiap status, review yang sah, report terbuka dan selesai, serta pembatasan komunikasi dan booking. Kondisi khusus meliputi kos penuh, unit terakhir, hold aktif, deposit nol, dan pembayaran terlambat.

Riwayat transaksi fixture diberi penanda sebagai data demo. Untuk demonstrasi integrasi, pembayaran baru harus dibuat melalui provider sandbox dan menerima webhook sungguhan; memasukkan row SUCCESS melalui seed tidak dihitung sebagai keberhasilan integrasi. Media panggilan diuji secara langsung, bukan digantikan riwayat dummy.

### Build dan deployment uji

App User dan Owner App memiliki identitas paket, konfigurasi, dan hasil build terpisah. Admin web serta Edge Functions dideploy pada lingkungan uji; webhook menggunakan endpoint HTTPS yang dapat diakses provider pembayaran. Build mobile memakai Expo Development Build selama pengembangan dan build instalasi uji untuk presentasi.

Target platform tetap Android dan iOS. Pengujian panggilan memerlukan perangkat nyata serta jaringan yang representatif; konfigurasi build, signing, dan distribusi mengikuti platform yang digunakan. Catat platform yang benar-benar diuji agar cakupan demonstrasi dapat dibuktikan.

Layanan dipilih dengan memperhatikan anggaran akademik. Pantau storage gambar, bandwidth, database, koneksi Realtime, menit peserta Agora, serta kuota build. Tidak ada klaim bahwa seluruh provider gratis tanpa batas atau bebas persyaratan akun. Angka kuota dan biaya tidak menjadi konstanta spesifikasi; periksa dashboard serta ketentuan resmi sebelum penggunaan.

---

## 19. Kriteria penerimaan fungsi inti

Setiap skenario diuji melalui antarmuka dan diperiksa pada data server. Hasil dicatat sebagai lulus atau gagal dengan bukti yang relevan. Fitur wajib tidak dianggap selesai hanya karena tampilan sudah tersedia.

| ID | Skenario | Hasil yang harus terlihat |
|---|---|---|
| AC01 | Satu akun masuk ke User App dan Owner App. | Identitas sama; fungsi berbeda sesuai aplikasi. Owner tanpa kos melihat keadaan kosong. Tidak ada switch mode pengganti dua aplikasi. |
| AC02 | Lokasi ditolak lalu user mencari kantor atau stasiun. | Pencarian manual berhasil; hasil memakai koordinat pilihan dan label jarak garis lurus. |
| AC03 | Filter fasilitas serta paket bulanan dan sorting harga. | Bottom sheet memisahkan Filter dan Urutkan; harga terurut dari plan yang cocok. Reset menghapus filter. |
| AC04 | Owner mengubah jumlah kondisi dan menurunkan total terlalu jauh. | Available terhitung; input yang melanggar kapasitas ditolak tanpa menyimpan sebagian perubahan. |
| AC05 | Dua user meminta unit terakhir bersamaan. | Tepat satu hold berhasil. Available tidak negatif dan hanya satu checkout memperoleh alokasi. |
| AC06 | User membatalkan sebelum sukses atau membiarkan hold kedaluwarsa. | Booking CANCELLED; hold dilepas sekali; tidak ada refund untuk pembayaran belum sukses. |
| AC07 | Pembayaran sandbox sukses pada hold yang berlaku. | Webhook sah menghasilkan payment SUCCESS dan booking CONFIRMED; kapasitas tetap teralokasi sebagai reserved. |
| AC08 | Webhook diulang, dipalsukan, atau datang dengan nominal salah. | Tidak terjadi pengurangan inventory ganda; payload tidak sah ditolak; anomali tercatat. |
| AC09 | Pembayaran sukses tiba setelah hold dilepas dan unit diambil user lain. | Booking lama tidak mengambil kapasitas user lain; pembayaran masuk penanganan refund atau rekonsiliasi. |
| AC10 | User membatalkan CONFIRMED sebelum ACTIVE. | Booking CANCELLED; alokasi dilepas sesuai kondisi; refund penuh atas bayar sekarang diproses dan statusnya terlihat. |
| AC11 | Owner menandai check-in lalu checkout. | Reserved berpindah ke occupied, lalu ke cleaning. Available baru bertambah setelah owner menyatakan siap. |
| AC12 | Paket sewa berakhir saat penyewa masih tinggal. | Status occupied tidak hilang otomatis dan penyewa tidak wajib memesan ulang agar kapasitasnya terlindungi. |

### Pemeriksaan biaya

Contoh Rp1.500.000 sewa, Rp500.000 DP, dan Rp500.000 security deposit harus menghasilkan bayar sekarang Rp1.000.000 serta sisa sewa Rp1.000.000. Ubah harga plan setelah hold dibuat: snapshot transaksi yang sudah berjalan tetap sama. Laporan memisahkan deposit, pendapatan simulasi, dan refund.

---

## 20. Kriteria penerimaan komunikasi dan keamanan

| ID | Skenario | Hasil yang harus terlihat |
|---|---|---|
| AC13 | Chat dimulai tanpa booking; kirim teks, gambar, lalu PDF. | Chat dan gambar berhasil untuk peserta sah; PDF ditolak. User lain tidak dapat membaca percakapan. |
| AC14 | Voice dan video call antar dua perangkat nyata. | Panggilan tersambung; kontrol media bekerja; durasi dan status akhir benar. Tidak ada rekaman tersimpan. |
| AC15 | Buka Notes ketika call berlangsung, ketik, lalu perbesar video. | Video tetap tersambung; keyboard tidak menghalangi kontrol penting; teks tetap ada saat Notes dibuka kembali. |
| AC16 | Edit note dari detail, call, dan Catatan Saya. | Ketiga akses membuka note yang sama; tidak ada duplikasi pasangan user dan property. |
| AC17 | User lain, owner, dan admin web mencoba membuka note. | Isi note tidak tersedia melalui jalur akses aplikasi atau policy terkait. |
| AC18 | Bookmark saat video call kemudian hapus favorit. | Status sinkron dengan Home, Detail, dan Favorit; call terus berjalan; isi note tidak berubah. |
| AC19 | Owner mengaktifkan restrict komunikasi dan booking. | Pesan, call, dan hold baru dibatasi sesuai pilihan; listing publik serta booking lama tetap ada. |
| AC20 | Admin approve owner saja, lalu approve property. | Badge owner dan property berbeda; listing dapat ditawarkan setelah seluruh syarat publikasi terpenuhi. |
| AC21 | Laporan ditangani dan review ditulis sebelum atau sesudah COMPLETED. | Riwayat penanganan tercatat; hanya review yang memenuhi syarat diterima; satu review per booking. |
| AC22 | Notifikasi dikirim berulang; call masuk saat latar belakang. | Event tidak menggandakan notifikasi. State call konsisten; sesi kedaluwarsa membuka riwayat, bukan call lama. |
| AC23 | User meminta hapus akun dengan transaksi terbuka lalu menyelesaikannya. | Alasan penundaan jelas; setelah diproses, data privat terhapus, riwayat dianonimkan, dan akses lama ditolak. |
| AC24 | Akses API lintas akun dan unggah file dengan MIME palsu. | RLS serta validasi backend menolak akses dan unggahan. Tidak ada kunci server dalam build mobile. |
| AC25 | Registrasi dan checkout demo. | Popup Terms dan Privacy dapat dibaca; persetujuan tidak otomatis; banner sandbox terlihat; hanya simulator pembayaran digunakan. |

### Syarat demonstrasi selesai

Sediakan kedua aplikasi mobile, admin web, lingkungan Supabase yang konsisten, akun uji sesuai peran, dan panduan skenario. Bukti minimal mencakup pencarian lokasi umum, survei virtual sambil mencatat dan bookmark, checkout webhook, perebutan unit terakhir, refund, verifikasi, report, dan penolakan akses lintas akun.

---

## 21. Referensi teknis

Referensi berikut mendukung pilihan integrasi dan batas penggunaan. Aturan produk, status internal, dan parameter demo tetap mengikuti spesifikasi ini. Dokumentasi provider diperiksa pada 22 September 2026 dan harus ditinjau kembali saat versi layanan atau SDK berubah.

*R3 sampai R6 adalah dokumentasi Midtrans dari spesifikasi asli. Karena provider yang dipakai adalah Xendit, padanannya perlu dicari di dokumentasi resmi Xendit dan ditambahkan di sini setelah diverifikasi.*

- **R1** OpenStreetMap Foundation, Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/ — Pencarian eksplisit, cache, identitas aplikasi, serta pembatasan penggunaan layanan geocoding publik.
- **R2** OpenStreetMap Foundation, Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/ — Atribusi dan batas layanan tile publik.
- **R3** Midtrans, HTTP Notification and Webhooks: https://docs.midtrans.com/docs/https-notification-webhooks — Verifikasi signature dan penerimaan status transaksi di backend.
- **R4** Midtrans, Transaction Status Cycle: https://docs.midtrans.com/docs/transaction-status-cycle — Pemetaan status provider dan kondisi transaksi.
- **R5** Midtrans, Refund Transactions: https://docs.midtrans.com/reference/refund-transaction — Endpoint refund dan ketergantungan dukungan metode transaksi.
- **R6** Midtrans, Testing Payment on Sandbox: https://docs.midtrans.com/docs/testing-payment-on-sandbox — Penggunaan simulator dan kredensial test tanpa pembayaran nyata.
- **R7** Agora, RTC Quickstart: https://docs.agora.io/en/realtime-media/rtc/get-started-sdk — Konsep channel, peserta, media RTC, dan token autentikasi.
- **R8** Expo, Introduction to Development Builds: https://docs.expo.dev/develop/development-builds/introduction/ — Development Build dan build ulang ketika dependensi native berubah.
- **R9** Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security — Pembatasan akses baris dan perlindungan tabel yang diekspos melalui API.

### Istilah teknis

Property berarti kos; room type berarti tipe kamar; inventory berarti kapasitas unit; hold berarti alokasi sementara saat checkout; reserved berarti alokasi confirmed sebelum masuk; DP berarti uang muka sewa; security deposit berarti jaminan terpisah; RLS berarti Row Level Security; PiP berarti picture in picture.

Istilah komunikasi yang benar adalah peer-to-peer. Dalam implementasi ini media panggilan dikelola melalui Agora RTC; aplikasi tidak membangun sendiri jaringan peer-to-peer atau sistem relay. Filter menyaring hasil, sedangkan sorting menentukan urutannya; keduanya diatur melalui bottom sheet.
