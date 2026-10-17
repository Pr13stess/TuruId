# Ulasan, laporan kos, dan bagikan — usulan 17 Oktober 2026

Pembaruan: pengguna meminta melanjutkan **rating/ulasan saja**. Formulir User dan migrasi lokal `202610170003_user_reviews.sql` sekarang dibuat dari bagian user_submit_review di bawah; belum diterapkan ke DEV. Laporan kos tetap berupa usulan dan belum dibuat. Status terbaru ada di `docs/USER-SUBMIT-REVIEW.md`; bagian berikut merekam proposal awal.

## Bagian yang sudah dibuat lokal

- Bagikan kos menggunakan share sheet perangkat: nama, alamat, dan tautan lokasi OpenStreetMap jika koordinat valid. Tidak mengarang URL website/deep link kos yang belum dikonfigurasi.
- Lihat ulasan di detail kos: hanya APPROVED, rating bintang vektor, isi ulasan, tanggal, paginasi dan refresh. Tidak mengambil nama/profil privat reviewer.
- Belum diuji di perangkat/DEV. Mock tidak mengarang isi review dari angka rating fixture.

Validasi lokal: npm test 104/104, tes Owner 40/40, typecheck User lulus, lint kedua aplikasi tanpa error (tiga warning lama RegisterScreen). Typecheck Owner sebelumnya memiliki error disabled/aligned yang tidak disentuh pekerjaan ini.

## Persetujuan yang diperlukan

Kirim rating/ulasan dan laporan kos belum diimplementasikan. Rekomendasi tahap pertama: rating 1–5 + teks untuk booking COMPLETED milik sendiri, satu per booking, status PENDING; laporan kos dengan kategori + uraian, status OPEN. Foto opsional ulasan/bukti laporan ditunda karena memerlukan jalur upload tervalidasi dan akses storage khusus.

Admin Web saat ini baru verifikasi owner/properti. Tanpa fitur moderasi ulasan/penanganan laporan, review PENDING tidak akan ditayangkan dan laporan OPEN belum dapat diselesaikan lewat UI admin. Jangan menyetujui ulasan otomatis atau mengaku laporan sudah diproses.

SQL di bawah **hanya usulan, belum dibuat sebagai migrasi atau diterapkan**. Setelah disetujui, buat file baru di root supabase/migrations. Tidak mengubah tabel, policy lama, booking, payment, inventory, atau RPC Owner. Backend menurunkan property_id review dari booking, tidak mempercayai ID kos kiriman client. Retry dengan isi sama mengembalikan ID lama; isi berbeda ditolak.

```sql
create function public.user_submit_review(p_booking_id uuid, p_rating integer, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  booking public.bookings;
  existing public.reviews;
  property uuid;
  result uuid;
  body text := btrim(p_text);
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and status='ACTIVE') then
    raise exception 'Sesi tidak aktif.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 or body is null or length(body) not between 5 and 2000 then
    raise exception 'Rating 1–5 dan ulasan 5–2000 karakter wajib diisi.';
  end if;
  select * into booking from public.bookings where id=p_booking_id and user_id=actor for update;
  if booking.id is null or booking.status <> 'COMPLETED' then
    raise exception 'Ulasan hanya untuk booking selesai milik sendiri.';
  end if;
  select * into existing from public.reviews where booking_id=p_booking_id;
  if existing.id is not null then
    if existing.user_id=actor and existing.rating=p_rating and existing.review_text=body then
      return existing.id;
    end if;
    raise exception 'Booking ini sudah memiliki ulasan.';
  end if;
  select property_id into property from public.room_types where id=booking.room_type_id;
  insert into public.reviews(booking_id,user_id,property_id,rating,review_text,moderation_status)
  values(p_booking_id,actor,property,p_rating,body,'PENDING') returning id into result;
  return result;
end;
$$;
revoke all on function public.user_submit_review(uuid,integer,text) from public,anon;
grant execute on function public.user_submit_review(uuid,integer,text) to authenticated;

create function public.user_report_property(p_request_id uuid, p_property_id uuid,
  p_category public.report_category, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  existing public.reports;
  body text := btrim(p_description);
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and status='ACTIVE') then
    raise exception 'Sesi tidak aktif.';
  end if;
  if p_request_id is null or p_property_id is null or p_category is null
     or body is null or length(body) not between 5 and 2000 then
    raise exception 'Kategori dan uraian 5–2000 karakter wajib diisi.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into existing from public.reports where id=p_request_id;
  if existing.id is not null then
    if existing.reporter_id=actor and existing.target_type='PROPERTY'
      and existing.target_id=p_property_id and existing.category=p_category and existing.description=body then
      return existing.id;
    end if;
    raise exception 'ID pengiriman tidak valid. Mulai laporan baru.';
  end if;
  if not private.is_public_property(p_property_id) then
    raise exception 'Kos tidak tersedia untuk dilaporkan dari halaman publik.';
  end if;
  insert into public.reports(id,reporter_id,target_type,target_id,category,description,status)
  values(p_request_id,actor,'PROPERTY',p_property_id,p_category,body,'OPEN');
  return p_request_id;
end;
$$;
revoke all on function public.user_report_property(uuid,uuid,public.report_category,text) from public,anon;
grant execute on function public.user_report_property(uuid,uuid,public.report_category,text) to authenticated;
```

## Rencana sesudah persetujuan

1. Uji SQL di PGlite: salah akun, belum COMPLETED, rating/teks invalid, duplikat/retry, property tersembunyi, ID laporan milik akun lain, dan moderasi tidak dapat dipilih client.
2. Tambahkan formulir ulasan dari booking selesai dan formulir Laporkan dari detail kos. Pertahankan ID laporan sampai berhasil; tunjukkan status menunggu moderasi dan daftar laporan milik sendiri agar perkembangan bisa dilihat.
3. Tes kedua aplikasi; commit lokal. Penerapan DEV dan pengujian perangkat memerlukan izin terpisah.

Risiko: dua RPC baru memberi kemampuan menulis terkontrol; review/rating tidak naik sebelum APPROVED. Tidak ada penghapusan data dan tidak ada perubahan alur bayar/check-in/checkout. Rollback perubahan backend setelah apply memerlukan persetujuan baru.
