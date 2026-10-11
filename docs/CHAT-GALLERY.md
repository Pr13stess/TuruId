# Multi-foto dan viewer chat

Implementasi untuk User App dan Owner App. Tidak ada perubahan/deploy backend, SQL, policy, dependensi, maupun alur kirim teks.

## Perilaku

- Galeri menerima maksimal 10 foto per pilihan. JPEG/PNG dan validasi upload yang sudah ada tetap digunakan.
- User memilih beberapa foto, kemudian batch langsung dikirim. Owner mendapat preview semua pilihan, lalu menekan Kirim. Caption Owner dikirim bersama foto pertama saja.
- Tiap foto mempunyai client_message_id sendiri. Upload berurutan untuk membatasi beban, dengan indikator jumlah foto yang berhasil.
- Kegagalan satu foto tidak membatalkan foto lain. Retry hanya mengulang foto gagal, dengan ID yang sama. Foto sukses tidak dikirim ulang. Batal lampiran membuang sisa draft, bukan menghapus pesan yang sudah terkirim.
- Tap foto pada pesan membuka modal fullscreen dari foto yang diketuk. Galeri berisi semua pesan gambar yang sudah dimuat dalam percakapan, dengan snapshot saat dibuka agar pesan realtime tidak menggeser posisi foto.
- Swipe kiri/kanan berpindah gambar, dengan indikator posisi seperti 2/5 dan tombol alternatif sebelumnya/berikutnya.
- Pinch memperbesar hingga 4×; gambar yang diperbesar bisa digeser. Zoom direset saat berganti foto atau orientasi layar berubah.
- Tombol Tutup, tombol Back Android, atau swipe ke bawah menutup viewer. Swipe halaman/tutup hanya aktif saat tidak diperbesar agar tidak bentrok dengan pan gambar.
- Viewer memakai resolver dan pembaruan signed URL yang sama dengan gambar chat, termasuk ketiga format path lama.

## File

| File/area | Perubahan |
|---|---|
| Kedua aplikasi: `src/domain/chatGallery.ts` (baru) | Batch retry, snapshot galeri, indeks awal, batas gesture |
| Kedua aplikasi: `src/presentation/components/ChatImageViewer.tsx` (baru) | Modal fullscreen dan gesture native PanResponder/Animated |
| Kedua aplikasi: `src/presentation/components/ChatImage.tsx` | Ukuran fleksibel dan contain untuk fullscreen; teks loading terlihat di latar gelap |
| User: `src/presentation/screens/chat/ChatScreen.tsx` | Picker multi-foto, progress/retry batch dan tap gambar |
| Owner: `src/presentation/chatMedia.ts` | Pemilihan dan kompresi beberapa foto |
| Owner: `src/presentation/screens/ChatScreens.tsx` | Draft batch, caption foto pertama, progress dan retry |
| Owner: `src/presentation/components/ChatConversation.tsx` | Preview beberapa foto dan pembukaan viewer |
| `tests/chatGallery.test.mjs`, Owner `tests/chatGallery.test.mjs` (baru) | Retry sebagian, double press, serial upload, batas pilihan, isi/urutan galeri, swipe dan batas zoom |

Diff lengkap enam file lama ada di [CHAT-GALLERY-DIFF.patch](CHAT-GALLERY-DIFF.patch), dibandingkan dengan commit `f3cc8ce`.

## Verifikasi

- `npm.cmd test`: 59/59 lulus, termasuk unit Function yang sudah ada.
- `npm.cmd test --workspace=kosku-owner`: 32/32 lulus.
- `npm.cmd run typecheck --workspace=@kosku/user-app` dan `--workspace=kosku-owner`: lulus.
- `npm.cmd run lint --workspace=@kosku/user-app` dan `--workspace=kosku-owner`: lulus, tiga warning registrasi User lama tetap ada.
- Expo export Android kedua aplikasi dengan `EXPO_OFFLINE=1`, `CI=1`, `--platform android --no-bytecode`: lulus. Hasil ada di `.expo/gallery-user` dan `.expo/gallery-owner`, tidak dipublikasikan.
- Tidak mengakses backend DEV dalam tugas ini. Hasil di atas bukan bukti uji end-to-end atau gesture sentuh perangkat fisik.

## Uji manual Expo Android

1. Reload kedua aplikasi. Pilih tiga foto dari galeri dan kirim. Pastikan progress mencapai 3/3, ketiganya tampil dan teks tetap bisa dikirim.
2. Tap foto kedua: viewer mulai dari foto itu dan indikator sesuai posisinya dalam seluruh galeri percakapan.
3. Swipe kiri/kanan, uji foto pertama/terakhir, lalu pinch zoom dan pan. Kembalikan zoom sebelum swipe turun untuk menutup. Uji juga tombol Tutup dan Back Android.
4. Putus koneksi saat sebagian foto terkirim, pulihkan lalu retry. Foto sukses tidak boleh berulang; foto gagal memakai ID yang sama.
5. Buka gambar lama serta biarkan viewer terbuka melewati waktu signed URL untuk menguji pembaruan URL di perangkat.

Draft masih berada di memori layar, belum bertahan jika aplikasi ditutup. Jalur rollback Owner `EXPO_PUBLIC_CHAT_IMAGE_UPLOAD=legacy` mempertahankan picker lama satu foto; mode normal memakai multi-foto. Tidak ada pengelompokan baru di database: satu foto tetap satu pesan.

Rollback kode dapat memakai `git revert` commit fitur ini; tidak membutuhkan rollback database atau penghapusan objek.
