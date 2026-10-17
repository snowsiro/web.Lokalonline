-- 메뉴 편집 데이터 (가게마다 한 줄)
-- Supabase SQL Editor에 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 메뉴 페이지(/{slug}/menu/)는 기본 메뉴를 HTML에 갖고 있고, 여기 저장된
-- 수정 내용(이름·설명·가격·사진 주소)을 그 위에 덮어 보여 줍니다.
-- 읽기: 누구나. 쓰기: 운영자, 그리고 그 가게 사장님
-- (clients.page_url 또는 orders.site_slug로 가게와 연결된 이메일).

create table if not exists public.menu_data (
  slug       text primary key check (slug ~ '^[a-z0-9-]+$'),
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 200000),
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 로그인한 사람이 이 가게 메뉴를 고칠 수 있는지. 사진 서명(menu_photo_sign)도 이 함수로 확인합니다.
create or replace function public.can_edit_menu(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(auth.email()) = 'info@lokalonline.at'
    or exists (
      select 1 from public.clients c
      where lower(c.email) = lower(auth.email())
        and regexp_replace(rtrim(c.page_url, '/'), '^.*/', '') = p_slug
    )
    or exists (
      select 1 from public.orders o
      where lower(o.email) = lower(auth.email())
        and o.site_slug = p_slug
    ),
    false);
$$;

revoke all on function public.can_edit_menu(text) from public;
grant execute on function public.can_edit_menu(text) to anon, authenticated;

-- 언제 누가 마지막으로 고쳤는지 (페이지가 보내는 값은 믿지 않고 여기서 채움)
create or replace function public.menu_data_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.email();
  return new;
end;
$$;

drop trigger if exists menu_data_stamp on public.menu_data;
create trigger menu_data_stamp
  before insert or update on public.menu_data
  for each row execute function public.menu_data_stamp();

alter table public.menu_data enable row level security;

drop policy if exists "menu_data_read" on public.menu_data;
create policy "menu_data_read" on public.menu_data
  for select to anon, authenticated
  using (true);

drop policy if exists "menu_data_insert" on public.menu_data;
create policy "menu_data_insert" on public.menu_data
  for insert to authenticated
  with check (public.can_edit_menu(slug));

drop policy if exists "menu_data_update" on public.menu_data;
create policy "menu_data_update" on public.menu_data
  for update to authenticated
  using (public.can_edit_menu(slug))
  with check (public.can_edit_menu(slug));

grant select on table public.menu_data to anon, authenticated;
grant insert, update on table public.menu_data to authenticated;

-- yori2: Firebase(yori2-web)에 있던 수정 내용 (2026-10-17 기준).
-- 이미 줄이 있으면 건드리지 않습니다.
insert into public.menu_data (slug, data)
values ('yori2', $json${
  "items": {
    "V5": {
      "descDE": "Koreanischer Pfannkuchen mit Kimchi",
      "descEN": "Korean savory pancake with kimchi",
      "descKO": "김치전 — 김치로 만든 한국식 전",
      "hidden": false,
      "nameDE": "Kimchijeon",
      "nameEN": "",
      "nameKO": "",
      "price": "€ 12,90",
      "price2": "",
      "tags": []
    },
    "V6": {
      "descDE": "Fermentierter Chinakohl nach koreanischer Art",
      "descEN": "Fermented Korean-style napa cabbage",
      "descKO": "직접 담근 김치 — 한국식 발효 배추김치",
      "hidden": false,
      "nameDE": "Hausgemachtes Kimchi",
      "nameEN": "",
      "nameKO": "",
      "price": "€ 5,90",
      "price2": "",
      "tags": []
    }
  },
  "photos": {
    "C1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661946/kse_menu/C1_1779661963544.jpg",
    "C2": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661948/kse_menu/C2_1779661965553.jpg",
    "C3": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661950/kse_menu/C3_1779661967553.jpg",
    "H1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780142487/kse_menu/H1_1780142486197.png",
    "H4": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780142496/kse_menu/H4_1780142493135.png",
    "J1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779662034/kse_menu/J1_1779662049281.jpg",
    "J2": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144177/kse_menu/J2_1780144174691.png",
    "J3": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779662044/kse_menu/J3_1779662058004.jpg",
    "N3": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779662013/kse_menu/N3_1779662028575.jpg",
    "N4": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144617/kse_menu/N4_1780144642533.jpg",
    "SP1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779662002/kse_menu/SP1_1779662012816.jpg",
    "SP2": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661989/kse_menu/SP2_1779662001895.jpg",
    "T1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661970/kse_menu/T1_1779661976103.png",
    "T3": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780142201/kse_menu/T3_1780142198955.png",
    "T5": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661965/kse_menu/T5_1779661979495.png",
    "T6": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661979/kse_menu/T6_1779661990917.jpg",
    "V1": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144077/kse_menu/V1_1780144069443.png",
    "V2": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780142458/kse_menu/V2_1780142456336.png",
    "V3": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144087/kse_menu/V3_1780144079605.png",
    "V4": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144429/kse_menu/V4_1780144426878.png",
    "V5": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1780144418/kse_menu/V5_1780144415837.png",
    "V6": "https://res.cloudinary.com/dxsrdx0cw/image/upload/v1779661935/kse_menu/V6_1779661952649.jpg"
  },
  "sections": {}
}$json$::jsonb)
on conflict (slug) do nothing;
