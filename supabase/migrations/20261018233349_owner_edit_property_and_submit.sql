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
