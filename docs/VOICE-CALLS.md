# Panggilan suara User–Owner

Implementasi lokal 19 Oktober 2026. Belum terbukti berjalan di Supabase DEV atau dua perangkat nyata. Tidak ada deploy, akses backend, migrasi, perubahan RLS, atau push pada pekerjaan ini.

Pembaruan setelah laporan perangkat: error `react-native-agora doesn't seem to be linked` berarti modul native tidak tersedia pada binary yang dipasang. Kedua aplikasi sekarang mengecek `TurboModuleRegistry.get('AgoraRtcNg')` sebelum mengimpor SDK, agar Expo Go/build lama memperoleh petunjuk build ulang. Delapan tes voice terarah dan typecheck/lint kedua aplikasi lulus; pengaman ini belum diuji pada perangkat yang melaporkan error. Reload JavaScript tidak menggantikan build/install ulang binary native. Samsung pop-up view belum diverifikasi; perubahan AppState ke background tetap mengakhiri panggilan sesuai batas tahap ini.

## Cakupan

Pembaruan UI: layar panggilan User dan Owner memakai susunan kontak terpusat, avatar inisial besar, status, dan panel kontrol bulat di bawah, terinspirasi susunan panggilan WhatsApp. Warna tetap TuruId (navy User, oranye Owner). Tombol terima hijau, tolak/akhiri merah, mikrofon dan speaker memakai ikon vektor dengan penanda aktif. Identitas ditampilkan dari percakapan yang sudah dapat diakses, dengan fallback bila gagal dimuat. UI tidak mengklaim enkripsi atau audio berjalan di Expo Go. Typecheck/lint kedua aplikasi dan 8 tes voice lulus; belum ditinjau pada perangkat nyata.

- User dapat memulai panggilan suara dari detail kos dan header chat. Owner dari header chat.
- Kedua aplikasi menampilkan banner panggilan suara masuk saat terbuka, dengan polling sekitar 3 detik. Buka banner untuk menerima atau menolak.
- Layar panggilan menyediakan batal/akhiri, mikrofon, speaker/earpiece, status, dan pesan gagal.
- Token diterbitkan oleh Function `agora-token` yang sudah ada, lalu diperbarui sebelum kedaluwarsa atau saat SDK meminta token baru. Certificate tidak masuk aplikasi.
- Audio dilepas ketika layar ditutup, panggilan berakhir, atau aplikasi masuk background. Tahap ini **tidak mendukung panggilan di background/aplikasi tertutup**, push panggilan, ringtone native, atau video.
- Mode mock User menolak panggilan dengan penjelasan; tidak berpura-pura mengirim audio. Simulasi Owner lama masih diberi label demo.
- Layar Owner mempertahankan pemutar saat refresh data, menghentikan heartbeat setelah audio gagal, dan mengabaikan respons renewal token setelah pemutar dilepas.

## File dan kontrak

User baru: `domain/repositories/CallRepository.ts`, `domain/voiceSession.ts`, `data/supabase/SupabaseCallRepository.ts`, `data/mock/UnavailableCallRepository.ts`, komponen `VoiceMedia*`, `IncomingVoiceCall`, hooks `useVoiceCalls`, `useStartVoiceCall`, dan `screens/VoiceCallScreen`.

User lama: RepositoryProvider, RootNavigator/types, tombol suara ChatScreen dan PropertyDetailScreen, package.json, app.json. Dependensi yang disetujui: react-native-agora 4.6.4, expo-audio 57.0.5, expo-dev-client 57.0.19; root lockfile ikut berubah.

Owner lama: App.tsx (banner/poll foreground), CallScreen (lifecycle/status), CallMedia.native (renewal/cleanup/rute audio), ChatScreens (start guard dan video ditunda). Tidak ada perubahan pengiriman pesan teks/gambar, booking, pembayaran, atau auth.

Backend yang dipakai tanpa perubahan:

- `owner_read(section: 'calls')`: nama historis; implementasi memeriksa akun ACTIVE dan peserta percakapan, tidak mewajibkan role OWNER. Seksi calls juga menjalankan expiry. Tes lokal memakai akun dengan role USER saja.
- `communication_start(cid, kind: 'VOICE')`.
- `communication_call(call_id, action)` untuk accept/decline/end/fail/ping.
- `agora-token` menerima call_id, memeriksa peserta dan CONNECTED, lalu menerbitkan UID 1 untuk caller / 2 untuk receiver.
- Implementasi lama RPC dan Function ditemukan di `apps/owner-app/supabase/`. Keberadaannya di DEV belum diperiksa pada pekerjaan ini. Tidak menggabungkan jalur migrasi. Jika ada gap schema DEV, usulkan SQL aditif baru di root untuk persetujuan terpisah.

## Validasi lokal

| Pemeriksaan | Hasil |
|---|---|
| `npm.cmd test` | 121 lulus |
| `npm.cmd test --workspace=kosku-owner` | 56 lulus |
| Typecheck kedua workspace | Lulus |
| Lint kedua workspace | Tanpa error; User memiliki 3 warning lama RegisterScreen |
| `expo export --platform android` per aplikasi, output folder TEMP | User 1333 modul, Owner 1347 modul, lulus |

Tes baru `tests/voiceCall.test.mjs` menguji audio-only, izin ditolak, pencegahan engine ganda, mute/speaker, cleanup, token terlambat, renewal, error, kontrak RPC, dan kegagalan mock/backend. `apps/owner-app/tests/voiceCallDatabase.test.mjs` memakai PGlite di memori dengan SQL lama: USER→Owner, Owner→USER, peserta ketiga ditolak, hanya penerima boleh accept, busy, decline/cancel, missed timeout, dan end idempotent.

Ini bukan hasil build APK/native, bukan uji mikrofon/speaker perangkat, dan bukan bukti keberhasilan token Agora DEV. Ukuran tambahan APK belum diukur.

## Langkah DEV berikutnya — perlu izin

1. Pastikan kedua konfigurasi aplikasi menunjuk DEV `fhapolumdqqewwhxnjcb`, jangan cetak key.
2. Dengan izin baca backend, periksa RPC yang diperlukan, Function `agora-token`, serta keberadaan secret AGORA_APP_ID/AGORA_APP_CERTIFICATE (nama saja). Certificate disimpan hanya di backend; jangan kirim ke chat atau EXPO_PUBLIC.
3. Bila Function belum tersedia, ajukan deploy DEV terpisah. Bila RPC belum tersedia/berbeda, tampilkan SQL baru dan dampaknya untuk persetujuan terlebih dahulu.
4. Buat development build kedua aplikasi dan pasang di dua HP. Expo Go dan browser tidak cukup untuk menguji audio. Belum menjalankan build native pada tahap lokal ini.
5. Login dengan akun User dan Owner terpisah, buka kedua aplikasi. User telepon dari chat; Owner menerima. Ulangi arah sebaliknya. Uji suara dua arah, mute, speaker/earpiece, tolak, batal, back, dan abaikan hingga timeout.
6. Telepon lebih dari 5 menit untuk memverifikasi renewal. Uji putus internet, izin mikrofon ditolak, background, serta masuk ulang. Pastikan tidak ada mikrofon tersisa setelah selesai dan panggilan berikutnya bisa dimulai.
7. Dengan akun ketiga, uji akses data dan permintaan token untuk call milik peserta lain ditolak. Catat waktu, perangkat, dan hasil sebenarnya.

## Rollback

Revert commit Owner `d8a5f46`, lalu User `c910912`, lalu dependensi `c0a0221` bila diperlukan. Tidak ada perubahan backend untuk di-rollback. Setelah rollback native dependencies, buat ulang development build jika ingin artefak binary sesuai konfigurasi lama. Jangan menghapus atau memodifikasi riwayat panggilan.

Diff lengkap dapat ditinjau dengan `git show c0a0221`, `git show c910912`, dan `git show d8a5f46`. Semua commit lokal; belum dipush.
