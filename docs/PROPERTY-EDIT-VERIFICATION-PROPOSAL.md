# Usulan: simpan edit kos dan ajukan verifikasi secara atomik

19 Oktober 2026. SQL di bawah belum dijalankan atau dibuat sebagai migrasi aktif. Fokus hanya pengeditan kos berikutnya. Tidak memperbaiki data dua kos tersangkut secara massal, tidak menyetujui verifikasi otomatis, tidak mengubah kebijakan edit yang memerlukan verifikasi ulang.

## Perilaku

- Editor memanggil satu RPC baru. Simpan kos dan pengajuan PENDING berhasil bersama atau seluruh perubahan dibatalkan.
- Bukti yang diberikan lewat formulir digunakan jika ada; jika tidak, gunakan bukti terbaru milik owner untuk kos yang sama dan valid menurut validasi lama. Bila tidak ada bukti valid, gagal sebelum menyimpan dan arahkan pengguna mengunggah bukti.
- Satu ID percobaan disimpan oleh client bersama payload sampai hasil pasti. Retry dengan ID dan payload sama tidak mengulang penyimpanan atau membuat pengajuan baru. Ini bagian dari operasi simpan yang sama, bukan pemulihan massal.
- Fungsi/policy lama tetap ada. Client baru tidak boleh fallback ke dua panggilan terpisah jika RPC belum aktif.

## SQL untuk persetujuan

Migrasi baru kelak ditempatkan di `supabase/migrations`, sumber kebenaran menurut SPEC. Tabel internal baru menyimpan kunci retry; tidak ada akses langsung mobile.

```sql
create table private.property_edit_attempts (
  owner_id uuid not null references public.profiles(id),
  request_id uuid not null,
  payload jsonb not null,
  evidence text,
  result_id uuid references public.properties(id),
  created_at timestamptz not null default now(),
  primary key (owner_id, request_id)
);
alter table private.property_edit_attempts enable row level security;
revoke all on private.property_edit_attempts from public, anon, authenticated;

create function public.owner_edit_property_and_submit(
  input jsonb, request_id uuid, evidence text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.owner_actor();
  pid uuid := nullif(input->>'id','')::uuid;
  proof text := nullif(btrim(evidence),'');
  attempt private.property_edit_attempts;
  result uuid;
begin
  if pid is null or request_id is null then
    raise exception 'ID kos dan ID percobaan wajib diisi.';
  end if;
  perform private.owner_property(pid);
  insert into private.property_edit_attempts(owner_id,request_id,payload,evidence)
    values(actor,request_id,input,proof)
    on conflict on constraint property_edit_attempts_pkey do nothing;
  select * into attempt from private.property_edit_attempts a
    where a.owner_id=actor and a.request_id=owner_edit_property_and_submit.request_id
    for update;
  if attempt.payload is distinct from input or attempt.evidence is distinct from proof then
    raise exception 'Isi percobaan berubah. Periksa hasil sebelumnya sebelum mencoba lagi.';
  end if;
  if attempt.result_id is not null then return attempt.result_id; end if;

  perform 1 from public.properties where id=pid for update;
  perform private.owner_property(pid);
  if proof is null then
    select v.evidence_path into proof from public.verification_submissions v
      where v.target_type='PROPERTY' and v.property_id=pid
        and v.submitted_by=actor
        and private.valid_owner_media(v.evidence_path,'verification',null)
      order by v.submitted_at desc,v.id desc limit 1;
  end if;
  if proof is null or not private.valid_owner_media(proof,'verification',null) then
    raise exception 'Unggah bukti verifikasi sebelum menyimpan perubahan kos.';
  end if;

  if input ? 'video_path' then
    if to_regprocedure('public.owner_save_property_gallery(jsonb)') is null then
      raise exception 'Penyimpanan galeri video belum aktif di server. Perubahan belum disimpan.';
    end if;
    execute 'select public.owner_save_property_gallery($1)' into result using input;
  else
    result := public.owner_save_property(input);
  end if;
  perform public.owner_verify_property(result,proof);
  update private.property_edit_attempts a set result_id=result
    where a.owner_id=actor and a.request_id=owner_edit_property_and_submit.request_id;
  return result;
end;
$$;
revoke all on function public.owner_edit_property_and_submit(jsonb,uuid,text) from public,anon;
grant execute on function public.owner_edit_property_and_submit(jsonb,uuid,text) to authenticated;
```

## Dampak dan batasan

RPC membungkus fungsi simpan/verifikasi yang sudah ada. Penggantian metadata foto oleh fungsi lama tetap berlangsung, tetapi objek Storage tidak dipindah/dihapus/ditimpa. Bila pengajuan gagal, penyimpanan metadata, status, audit dan catatan retry ikut rollback. Pengajuan lama tetap menjadi riwayat; pengajuan baru menjadi yang terbaru untuk Admin. Tidak mengubah policy lama, booking, pembayaran atau inventory.

Pemeriksaan DEV sebelumnya menemukan owner_save_property dan owner_verify_property tersedia, tetapi owner_save_property_gallery tidak ditemukan. Usulan ini tidak memasang fitur video; payload video ditolak secara jelas tanpa menyimpan sebagian. Jangan membuang video_path diam-diam demi membuat request lolos.

Perubahan client: method repository edit-and-submit, adapter RPC baru, pengiriman dari PropertyEditor dan cabang edit PropertyFormScreen, mock yang setara, serta tes. Jalur tambah kos baru tidak diubah. Tampilkan sukses hanya setelah RPC selesai; saat respons tidak pasti, pertahankan ID/payload untuk retry.

Tes lokal setelah persetujuan: sukses simpan + satu pengajuan; kegagalan bukti/pengajuan me-rollback edit; retry identik tanpa duplikat; ID sama payload berbeda ditolak; owner lain ditolak; approval Admin tetap manual; error layanan video belum aktif tidak menyimpan sebagian. Jalankan suite, typecheck dan lint Owner/User. Deploy DEV membutuhkan izin terpisah.

Rollback: revert perubahan client; tabel/fungsi aditif yang sudah diterapkan tetap dibiarkan. Jangan menghapus pengajuan atau memakai DROP. Client lama masih memiliki perilaku lama karena fungsi lamanya sengaja tidak diganti.

Referensi: https://supabase.com/docs/guides/database/functions (fungsi database, search_path dan pembatasan EXECUTE).
