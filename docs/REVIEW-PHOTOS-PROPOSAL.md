# Foto asli pemberi ulasan — menunggu persetujuan

Foto galeri kos sudah dilepas dari preview. Foto reviewer belum diunggah oleh aplikasi saat ini. Batas usulan: maksimal 5 foto JPEG/PNG, 5 MB per foto, dinormalisasi JPEG dengan latar putih; tanpa video/WebP. Ulasan tanpa foto tetap diperbolehkan.

## Perubahan yang disiapkan

- Edge Function baru `review-image-upload`: autentikasi, booking COMPLETED milik sendiri, validasi MIME/signature/decode/ukuran, JPEG tanpa EXIF, hash hasil normalisasi, upload immutable tanpa upsert.
- Bucket privat baru `review-images`, objek `{user_id}/{booking_id}/{upload_id}.jpg`. Tidak memakai atau memindahkan gambar chat/galeri lama.
- Reservasi ID dan hash di server; retry ID sama harus cocok metadata dan objek, bukan mengabaikan konflik. Berhasil unggah tetapi gagal kirim ulasan dapat dicoba lagi dengan ID yang sama.
- Form mempertahankan pilihan foto/ID sampai kiriman berhasil, menampilkan progres dan retry. Saat pengguna mulai kirim, isi dikunci agar retry identik. Draft tidak bertahan setelah aplikasi ditutup pada tahap ini.
- Kirim ulasan + kaitkan daftar foto READY dalam satu transaksi. URL bertenggat hanya untuk penulis sendiri atau foto review APPROVED pada kos publik. Refresh URL saat kedaluwarsa.
- Preview horizontal memakai foto dari setiap ulasan, bukan galeri kos. Maksimal 3 thumbnail sebagai kolase, teks, bintang, dan tombol Lihat ulasan; daftar lengkap menampilkan semua lampiran review yang ditayangkan.

File baru: migration root, Function baru beserta core/store/test, adapter upload/read gambar ulasan, komponen foto ulasan. File lama yang perlu diubah: WriteReviewScreen, ReviewRepository/adapters, publicReviews, model PublicReview, ReviewsScreen dan PropertyReviewsPreview. Reuse validasi/codec yang sudah ada tanpa mengubah owner-upload atau jalur kirim chat. Tidak menambah dependensi mobile.

## SQL usulan — belum dibuat sebagai migrasi, belum dijalankan

Bergantung pada `202610170003_user_reviews.sql` yang masih lokal. Keduanya memerlukan izin terpisah sebelum apply DEV. Tidak mengubah policy atau fungsi lama; fungsi submit baru membungkus RPC ulasan yang lama.

```sql
create table public.review_photo_uploads (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  booking_id uuid not null references public.bookings(id),
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  ready boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.review_photo_uploads enable row level security;
grant select on public.review_photo_uploads to authenticated;
create policy review_photo_uploads_select_own on public.review_photo_uploads
for select to authenticated using (user_id = auth.uid());
grant select, insert, update on public.review_photo_uploads to service_role;

create function public.reserve_review_photo(p_id uuid,p_user uuid,p_booking uuid,p_hash text)
returns public.review_photo_uploads language plpgsql security definer set search_path='' as $$
declare result public.review_photo_uploads;
begin
  if p_id is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Metadata foto tidak valid.'; end if;
  if not exists(select 1 from public.profiles where id=p_user and status='ACTIVE') then raise exception 'Akun tidak aktif.'; end if;
  perform 1 from public.bookings where id=p_booking and user_id=p_user and status='COMPLETED' for update;
  if not found then raise exception 'Booking selesai milik sendiri diperlukan.'; end if;
  select * into result from public.review_photo_uploads where id=p_id;
  if result.id is not null then
    if result.user_id=p_user and result.booking_id=p_booking and result.sha256=p_hash then return result; end if;
    raise exception 'ID unggahan telah digunakan.';
  end if;
  if exists(select 1 from public.reviews where booking_id=p_booking) then raise exception 'Ulasan sudah dikirim.'; end if;
  if (select count(*) from public.review_photo_uploads where booking_id=p_booking)>=5 then raise exception 'Maksimal 5 foto.'; end if;
  insert into public.review_photo_uploads(id,user_id,booking_id,storage_path,sha256)
  values(p_id,p_user,p_booking,p_user::text||'/'||p_booking::text||'/'||p_id::text||'.jpg',p_hash) returning * into result;
  return result;
end;
$$;
revoke all on function public.reserve_review_photo(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_review_photo(uuid,uuid,uuid,text) to service_role;

create function public.user_submit_review_photos(p_booking_id uuid,p_rating integer,p_text text,p_photo_ids uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); result uuid; existing public.reviews;
  paths text[]; old_paths text[];
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and status='ACTIVE') then raise exception 'Sesi tidak aktif.'; end if;
  if p_photo_ids is null or cardinality(p_photo_ids)>5 or cardinality(p_photo_ids)<>(select count(distinct x) from unnest(p_photo_ids) x) then raise exception 'Daftar foto tidak valid.'; end if;
  perform 1 from public.bookings where id=p_booking_id and user_id=actor and status='COMPLETED' for update;
  if not found then raise exception 'Booking selesai milik sendiri diperlukan.'; end if;
  select coalesce(array_agg('review-images/'||storage_path order by storage_path),array[]::text[]) into paths
  from public.review_photo_uploads where id=any(p_photo_ids) and user_id=actor and booking_id=p_booking_id and ready;
  if cardinality(paths)<>cardinality(p_photo_ids) then raise exception 'Foto belum selesai diunggah.'; end if;
  select * into existing from public.reviews where booking_id=p_booking_id;
  if existing.id is not null then
    select coalesce(array_agg(storage_path order by storage_path),array[]::text[]) into old_paths from public.review_media where review_id=existing.id;
    if existing.user_id=actor and existing.rating=p_rating and existing.review_text=btrim(p_text) and old_paths=paths then return existing.id; end if;
    raise exception 'Booking ini sudah memiliki ulasan.';
  end if;
  result:=public.user_submit_review(p_booking_id,p_rating,p_text);
  insert into public.review_media(review_id,storage_path) select result,x from unnest(paths) x;
  return result;
end;
$$;
revoke all on function public.user_submit_review_photos(uuid,integer,text,uuid[]) from public,anon;
grant execute on function public.user_submit_review_photos(uuid,integer,text,uuid[]) to authenticated;

create function private.can_read_review_photo(object_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.review_photo_uploads u where u.storage_path=object_path and u.ready
    and (u.user_id=auth.uid() or exists(select 1 from public.review_media m join public.reviews r on r.id=m.review_id
      where m.storage_path='review-images/'||object_path and r.moderation_status='APPROVED' and private.is_public_property(r.property_id))));
$$;
revoke all on function private.can_read_review_photo(text) from public,anon;
grant execute on function private.can_read_review_photo(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('review-images','review-images',false,5242880,array['image/jpeg']);
create policy review_images_select on storage.objects for select to authenticated
using(bucket_id='review-images' and private.can_read_review_photo(name));
```

## Batas dan risiko

- Tidak ada izin upload langsung dari mobile; service-role hanya di Function.
- Reservasi maksimal 5 ID per booking. Setelah unggahan dimulai, mengganti foto dengan ID baru dapat menghabiskan slot; UI harus mengunci set foto saat mulai unggah dan menyediakan retry ID lama. Pembatalan/pembersihan objek yatim otomatis tidak termasuk tahap ini, tidak ada objek yang dihapus.
- Foto yang gagal diunggah tidak disertakan dalam review. Metadata ready baru ditandai server setelah objek berhasil diverifikasi. Penandaan gagal dapat dipulihkan dengan retry.
- Foto pending tidak ditampilkan ke pengguna lain. URL yang sudah diterbitkan tetap berlaku sampai TTL habis; moderasi tersembunyi menghentikan penerbitan URL berikutnya.
- Admin Web masih belum punya moderasi ulasan/foto, sehingga publikasi ulasan baru masih memerlukan pengerjaan admin terpisah.
- Tanpa akses DEV belum bisa memastikan bucket bernama sama tidak pernah dibuat manual. Preflight sebelum apply wajib berhenti jika konfigurasi yang ditemukan berbeda; jangan menimpa bucket/policy.

Uji lokal sebelum meminta izin deploy: MIME palsu/PDF/ukuran/decode; retry dan konflik hash; partial upload; batas 5; RPC atomik; peserta/akun lain; foto pending vs approved; URL expiry; UI tanpa foto. Setelah itu minta izin apply/deploy DEV, lalu uji upload aktual dan tampilan kolase pada perangkat.
