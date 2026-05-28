-- ──────────────────────────────────────────────────────────────────
-- 고객 데이터 초기 입력 (yori2 & seoulmate)
-- Supabase SQL Editor에서 실행
-- ──────────────────────────────────────────────────────────────────

-- ── clients ──────────────────────────────────────────────────────

INSERT INTO clients (name, business_name, email, phone, plan, billing_cycle, setup_fee_waived, start_date, next_billing, page_url, status, notes)
SELECT 'Mija Chun','Yori2 Korean Restaurant','yori2wien@gmail.com','+43 57 333 789','flat','monthly',false,'2026-05-28','2026-06-28','yori2','active','Tonguc Gesellschaft m.b.H Nfg KG · FN 196843 a · ATU 60869411'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'yori2wien@gmail.com');

UPDATE clients SET
  name='Mija Chun', business_name='Yori2 Korean Restaurant', phone='+43 57 333 789',
  plan='flat', billing_cycle='monthly', page_url='yori2', status='active',
  notes='Tonguc Gesellschaft m.b.H Nfg KG · FN 196843 a · ATU 60869411'
WHERE email='yori2wien@gmail.com';

INSERT INTO clients (name, business_name, email, phone, plan, billing_cycle, setup_fee_waived, start_date, next_billing, page_url, status, notes)
SELECT 'Yena Lee','Seoulmate Korean Bistro','seoulmate.vienna@gmail.com','+43 676 6537332','flat','monthly',false,'2026-05-28','2026-06-28','seoulmate','active','Einzelunternehmer · GISA 38698613'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'seoulmate.vienna@gmail.com');

UPDATE clients SET
  name='Yena Lee', business_name='Seoulmate Korean Bistro', phone='+43 676 6537332',
  plan='flat', billing_cycle='monthly', page_url='seoulmate', status='active',
  notes='Einzelunternehmer · GISA 38698613'
WHERE email='seoulmate.vienna@gmail.com';

-- ── orders ───────────────────────────────────────────────────────

INSERT INTO orders (business_name, business_type, email, phone, address, contact_name, site_slug, legal_type, legal_name, legal_form, geschaeftsfuehrer, fn_number, uid_number, payment_status)
SELECT 'Yori2 Korean Restaurant','Asiatisches Restaurant','yori2wien@gmail.com','+43 57 333 789','Stumpergasse 27, 1060 Wien, Österreich','Mija Chun','yori2','gesellschaft','Tonguc Gesellschaft m.b.H Nfg KG','KG','Mija Chun','196843 a','ATU 60869411','paid'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE email = 'yori2wien@gmail.com');

UPDATE orders SET
  site_slug='yori2', legal_type='gesellschaft', legal_name='Tonguc Gesellschaft m.b.H Nfg KG',
  legal_form='KG', geschaeftsfuehrer='Mija Chun', fn_number='196843 a',
  uid_number='ATU 60869411', payment_status='paid'
WHERE email='yori2wien@gmail.com';

INSERT INTO orders (business_name, business_type, email, phone, address, contact_name, site_slug, legal_type, legal_name, legal_form, geschaeftsfuehrer, fn_number, uid_number, payment_status)
SELECT 'Seoulmate Korean Bistro','Schnellimbiss','seoulmate.vienna@gmail.com','+43 676 6537332','Rüdengasse 16/4, 1030 Wien, Österreich','Yena Lee','seoulmate','einzelunternehmer','Yena Lee',null,null,null,null,'paid'
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE email = 'seoulmate.vienna@gmail.com');

UPDATE orders SET
  site_slug='seoulmate', legal_type='einzelunternehmer', legal_name='Yena Lee',
  legal_form=null, geschaeftsfuehrer=null, fn_number=null, uid_number=null,
  payment_status='paid'
WHERE email='seoulmate.vienna@gmail.com';
