> Pembaruan 12 Oktober 2026: SQL verifikasi telah disetujui, diuji lokal, dan diterapkan ke DEV fhapolumdqqewwhxnjcb. [Hasil dan batas pengujian](ADMIN-VERIFICATION-DEV.md). Keterangan belum diterapkan di bawah adalah catatan tahap awal.

# Proposal SQL Admin Verifikasi — belum disetujui / belum dijalankan

Target setelah disetujui: **file baru** `supabase/migrations/202610120001_admin_verification.sql`. Root dipakai sesuai Catatan keputusan SPEC. Dokumen ini bukan migrasi aktif. Tidak mengubah migrasi lama, RLS/Storage policy, role akun, atau Function upload.

Dampak: dua RPC baru untuk admin aktif. Membaca antrean OWNER/PROPERTY terpisah; keputusan mengunci target dan pengajuan, memeriksa versi data, hanya menerima pengajuan terbaru yang menunggu, lalu memperbarui target yang sesuai + pengajuan + audit dalam satu transaksi. Status publikasi tidak disentuh. Retry keputusan yang sama tidak menggandakan audit; keputusan berbeda atas pengajuan selesai ditolak. Alasan tolak minimal 5 karakter. Queue 20 item/halaman.

Policy baca bukti privat admin sudah terdapat di `apps/owner-app/supabase/migrations/202610020003_storage_permissions.sql`; tetap dipakai, tanpa policy baru. Trigger `owner_verification_notice` yang sudah ada dapat menghasilkan notifikasi ketika status pengajuan berubah. Proposal tidak menambahkan/mengubah notifikasi atau push; efek trigger lama ini perlu diverifikasi di DEV.

```sql
begin;

create function public.admin_verification_queue(
  kind text, filter_status text default 'PENDING', page_number integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Akses admin aktif diperlukan.' using errcode = '42501';
  end if;
  if kind is null or kind not in ('OWNER','PROPERTY') or
     filter_status is null or filter_status not in ('PENDING','APPROVED','REJECTED') or
     page_number is null or page_number < 0 or page_number > 100000 then
    raise exception 'Filter pengajuan tidak valid.' using errcode = '22023';
  end if;
  with candidates as (
    select v.id, v.target_type, v.status, v.evidence_path,
      v.submitted_at, v.reviewed_at, v.review_reason,
      coalesce(v.description,p.description,'') as description,
      case when v.target_type = 'OWNER'
        then coalesce(o.display_name,u.full_name,'Pemilik kos') else p.name end as name,
      coalesce(u.full_name,'Pemilik kos') as owner_name,
      coalesce(p.address,'') as address, coalesce(p.city,'') as city,
      case when v.target_type = 'OWNER' then o.updated_at else p.updated_at end as target_updated_at,
      case when v.target_type = 'OWNER' then o.verification_status else p.verification_status end as current_status,
      coalesce(o.verification_status,po.verification_status)::text as owner_status,
      p.publication_status,
      not exists (
        select 1 from public.verification_submissions newer
        where newer.target_type = v.target_type
          and (newer.owner_profile_id = v.owner_profile_id or newer.property_id = v.property_id)
          and (newer.submitted_at,newer.id) > (v.submitted_at,v.id)
      ) as is_latest
    from public.verification_submissions v
    left join public.owner_profiles o on o.id = v.owner_profile_id
    left join public.properties p on p.id = v.property_id
    left join public.owner_profiles po on po.user_id = p.owner_id
    left join public.profiles u on u.id = coalesce(o.user_id,p.owner_id)
    where v.target_type::text = kind and v.status::text = filter_status
      and u.status = 'ACTIVE'
      and ((v.target_type = 'OWNER' and o.id is not null) or
           (v.target_type = 'PROPERTY' and p.deleted_at is null and p.id is not null))
  ), page as (
    select * from candidates order by submitted_at desc,id desc
    limit 20 offset page_number * 20
  )
  select jsonb_build_object(
    'total',(select count(*) from candidates),
    'items',coalesce((select jsonb_agg(to_jsonb(page) order by submitted_at desc,id desc) from page),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_verification_queue(text,text,integer) from public,anon;
grant execute on function public.admin_verification_queue(text,text,integer) to authenticated;

create function public.admin_review_verification(
  submission_id uuid, decision text, reason text, expected_updated_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.verification_submissions;
  o public.owner_profiles;
  p public.properties;
  target_id uuid;
  target_version timestamptz;
  target_status public.verification_status;
  owner_user uuid;
  clean_reason text := trim(coalesce(reason,''));
begin
  if not private.is_admin() then
    raise exception 'Akses admin aktif diperlukan.' using errcode = '42501';
  end if;
  if decision is null or decision not in ('APPROVED','REJECTED') or
     length(clean_reason) > 2000 or (decision = 'REJECTED' and length(clean_reason) < 5) then
    raise exception 'Keputusan atau alasan tidak valid.' using errcode = '22023';
  end if;
  select * into v from public.verification_submissions where id = submission_id;
  if not found then raise exception 'Pengajuan tidak ditemukan.' using errcode = '40001'; end if;

  -- Same lock order as owner submission: target first, then submission.
  if v.target_type = 'OWNER' then
    select * into o from public.owner_profiles where id = v.owner_profile_id for update;
    if not found then raise exception 'Owner tidak ditemukan.' using errcode = '40001'; end if;
    target_id := o.id; target_version := o.updated_at;
    target_status := o.verification_status; owner_user := o.user_id;
  else
    select * into p from public.properties where id = v.property_id and deleted_at is null for update;
    if not found then raise exception 'Kos tidak ditemukan.' using errcode = '40001'; end if;
    target_id := p.id; target_version := p.updated_at;
    target_status := p.verification_status; owner_user := p.owner_id;
  end if;
  select * into v from public.verification_submissions where id = submission_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan.' using errcode = '40001'; end if;
  if not exists(select 1 from public.profiles where id = owner_user and status = 'ACTIVE') then
    raise exception 'Akun pemilik tidak aktif.' using errcode = '40001';
  end if;
  if v.status::text = decision and coalesce(v.review_reason,'') = clean_reason then
    return v.id; -- Retry after a lost response: no repeat mutation, audit, or trigger.
  end if;
  if v.status <> 'PENDING' or target_status <> 'PENDING' or
     expected_updated_at is null or target_version is distinct from expected_updated_at or
     exists (
       select 1 from public.verification_submissions newer
       where newer.target_type = v.target_type
         and (newer.owner_profile_id = v.owner_profile_id or newer.property_id = v.property_id)
         and (newer.submitted_at,newer.id) > (v.submitted_at,v.id)
     ) then
    raise exception 'Data berubah atau pengajuan sudah diproses. Muat ulang.' using errcode = '40001';
  end if;
  if v.target_type = 'OWNER' then
    update public.owner_profiles set verification_status = decision::public.verification_status,
      verified_at = case when decision = 'APPROVED' then now() else null end
    where id = target_id;
  else
    update public.properties set verification_status = decision::public.verification_status
    where id = target_id;
  end if;
  update public.verification_submissions
    set status = decision::public.verification_status, reviewed_by = auth.uid(),
        review_reason = nullif(clean_reason,''), reviewed_at = now()
    where id = submission_id;
  insert into public.audit_logs(actor_id,action,target_type,target_id,metadata)
    values(auth.uid(),'ADMIN_VERIFICATION_' || decision,v.target_type::text,target_id,
      jsonb_build_object('submission_id',v.id,'before_status',target_status,'reason',clean_reason));
  return v.id;
end;
$$;
revoke all on function public.admin_review_verification(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.admin_review_verification(uuid,text,text,timestamptz) to authenticated;

commit;
```

Sebelum apply: konfirmasi env DEV `fhapolumdqqewwhxnjcb`, periksa schema/trigger/policy aktual secara read-only, uji SQL secara lokal setelah izin. Wajib uji admin/non-admin, approve owner tidak mengubah kos, approve kos tidak mengubah publication_status, alasan tolak, retry, data berubah, dua admin bersamaan, rollback jika audit gagal, dan pembacaan bukti lintas akun. **SQL ini belum dibuktikan berjalan.** Jika SQL perlu diubah setelah review/test, tampilkan perubahan sebelum apply.

Tidak membuat akun admin, menetapkan role ADMIN, atau mengubah data DEV pada tahap ini. Akun admin harus sudah diberikan oleh pengelola; jangan menaruh service-role di browser. Persetujuan SQL ini terpisah dari SQL video yang juga masih tertunda.
