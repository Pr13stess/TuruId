# Push Android: persiapan DEV (20 Oktober 2026)

## Hasil audit read-only

Target: `fhapolumdqqewwhxnjcb.supabase.co`, sama dengan kedua APK.

- `owner-maintenance` aktif, versi 2. Keberadaan fungsi tidak membuktikan worker dipanggil.
- `device_tokens`: 0 baris; `owner_push_deliveries`: 0 baris.
- Profil dengan `push_enabled`: 0.
- Tidak ada ekstensi `pg_cron` / `pg_net` dan tidak ada `cron.job`.
  Scheduler eksternal belum dibuktikan ada/tidaknya.
- EAS User (`com.kosku.demo.user`) dan Owner (`com.kosku.demo.owner`):
  **FCM V1 None assigned yet**. Signing keystore tersedia, berbeda dari FCM.
- Kedua app config belum memiliki `googleServicesFile`.
- RPC `owner_profile('device')` selalu menulis `OWNER_APP`; tidak boleh dipakai
  oleh User App untuk registrasi karena akan mencampur identitas aplikasi.
- Queue lama memproses semua token aktif milik penerima, tetapi belum menyaring
  panggilan yang kedaluwarsa atau memisahkan routing berdasarkan app kind.
- Worker lokal dirancang dipanggil tiap menit, sedangkan ringing berakhir
  setelah 45 detik. Polling per menit tidak cocok untuk panggilan masuk.
- Notifikasi Owner yang diketuk hanya membuka daftar Notifikasi; cold start
  belum ditangani. User belum memiliki jalur respons push.

Konektor Supabase menolak akses, kemudian audit berhasil melalui Supabase CLI
yang sudah login. Tidak ada SQL mutasi, deploy, kirim push, atau perubahan
kredensial cloud dilakukan.

## Persiapan lokal yang selesai

- User: `expo-notifications@57.0.21` dan `expo-device@57.0.2`, plugin notifications.
- Owner: EAS project ID dibaca dari config APK terlebih dahulu, lalu fallback
  env lama. Sebelumnya hanya membaca env yang belum dikonfigurasi.
- Registrasi User, token refresh/revocation, cold start routing, filter panggilan
  usang, dispatch cepat, dan uji perangkat **belum selesai**.

## Firebase yang diperlukan

1. Buat satu proyek Firebase untuk Turu.Id, lalu daftarkan dua aplikasi Android:
   `com.kosku.demo.user` dan `com.kosku.demo.owner`. Jangan mengganti package ID.
2. Unduh `google-services.json` untuk masing-masing aplikasi dan simpan terpisah
   pada folder aplikasinya. Konfigurasikan `android.googleServicesFile` setelah
   file tersedia. File ini adalah konfigurasi client, bukan private key server.
3. Buat FCM V1 service-account key dan unggah langsung melalui EAS credentials
   untuk kedua proyek. Jangan memasukkan private key tersebut ke app, Git, atau chat.
4. Build ulang APK sesudah konfigurasi client dan kode push selesai.

Panduan: https://docs.expo.dev/push-notifications/fcm-credentials/

## SQL aditif yang diajukan — BELUM DITERAPKAN

Usul lokasi migrasi setelah persetujuan: `supabase/migrations` di root.
Tidak mengedit migrasi lama atau policy. RPC baru khusus User App memakai tabel
token lama dan mengikuti isolasi instalasi yang sudah ada. Pengguna anonim dan
profil tidak aktif ditolak. Logout mencabut token instalasi itu saja; tidak
mematikan push perangkat lain. `register` hanya dipanggil setelah izin OS
disetujui dan pengguna memilih mengaktifkan push.

```sql
create function public.user_push_device(
  action text,
  installation uuid,
  push_token text default null,
  device_os public.device_platform default 'ANDROID'
) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id = actor and p.status = 'ACTIVE'
  ) then raise exception 'Akun aktif diperlukan.'; end if;
  if installation is null then raise exception 'Instalasi diperlukan.'; end if;
  if action = 'register' then
    if device_os not in ('ANDROID', 'IOS') or device_os is null
       or push_token is null or length(push_token) > 255
       or push_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$'
    then raise exception 'Token perangkat tidak valid.'; end if;
    insert into public.device_tokens(user_id, token, platform, app_kind, installation_id)
    values(actor, push_token, device_os, 'USER_APP', installation)
    on conflict(installation_id, app_kind) do update
      set user_id = excluded.user_id, token = excluded.token,
          platform = excluded.platform, last_seen_at = now(), revoked_at = null;
    update public.profiles set push_enabled = true where id = actor;
  elsif action = 'revoke' then
    update public.device_tokens set revoked_at = now()
    where user_id = actor and installation_id = installation and app_kind = 'USER_APP';
  else raise exception 'Aksi tidak valid.';
  end if;
end;
$$;
revoke all on function public.user_push_device(text,uuid,text,public.device_platform)
  from public, anon;
grant execute on function public.user_push_device(text,uuid,text,public.device_platform)
  to authenticated;
```

SQL ini belum diuji/dijalankan. Sebelum apply, uji PGlite untuk anonymous,
profil suspended, register retry, pergantian akun/perangkat, token rotation,
konflik unique token, dan revoke tanpa mempengaruhi instalasi lain.
Dispatch cepat/penjadwalan akan diajukan terpisah setelah mekanisme worker
disiapkan. Jangan mengaktifkan worker lama apa adanya untuk panggilan masuk.

## Uji DEV yang masih diperlukan

- Pesan kedua arah saat aplikasi background, ditutup biasa, dan layar terkunci.
- Ketuk pesan membuka percakapan yang benar setelah cold start/login.
- Telepon saat receiver tertutup: notifikasi segera, tap membuka panggilan
  yang masih RINGING; notifikasi usang tidak memunculkan penerimaan palsu.
- Logout dan ganti akun tidak menerima push akun sebelumnya; token per instalasi.
- Retry worker tidak menggandakan delivery; receipt dan DeviceNotRegistered.
- Android force-stop melalui Pengaturan adalah batas OS, bukan kondisi yang
  dapat dijamin menerima push. Full-screen incoming call dan audio background
  belum termasuk tahap notifikasi biasa ini.

Rollback persiapan lokal: revert commit persiapan push; tidak ada perubahan
database atau kredensial cloud untuk di-rollback pada tahap ini.
