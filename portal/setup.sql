-- lokalonline Client Portal — 추가 SQL
-- Supabase SQL Editor에 붙여넣고 실행하세요

-- 1. 기존 clients 정책 교체 (관리자/클라이언트 분리)
drop policy if exists "auth_all_clients" on public.clients;

-- 관리자만 전체 접근 (이메일로 구분)
drop policy if exists "admin_all_clients" on public.clients;
create policy "admin_all_clients" on public.clients
  for all to authenticated
  using (auth.email() = 'snowsiro@gmail.com')
  with check (auth.email() = 'snowsiro@gmail.com');

-- 클라이언트는 본인 레코드만 조회
drop policy if exists "client_read_own" on public.clients;
create policy "client_read_own" on public.clients
  for select to authenticated
  using (email = auth.email());

-- 2. 업데이트 요청 테이블
drop table if exists public.update_requests cascade;
create table public.update_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  client_email text not null,
  type text not null check (type in ('content','menu','design','other')),
  description text not null,
  status text default 'pending' not null
    check (status in ('pending','in_progress','done')),
  admin_notes text
);

alter table public.update_requests enable row level security;

-- 관리자 전체 접근
drop policy if exists "admin_all_requests" on public.update_requests;
create policy "admin_all_requests" on public.update_requests
  for all to authenticated
  using (auth.email() = 'snowsiro@gmail.com')
  with check (auth.email() = 'snowsiro@gmail.com');

-- 클라이언트: 본인 요청만 조회 및 추가
drop policy if exists "client_read_own_requests" on public.update_requests;
create policy "client_read_own_requests" on public.update_requests
  for select to authenticated
  using (client_email = auth.email());

drop policy if exists "client_insert_requests" on public.update_requests;
create policy "client_insert_requests" on public.update_requests
  for insert to authenticated
  with check (client_email = auth.email());

-- 3. 기존 inquiries 정책도 관리자 전용으로 교체
drop policy if exists "auth_all_inquiries" on public.inquiries;

drop policy if exists "admin_all_inquiries" on public.inquiries;
create policy "admin_all_inquiries" on public.inquiries
  for all to authenticated
  using (auth.email() = 'snowsiro@gmail.com')
  with check (auth.email() = 'snowsiro@gmail.com');
