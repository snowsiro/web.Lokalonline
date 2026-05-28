-- ──────────────────────────────────────────────────────────────────
-- 고객 데이터 초기 입력 (yori2 & seoulmate)
-- Supabase SQL Editor에서 실행
-- ──────────────────────────────────────────────────────────────────

-- 1. clients 테이블 플랜 값 확인 (기존 'basis/standard/premium' → 'flat' 으로 통일)
-- clients 테이블에 'flat' 값이 없는 경우 아래 주석 해제 후 실행:
-- ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;

-- 2. 고객 레코드 삽입
INSERT INTO clients (name, business_name, email, phone, plan, billing_cycle, setup_fee_waived, start_date, next_billing, page_url, status, notes)
VALUES
  (
    'Mija Chun',
    'Yori2 Korean Restaurant',
    'yori2wien@gmail.com',
    '+43 57 333 789',
    'flat',
    'monthly',
    false,
    '2026-05-28',
    '2026-06-28',
    'yori2',
    'active',
    'Tonguc Gesellschaft m.b.H Nfg KG · FN 196843 a · ATU 60869411'
  ),
  (
    'Yena Lee',
    'Seoulmate Korean Bistro',
    'seoulmate.vienna@gmail.com',
    '+43 676 6537332',
    'flat',
    'monthly',
    false,
    '2026-05-28',
    '2026-06-28',
    'seoulmate',
    'active',
    'Einzelunternehmer · GISA 38698613'
  )
ON CONFLICT (email) DO UPDATE SET
  name             = EXCLUDED.name,
  business_name    = EXCLUDED.business_name,
  phone            = EXCLUDED.phone,
  plan             = EXCLUDED.plan,
  billing_cycle    = EXCLUDED.billing_cycle,
  page_url         = EXCLUDED.page_url,
  status           = EXCLUDED.status,
  notes            = EXCLUDED.notes;

-- 3. orders 테이블에 site_slug 연결 (이미 레코드가 있는 경우 업데이트)
INSERT INTO orders (business_name, business_type, email, phone, address, contact_name, site_slug, legal_type, legal_name, legal_form, geschaeftsfuehrer, fn_number, uid_number, payment_status)
VALUES
  (
    'Yori2 Korean Restaurant',
    'Asiatisches Restaurant',
    'yori2wien@gmail.com',
    '+43 57 333 789',
    'Stumpergasse 27, 1060 Wien, Österreich',
    'Mija Chun',
    'yori2',
    'gesellschaft',
    'Tonguc Gesellschaft m.b.H Nfg KG',
    'KG',
    'Mija Chun',
    '196843 a',
    'ATU 60869411',
    'paid'
  ),
  (
    'Seoulmate Korean Bistro',
    'Schnellimbiss',
    'seoulmate.vienna@gmail.com',
    '+43 676 6537332',
    'Rüdengasse 16/4, 1030 Wien, Österreich',
    'Yena Lee',
    'seoulmate',
    'einzelunternehmer',
    'Yena Lee',
    null,
    null,
    null,
    null,
    'paid'
  )
ON CONFLICT (email) DO UPDATE SET
  site_slug        = EXCLUDED.site_slug,
  legal_type       = EXCLUDED.legal_type,
  legal_name       = EXCLUDED.legal_name,
  legal_form       = EXCLUDED.legal_form,
  geschaeftsfuehrer= EXCLUDED.geschaeftsfuehrer,
  fn_number        = EXCLUDED.fn_number,
  uid_number       = EXCLUDED.uid_number,
  payment_status   = EXCLUDED.payment_status;
