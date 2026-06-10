-- ── lokalonline RLS Policies ──────────────────────────────────────────
-- Run in Supabase SQL Editor
-- Admin email: info@lokalonline.at

-- ── ORDERS ────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

drop policy if exists "admin_all_orders" on public.orders;
create policy "admin_all_orders" on public.orders
  for all to authenticated
  using (auth.email() = 'info@lokalonline.at')
  with check (auth.email() = 'info@lokalonline.at');

-- Customers can read their own order by email
drop policy if exists "client_read_own_order" on public.orders;
create policy "client_read_own_order" on public.orders
  for select to authenticated
  using (email = auth.email());

-- Anonymous users can insert (order form, no login required)
drop policy if exists "anon_insert_orders" on public.orders;
create policy "anon_insert_orders" on public.orders
  for insert to anon
  with check (true);

-- ── MESSAGES ──────────────────────────────────────────────────────────
alter table public.messages enable row level security;

drop policy if exists "admin_all_messages" on public.messages;
create policy "admin_all_messages" on public.messages
  for all to authenticated
  using (auth.email() = 'info@lokalonline.at')
  with check (auth.email() = 'info@lokalonline.at');

-- Customers can read/insert messages for their own orders only
drop policy if exists "client_read_own_messages" on public.messages;
create policy "client_read_own_messages" on public.messages
  for select to authenticated
  using (
    order_id in (
      select id from public.orders where email = auth.email()
    )
  );

drop policy if exists "client_insert_own_messages" on public.messages;
create policy "client_insert_own_messages" on public.messages
  for insert to authenticated
  with check (
    sender_type = 'client'
    and order_id in (
      select id from public.orders where email = auth.email()
    )
  );

drop policy if exists "client_update_own_messages" on public.messages;
create policy "client_update_own_messages" on public.messages
  for update to authenticated
  using (
    order_id in (
      select id from public.orders where email = auth.email()
    )
  );

-- ── CLIENTS ───────────────────────────────────────────────────────────
-- Drop old loose policy (all authenticated users)
drop policy if exists "auth_all_clients" on public.clients;

drop policy if exists "admin_all_clients" on public.clients;
create policy "admin_all_clients" on public.clients
  for all to authenticated
  using (auth.email() = 'info@lokalonline.at')
  with check (auth.email() = 'info@lokalonline.at');

drop policy if exists "client_read_own" on public.clients;
create policy "client_read_own" on public.clients
  for select to authenticated
  using (email = auth.email());

-- ── INQUIRIES ─────────────────────────────────────────────────────────
drop policy if exists "auth_all_inquiries" on public.inquiries;

drop policy if exists "admin_all_inquiries" on public.inquiries;
create policy "admin_all_inquiries" on public.inquiries
  for all to authenticated
  using (auth.email() = 'info@lokalonline.at')
  with check (auth.email() = 'info@lokalonline.at');

-- Public insert still allowed (contact form)
drop policy if exists "public_insert_inquiries" on public.inquiries;
create policy "public_insert_inquiries" on public.inquiries
  for insert to anon
  with check (true);

-- ── UPDATE REQUESTS ───────────────────────────────────────────────────
-- Already set in portal/setup.sql — no changes needed
-- (admin_all_requests + client_read_own_requests + client_insert_requests)

-- ── REVIEWS ───────────────────────────────────────────────────────────
alter table public.reviews enable row level security;

drop policy if exists "admin_all_reviews" on public.reviews;
create policy "admin_all_reviews" on public.reviews
  for all to authenticated
  using (auth.email() = 'info@lokalonline.at')
  with check (auth.email() = 'info@lokalonline.at');

-- Public can read ONLY approved reviews (display on customer sites)
drop policy if exists "public_read_reviews" on public.reviews;
create policy "public_read_reviews" on public.reviews
  for select to anon
  using (approved = true);

-- Visitors may submit reviews, but never self-approve — admin moderates.
drop policy if exists "client_insert_review" on public.reviews;
drop policy if exists "anon_insert_review" on public.reviews;
create policy "anon_insert_review" on public.reviews
  for insert to anon
  with check (approved = false);
