-- Additive: only own favorites can be inserted/deleted. Existing SELECT policy stays intact.
grant insert, delete on public.favorites to authenticated;

create policy favorites_insert_own
on public.favorites for insert to authenticated
with check (
  user_id = auth.uid()
  and private.is_public_property(property_id)
);

create policy favorites_delete_own
on public.favorites for delete to authenticated
using (user_id = auth.uid());
