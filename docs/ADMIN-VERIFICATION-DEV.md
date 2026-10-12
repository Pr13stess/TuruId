# Verifikasi admin: penerapan DEV, 12 Oktober 2026

Pengguna menyetujui pengujian dan penerapan proposal SQL. Target dikonfirmasi dari `.env` ketiga aplikasi dan linked ref: **fhapolumdqqewwhxnjcb**. Tidak mengakses production, tidak push, tidak membuat akun atau mengubah role.

## Yang diterapkan

- Migrasi root baru `supabase/migrations/202610120001_admin_verification.sql`, identik dengan blok SQL proposal yang disetujui (dibandingkan sebelum apply).
- Dua fungsi baru: `admin_verification_queue` dan `admin_review_verification`. Tidak mengubah migrasi lama, policy, trigger, Storage, atau kode aplikasi.
- Diterapkan secara terarah melalui `supabase.cmd db query --linked --project-ref fhapolumdqqewwhxnjcb --file supabase/migrations/202610120001_admin_verification.sql --output json`. Tidak memakai `db push` yang dapat membawa migrasi lain.
- Riwayat hanya versi ini dicatat melalui `supabase.cmd migration repair 202610120001 --status applied --linked --project-ref fhapolumdqqewwhxnjcb`. Pencatatan diverifikasi melalui query read-only.
- Root tetap sumber kebenaran. Jalur migrasi Owner tidak digabung. Proposal SQL video tetap belum diterapkan.

## Bukti dan batas pengujian

| Pemeriksaan | Hasil | Lingkungan |
|---|---|---|
| RPC sebelum apply | Keduanya belum ada | DEV, read-only |
| Schema, guard, trigger bukti | Kolom cocok; bucket owner-media privat; policy baca bukti admin dan trigger notifikasi lama tersedia | DEV, read-only |
| RPC setelah apply | Keduanya SECURITY DEFINER, search_path kosong; anon tidak punya EXECUTE | DEV |
| Antrean admin | OWNER PENDING = 1, PROPERTY PENDING = 1 | DEV, authenticated role + session claim melalui SQL, bukan login browser |
| Non-admin | Kedua fungsi menolak dengan SQLSTATE 42501 | DEV, transaksi READ ONLY, `supabase/tests/admin_verification_dev_readonly.sql` |
| PostgREST anonim | Kedua endpoint HTTP 401, code 42501, bukan RPC hilang | DEV, public key tanpa sesi login |
| `npm.cmd test --workspace=@turuid/admin-web` | 15/15 lulus | SDK mock + PGlite lokal |
| `npm.cmd test` | 73/73 lulus | Lokal |
| `npm.cmd test --workspace=kosku-owner` | 38/38 lulus | Lokal |
| `npm.cmd run typecheck --workspace=<workspace>` | Ketiga aplikasi lulus | Lokal |
| `npm.cmd run lint --workspace=<workspace>` | Ketiga aplikasi tanpa error, 3 warning lama RegisterScreen User | Lokal |

Workspace: `@kosku/user-app`, `kosku-owner`, `@turuid/admin-web`.

Tes SQL baru memuat migrasi root aktual + migrasi Owner lama ke database in-memory (bukan konsolidasi riwayat). Menguji guard admin/non-admin/inaktif/anon, isolasi bukti melalui policy Storage dengan tabel Storage fixture, approve owner terpisah dari kos, approve kos tanpa mengubah publikasi, alasan tolak, stale version, pengajuan lama, retry tanpa audit/notifikasi ganda, serta rollback seluruh keputusan jika audit gagal. Fixture awal diperbaiki untuk path, helper Storage, ID seed yang bentrok, dan pembatasan simulasi kegagalan audit; tidak ada tes/aturan yang dilemahkan atau dilewati. SQL proposal tidak perlu diubah.

**Belum terbukti di DEV:** login browser dengan password admin, gambar bukti melalui signed URL, keputusan approve/reject dari UI sampai Owner, refresh hasil di Owner, retry keputusan nyata, dan dua koneksi admin yang benar-benar bersamaan. Tes dua identitas admin lokal berjalan berurutan; bukan bukti concurrent locking. Tidak mengambil keputusan atas pengajuan nyata untuk pengujian. Ada dua akun ADMIN aktif pada preflight; tidak mencetak email atau membuat akun baru.

## Uji manual berikutnya

1. Jalankan `npm.cmd run start --workspace=@turuid/admin-web`, buka alamat port 8083, login admin.
2. Buka tab Owner/Kos dan pengajuan menunggu. Pastikan bukti muncul sebelum tombol keputusan aktif.
3. Gunakan pengajuan uji yang memang boleh diputuskan. Approve owner, lalu cek status kos tetap terpisah di Owner App.
4. Approve kos dan cek status publikasi tidak berubah. Uji pengajuan lain untuk penolakan dengan alasan, lalu lihat alasan di Owner App.
5. Uji sesi non-admin; uji dua browser admin pada pengajuan uji yang sama, keputusan kedua yang berbeda harus ditolak setelah keputusan pertama.

## Rollback

Revert commit lokal untuk mengembalikan kode/test/dokumentasi. **Git revert tidak membatalkan SQL yang sudah diterapkan.** Jika ada masalah, hentikan penggunaan fitur admin; jangan DROP/reset, menghapus audit, atau membalik keputusan secara massal. Perbaikan backend berikutnya harus lewat proposal migrasi baru yang disetujui. Kedua RPC boleh tetap tidak digunakan tanpa mengubah alur User/Owner.
