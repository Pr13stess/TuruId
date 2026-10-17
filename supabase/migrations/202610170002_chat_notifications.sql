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
