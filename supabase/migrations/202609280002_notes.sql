-- ============================================================
-- NOTES: catatan privat per kos (Bagian 10 spesifikasi)
-- Owner tidak pernah membaca notes user (lihat notes_select yang
-- sudah ada: hanya user_id=auth.uid()). Migrasi ini menambah hak
-- tulis milik client sendiri, tidak menyentuh akses baca siapa pun.
-- ============================================================

grant insert, update, delete on public.notes to authenticated;

create policy notes_insert on public.notes
for insert to authenticated
with check (user_id = auth.uid());

create policy notes_update on public.notes
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy notes_delete on public.notes
for delete to authenticated
using (user_id = auth.uid());

-- Versi dinaikkan oleh server, bukan oleh client, supaya nilai yang
-- dikirim client pada UPDATE ... WHERE version=:expected hanya
-- berfungsi sebagai pemeriksa konflik (optimistic concurrency),
-- bukan nilai yang bisa dipalsukan untuk melewati pemeriksaan itu.
create function private.bump_note_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger trg_notes_bump_version
before update on public.notes
for each row execute function private.bump_note_version();
