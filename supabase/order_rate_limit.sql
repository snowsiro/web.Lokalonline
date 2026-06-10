-- Schutz gegen Spam / E-Mail-Bombing über das öffentliche Bestellformular.
-- Begrenzt anonyme Inserts serverseitig — wirkt auch bei direktem API-Zugriff,
-- nicht nur über das Formular (Honeypot allein reicht dafür nicht).
-- Im Supabase SQL Editor ausführen.

-- ── orders: max. 3 Bestellungen pro E-Mail pro Stunde ────────────────
create or replace function public.limit_order_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.orders
  where email = new.email
    and created_at > now() - interval '1 hour';

  if recent_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using hint = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limit_order_rate on public.orders;
create trigger trg_limit_order_rate
  before insert on public.orders
  for each row execute function public.limit_order_rate();

-- ── inquiries: max. 3 Anfragen pro E-Mail pro Stunde ────────────────
create or replace function public.limit_inquiry_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.inquiries
  where email = new.email
    and created_at > now() - interval '1 hour';

  if recent_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using hint = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_limit_inquiry_rate on public.inquiries;
create trigger trg_limit_inquiry_rate
  before insert on public.inquiries
  for each row execute function public.limit_inquiry_rate();
