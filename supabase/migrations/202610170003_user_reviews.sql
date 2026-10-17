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

