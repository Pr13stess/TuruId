# Kolase chat

Foto berurutan dari pengirim yang sama ditampilkan sebagai satu kolase di User dan Owner. Pengelompokan hanya tampilan: maksimal 10 foto, pada hari lokal yang sama, dalam 120 detik sejak foto pertama. Pesan teks, pergantian pengirim, foto tanpa lokasi, atau waktu di luar rentang memisahkan kolase. Tanpa album ID di database, dua kiriman berdekatan bisa tergabung dan retry terlambat bisa terpisah.

Grid menampilkan sampai empat thumbnail; sisanya ditandai +N. Tap membuka foto yang dipilih. Viewer yang sudah ada mendukung swipe kiri/kanan dalam kolase, indikator posisi, pinch zoom, tombol tutup, dan swipe turun saat tidak zoom. Foto asli dan mekanisme upload/retry/resolver tidak berubah. Tidak ada backend, SQL, policy, maupun dependensi baru.

File baru: chatCollage.ts dan ChatImageCollage.tsx di setiap aplikasi, tests/chatCollage.test.mjs. File lama: User ChatScreen.tsx dan Owner ChatConversation.tsx. Diff terdapat di CHAT-COLLAGE-DIFF.patch.

Validasi lokal: npm test (63 tes), npm test --workspace=kosku-owner (32 tes), typecheck dan lint kedua workspace. Lint User memiliki tiga warning lama di RegisterScreen.tsx. Tes mencakup pemisahan kolase, duplikasi realtime, batas jumlah/waktu, posisi foto awal, dan keputusan gesture. Belum dibuktikan di perangkat Android atau Supabase DEV.

Uji manual: kirim 2, 3, dan 6 foto; periksa grid kedua aplikasi; tap thumbnail kedua lalu swipe dua arah dan cek indikator; buka +N untuk menjangkau foto sisanya; zoom dan pan lalu perkecil sebelum swipe turun; kirim teks di antara foto untuk memastikan pemisahan. Muat ulang chat untuk memastikan pengelompokan tetap sama. Coba upload lambat/retry: foto yang melewati jendela dua menit menjadi kolase terpisah.

Rollback: git revert commit kolase. Tidak perlu perubahan data atau backend. Commit lokal saja, tanpa push.
