# Penyelarasan alur sensitif — tahap 6

Tanggal: 11 Oktober 2026 (Asia/Jakarta).

## Perubahan

- `src/presentation/screens/BookingScreens.tsx`: detail booking memakai
  `Page aligned`, nama penyewa mendapat ruang fleksibel, nominal dan riwayat
  dapat membungkus ke baris berikutnya, teks pendukung diperbesar. Catatan
  pembatalan kosong tidak lagi menghasilkan text node kosong di dalam View.
- `src/presentation/screens/ChatScreens.tsx`: daftar chat, percakapan, dan
  pembatasan pengguna memakai tampilan aligned. Bubble pesan mengikuti
  `apps/user-app/src/presentation/screens/chat/ChatScreen.tsx`: navy untuk
  pengirim, putih untuk penerima, teks kontras, border dan radius token.
  Tombol dapat membungkus pada layar kecil; daftar memiliki label aksesibilitas.
  Lampiran dan ID pembatasan kosong menggunakan kondisi boolean eksplisit.
- `src/presentation/screens/CallScreen.tsx`: halaman dan teks pendukung aligned.
- `src/presentation/components/CallMedia.native.tsx`: radius media mengikuti
  token kartu dan baris kontrol dapat membungkus.

## Mekanisme yang dipertahankan

Transisi check-in/checkout, permintaan pembatalan, refresh, polling, dan disabled
ketika aksi berlangsung tetap menggunakan implementasi sebelumnya. Permintaan
pembatalan tetap tidak langsung membatalkan booking.

Chat tetap menyimpan draft dan client ID saat gagal, lalu membuat client ID baru
setelah berhasil. Pemilihan gambar, upload, pembatasan, dan repository tidak
diubah. Pemeriksaan izin kamera/mikrofon Android/iOS, token Agora, heartbeat,
mute mikrofon, speaker/earpiece, kamera, pergantian kamera, dan pelepasan engine
tetap utuh; perubahan komponen media hanya pada style.

## Verifikasi

- Typecheck dan lint Owner App: lolos.
- Tes Owner App: 15/15 lolos, termasuk transaksi booking, otorisasi, deduplikasi
  pesan, pembatasan komunikasi, penerimaan panggilan, dan expiry.
- Browser demo: catatan wajib booking ditolak bila kosong; permintaan
  pembatalan tidak mengubah CONFIRMED; check-in menjadi ACTIVE, checkout menjadi
  COMPLETED dan menambah alokasi cleaning.
- Dari detail booking dapat membuka chat. Simulasi koneksi terputus setelah
  pesan tersimpan mempertahankan draft dan client ID; retry menghasilkan hanya
  satu pesan tersimpan dan membersihkan draft setelah sukses.
- Panggilan video demo: terima, ubah switch mikrofon/kamera, akhiri. Panggilan
  suara: tolak; kembali saat berdering mengakhiri panggilan menjadi CANCELLED.
- Pembatasan komunikasi tersimpan dan menolak pengiriman berikutnya.
- Pemeriksaan DOM/layout pada lebar 320 dan 390 px tidak menemukan overflow
  horizontal halaman. Tidak ada exception browser yang tidak tertangani.
- Tidak membuat PNG. Data demo browser dipulihkan setelah pengujian.

## Batas pengujian dan tindak lanjut

Kontrol media yang diuji di browser adalah simulasi. Izin perangkat yang ditolak
atau diterima, audio/video Agora sebenarnya, speaker, pergantian kamera, serta
perubahan jaringan di perangkat memerlukan development build Android/iOS.
Bagian tersebut diperiksa melalui source, belum diverifikasi pada perangkat.

Pengujian lintas User App/Owner App pada backend uji merupakan tahap 7 dan belum
dijalankan. Masalah integrasi lama tetap perlu dicatat terpisah dari perubahan UI.
Notifikasi sukses pembatasan dapat hilang saat form dimuat ulang setelah simpan;
status tersimpan dan penolakan pesan sudah diperiksa langsung dalam pengujian.
