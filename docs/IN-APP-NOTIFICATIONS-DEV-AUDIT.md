# Audit notifikasi dalam aplikasi — 17 Oktober 2026

## Terverifikasi read-only di DEV

Project linked dan target query eksplisit: `fhapolumdqqewwhxnjcb`.

- `notifications` memiliki RLS aktif, grant SELECT untuk authenticated, dan policy `recipient_id = auth.uid()`.
- `owner_profile(action = 'read')` tersedia dan dapat dieksekusi role authenticated. Definisi fungsi memeriksa profil ACTIVE dan hanya memperbarui baris dengan recipient_id akun pemanggil; tidak mensyaratkan role OWNER untuk aksi read.
- Ada 51 notifikasi: 18 PAYMENT, 16 BOOKING, 10 CHAT, 4 PROPERTY, 2 OWNER, 1 CALL. Ini jumlah agregat, bukan pengujian pengiriman baru.
- Trigger notifikasi booking/pembayaran tersedia.
- Pada messages, trigger yang tersedia hanya memperbarui waktu conversation. Fungsi communication_send membuat notifikasi CHAT sesudah insert pesan, tetapi tidak ada trigger notifikasi umum.

Tidak ada deploy, perubahan schema/policy, insert pesan uji, atau perubahan read_at pada audit ini. Keberadaan fungsi/policy belum membuktikan UI di perangkat atau isolasi melalui login akun uji.

## Gap yang ditemukan

Owner memakai communication_send yang membuat event `message:{message_id}`. User memakai insert langsung ke messages untuk teks/gambar, sehingga jalur tersebut tidak membuat notifikasi untuk Owner. Daftar notifikasi User membaca event yang sudah tersedia; implementasi daftar saja tidak memperbaiki arah User ke Owner.

## SQL disetujui untuk migrasi dan pengujian lokal — BELUM DITERAPKAN KE DEV

Persetujuan pengguna diterima untuk membuat dan menguji lokal. SQL berikut disalin tanpa perubahan ke `supabase/migrations/202610170002_chat_notifications.sql`. Root tetap sumber kebenaran migrasi. Tidak menggabungkan jalur Owner, tidak mengubah policy lama, tidak mengubah communication_send, dan tidak menambahkan pengiriman push. Event baru tetap dapat diproses oleh worker push yang sudah ada jika worker tersebut aktif; status worker tidak diverifikasi pada tahap ini.

```sql
create function private.notify_chat_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.message_type not in ('TEXT', 'IMAGE') then
    return new;
  end if;

  select case when new.sender_id = c.user_id then c.owner_id
              when new.sender_id = c.owner_id then c.user_id end
  into recipient
  from public.conversations c
  where c.id = new.conversation_id;

  if recipient is null or recipient = new.sender_id then
    return new;
  end if;
  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = new.conversation_id and user_id = recipient
  ) then
    return new;
  end if;

  insert into public.notifications
    (recipient_id, event_key, type, title, body, target_type, target_id)
  values
    (recipient, 'message:' || new.id, 'CHAT', 'Pesan baru',
     'Buka percakapan untuk membaca pesan.', 'CHAT', new.conversation_id)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.notify_chat_message_insert()
from public, anon, authenticated;

create trigger notify_chat_message_insert
after insert on public.messages
for each row execute function private.notify_chat_message_insert();
```

## Dampak dan pengujian sebelum penerapan

- Pesan baru User dan Owner menghasilkan notifikasi dalam transaksi insert yang sama. Pesan lama tidak di-backfill.
- Event key sama dengan communication_send; unique index event_key/recipient yang sudah ada menahan duplikasi ketika RPC mencoba membuat notifikasi kedua.
- Tidak mengubah isi pesan, ID retry, path gambar, booking, pembayaran, atau akses chat.
- Jika trigger mengalami error, insert pesan ikut gagal. Karena itu uji lokal wajib mencakup insert teks/gambar langsung, RPC Owner, retry, penerima nonpeserta, CALL_EVENT, dan deduplikasi sebelum izin apply DEV.
- Satu gambar adalah satu pesan; kirim beberapa gambar menghasilkan beberapa notifikasi, belum dikelompokkan per kolase.
- Rollback DB memerlukan persetujuan baru; jangan menghapus trigger/function sendiri. Revert UI saja tidak membatalkan migrasi yang sudah diterapkan.

## Uji perangkat yang masih diperlukan

Dengan akun uji yang sudah login: buka notifikasi User, buka event booking/chat, pastikan read_at berubah hanya untuk penerimanya; akun lain tidak dapat membaca atau menandai event itu. Setelah SQL disetujui dan diterapkan, uji kedua arah kirim teks/gambar dan retry. Audit ini tidak menggunakan password atau membuat sesi akun uji.

Panggilan, push, dan dependensi native ditunda sesuai keputusan terakhir pengguna.

## Pengujian migrasi lokal

`tests/chat-notifications.test.mjs` menjalankan migrasi root, seed, serta tiga migrasi Owner yang sudah ada dalam PGlite sementara untuk menguji kompatibilitas. Ini fixture pengujian, bukan konsolidasi jalur migrasi dan tidak mengakses DEV.

Cakupan: tidak melakukan backfill; teks/gambar User melalui insert langsung; teks/gambar Owner melalui RPC asli; retry tidak menduplikasi event; akun ketiga ditolak saat mengirim/membaca dan tidak dapat mengubah read_at akun lain; User tanpa role OWNER dapat menandai notifikasi sendiri; CALL_EVENT dan penerima nonpeserta tidak menghasilkan notifikasi chat; rollback membatalkan pesan dan event bersama; fungsi trigger tidak dapat dipanggil langsung oleh client.

Percobaan tes awal gagal karena fixture PGlite belum menyediakan helper storage.foldername dan kolom storage.objects.owner. Fixture dilengkapi; migrasi produksi dan assertion tidak dilemahkan.

Hasil regresi: `npm test` lulus 99/99; `npm run test --workspace=kosku-owner` lulus 40/40; typecheck User lulus. Masalah typecheck Owner yang sebelumnya tercatat pada prop disabled/aligned belum diperbaiki karena tidak ada kode Owner yang diubah dalam tugas ini.

Lint kedua aplikasi lulus tanpa error; User masih memiliki tiga warning lama di RegisterScreen. Isi file migrasi diverifikasi identik dengan blok SQL yang disetujui.

Sebelum penerapan DEV: minta izin terpisah untuk migrasi ini saja. Verifikasi project ref dan status migrasi yang aktif, lalu terapkan hanya file baru ini; jangan menerapkan migrasi Favorit atau migrasi lain yang masih menunggu tanpa izin. Uji perangkat dan pengiriman nyata dua arah masih belum terbukti.
