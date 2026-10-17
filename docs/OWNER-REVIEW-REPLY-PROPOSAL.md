# Usulan balasan ulasan Owner

Status: proposal SQL saja; belum dibuat sebagai migrasi, dijalankan, atau diterapkan ke DEV.

## Perilaku

- Satu balasan 1–2000 karakter per ulasan APPROVED, hanya oleh pemilik kos aktif berperan OWNER.
- Balasan ditampilkan di bawah ulasan sebagai “Balasan pemilik”. Belum ada edit/hapus atau notifikasi balasan.
- Retry dengan isi identik berhasil tanpa menulis ulang; isi berbeda setelah balasan tersimpan ditolak. Form mempertahankan isi saat respons tidak pasti dan menyediakan muat ulang.
- Balasan mengikuti visibilitas ulasan induk melalui RLS yang sudah ada. Tidak membuka ulasan PENDING/HIDDEN ke publik.
- Tidak mengubah rating, teks penyewa, status moderasi, booking, pembayaran, atau policy lama.

## SQL yang dimintakan persetujuan

Letakkan sebagai file migrasi baru di `supabase/migrations` (sumber kebenaran menurut addendum SPEC), bukan jalur owner-app. Nama timestamp final diperiksa saat implementasi.

```sql
alter table public.reviews
  add column owner_reply text,
  add column owner_reply_at timestamptz,
  add constraint review_owner_reply_valid check (
    (owner_reply is null and owner_reply_at is null)
    or (owner_reply is not null and owner_reply_at is not null
        and length(btrim(owner_reply)) between 1 and 2000)
  );

create function public.owner_reply_review(p_review_id uuid, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  item public.reviews;
  body text := btrim(p_text);
begin
  if actor is null or not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = actor and p.status = 'ACTIVE' and ur.role = 'OWNER'
  ) then
    raise exception 'Akun owner aktif diperlukan.';
  end if;
  if body is null or length(body) not between 1 and 2000 then
    raise exception 'Balasan harus berisi 1–2000 karakter.';
  end if;
  select * into item from public.reviews where id = p_review_id for update;
  if item.id is null then
    raise exception 'Ulasan tidak tersedia.';
  end if;
  perform 1 from public.properties
    where id = item.property_id and owner_id = actor and deleted_at is null
    for share;
  if not found or item.moderation_status <> 'APPROVED' then
    raise exception 'Ulasan tidak tersedia untuk dibalas.';
  end if;
  if item.owner_reply is not null then
    if item.owner_reply = body then return item.id; end if;
    raise exception 'Ulasan ini sudah dibalas. Muat ulang untuk melihat balasan.';
  end if;
  update public.reviews
    set owner_reply = body, owner_reply_at = now()
    where id = item.id;
  return item.id;
end;
$$;
revoke all on function public.owner_reply_review(uuid,text) from public,anon;
grant execute on function public.owner_reply_review(uuid,text) to authenticated;
```

Penambahan kolom nullable mempertahankan semua ulasan lama. Trigger updated_at lama tetap berjalan. Tidak ada policy/grant tulis tabel baru; aplikasi menulis lewat RPC saja. Sebelum apply DEV, periksa grant UPDATE aktual pada reviews; jika grant luas ditemukan, berhenti dan minta keputusan, jangan mengubah policy/grant lama tanpa izin.

## Area implementasi setelah disetujui

- Baru: komponen form balasan Owner, helper validasi dan adapter RPC, tes retry/otorisasi, migrasi aditif di root.
- Lama Owner: domain Review, PropertyEditor untuk memasang form. Pembacaan owner_read sudah menggunakan to_jsonb(review), sehingga tidak perlu mengubah RPC lama.
- Lama User: PublicReview dan publicReviews.ts untuk membaca kolom balasan, preview ulasan dan halaman daftar ulasan untuk menampilkannya.
- Repositori demo Owner perlu menyimpan balasan dan menghormati aturan satu balasan; bukan bukti DEV.
- Sebelum backend aktif, reader User harus tetap dapat membaca ulasan pada schema lama (fallback khusus error kolom belum ada, bukan menutupi error jaringan/izin). RPC belum aktif harus ditampilkan sebagai error jelas, bukan sukses palsu.

## Pengujian dan rilis

Tes lokal: validasi Unicode/teks kosong/panjang; owner kos lain, akun nonaktif, non-owner, ulasan belum APPROVED ditolak; retry identik tidak mengubah timestamp; balasan berbeda ditolak; ulasan lama tanpa balasan tetap terbaca; balasan tidak terlihat jika ulasan disembunyikan. Jalankan suite kedua aplikasi, typecheck, lint.

Penerapan DEV fhapolumdqqewwhxnjcb dan pengujian perangkat perlu izin terpisah. Ulasan harus sudah APPROVED untuk demo; jangan mengubah moderasi secara manual demi mengisi demo. Rollback frontend dengan git revert; setelah backend diterapkan, biarkan kolom/RPC aditif dan data balasan tetap ada, tanpa DROP atau penghapusan.
