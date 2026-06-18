# lokalonline.at — 프로젝트 인수인계 문서

## 프로젝트 개요
비엔나 소상공인 대상 웹디자인 서비스. 고객이 주문폼 제출 → 어드민이 사이트 생성 → 결제 → 운영.

- **도메인**: lokalonline.at
- **호스팅**: GitHub Pages (snowsiro/Lokalonline, branch: main)
- **DB/Auth**: Supabase (프로젝트 ID: vhnourjddnlslgabrasb)
- **결제**: Stripe
- **이메일**: Resend (noreply@lokalonline.at)
- **Edge Functions**: Supabase (github-upload, stripe-webhook, send-email)

---

## 기술 스택
- 정적 HTML/CSS/JS (프레임워크 없음)
- Supabase JS SDK (CDN)
- GitHub API (파일 업로드/수정)
- Stripe Payment Link
- Resend API (이메일 발송)

---

## 환경 변수 / 시크릿 (값은 각 서비스에서 직접 확인)

### Supabase Secrets (Edge Functions용)
- `GITHUB_TOKEN` — GitHub → Settings → Developer Settings → Personal Access Tokens
- `STRIPE_SECRET_KEY` — Stripe 대시보드 → Developers → API keys (⚠️ 이전에 노출됨, 재발급 필요)
- `STRIPE_WEBHOOK_SECRET` — Stripe 대시보드 → Webhooks
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API (⚠️ 이전에 노출됨, 재발급 불가, RLS로 보호)
- `RESEND_API_KEY` — resend.com → API Keys

### GitHub Secrets (Actions용)
- `SUPABASE_ACCESS_TOKEN` — Supabase → Account → Access Tokens
- `SUPABASE_PROJECT_REF` — vhnourjddnlslgabrasb

### 코드에 포함된 공개 키 (공개 가능)
- Supabase URL: `https://vhnourjddnlslgabrasb.supabase.co`
- Supabase anon key: Supabase → Settings → API → anon/public
- Admin 이메일: snowsiro@gmail.com

---

## 디렉토리 구조

```
Lokalonline/
├── index.html                    # 메인 랜딩페이지
├── order/
│   ├── index.html                # 주문 폼 (고객용)
│   ├── migration.sql             # orders 테이블 컬럼 추가
│   ├── messages_migration.sql    # messages 테이블 생성
│   └── chat_attachments_migration.sql  # 첨부파일 컬럼 추가
├── portal/
│   ├── index.html                # 고객 포털
│   ├── portal.js                 # 포털 로직 (메시지, 파일첨부 포함)
│   └── setup.sql                 # 포털 RLS + update_requests 테이블
├── admin/
│   ├── dashboard.html            # 어드민 대시보드
│   ├── app.js                    # 어드민 로직
│   ├── admin.css                 # 어드민 스타일
│   └── setup.sql                 # 기본 테이블 생성
├── templates/
│   ├── restaurant/
│   │   ├── index.html            # 레스토랑 템플릿
│   │   ├── data.js               # 예시 데이터
│   │   └── menu/
│   │       ├── index.html        # 디지털 메뉴 페이지
│   │       └── menu-data.js      # 메뉴 예시 데이터
│   ├── cafe/                     # 위와 동일 구조
│   ├── beauty/                   # 위와 동일 구조
│   └── retail/                   # 위와 동일 구조
├── js/
│   └── stripe-config.js          # Stripe 결제 링크
├── supabase/
│   ├── rls_policies.sql          # 전체 RLS 정책 (실행 완료)
│   └── functions/
│       ├── github-upload/
│       │   └── index.ts          # 파일 업로드/수정/조회
│       ├── stripe-webhook/
│       │   └── index.ts          # 결제 완료 → clients 자동 등록
│       └── send-email/
│           └── index.ts          # 이메일 알림 (Resend)
└── .github/
    └── workflows/
        └── deploy-edge-functions.yml  # Edge Function 자동 배포
```

---

## Supabase 테이블 현황

| 테이블 | 용도 | RLS |
|---|---|---|
| `orders` | 고객 주문 | ✅ |
| `clients` | 결제 완료 고객 | ✅ |
| `messages` | 어드민-고객 채팅 | ✅ |
| `inquiries` | 문의 폼 | ✅ |
| `update_requests` | 수정 요청 | ✅ |
| `reviews` | 리뷰 | ✅ |

### SQL 실행 완료 목록
- [x] admin/setup.sql — 기본 테이블 생성
- [x] portal/setup.sql — RLS + update_requests
- [x] order/migration.sql — orders 컬럼 추가
- [x] order/messages_migration.sql — messages 테이블
- [x] order/chat_attachments_migration.sql — attachment 컬럼
- [x] supabase/rls_policies.sql — 전체 RLS 정책

### orders 테이블 주요 컬럼
```
id, created_at, business_name, business_type, contact_name,
email, phone, address, website, description, instagram,
logo_url, photo_urls, payment_status, site_slug,
admin_notes, status
```

---

## Supabase Storage

- 버킷명: `uploads` (Public)
- 경로 구조:
  - `chat/{order_id}/` — 채팅 첨부파일
  - (기존 메뉴판 사진 경로도 동일 버킷 사용)

---

## Edge Functions

### github-upload
- `put-file`: base64 → GitHub 파일 업로드
- `copy-from-url`: URL에서 이미지 가져와 GitHub에 저장
- `get-file`: GitHub에서 파일 내용 읽기

### stripe-webhook
- `checkout.session.completed` 이벤트 처리
- orders.payment_status = 'paid' 업데이트
- clients 테이블에 자동 등록

### send-email
- `new-order` (orders INSERT): 어드민에게 새 주문 알림
- `new-message` (messages INSERT): 메시지 발신자에 따라 상대방에게 알림
- 테이블명으로 자동 타입 감지

---

## Supabase Database Webhooks

| 이름 | 테이블 | 이벤트 | 함수 |
|---|---|---|---|
| notify-new-order | orders | INSERT | send-email |
| notify-new-message | messages | INSERT | send-email |

---

## 어드민 주요 기능 (admin/app.js)

### 사이트 생성 흐름 (doGenerateSite)
1. 템플릿 선택 (restaurant/cafe/beauty/retail)
2. 슬러그 입력 (예: cafe-central)
3. 버튼 클릭 시 자동 생성:
   - `{slug}/index.html` — 메인 홈페이지
   - `{slug}/data.js` — 사이트 데이터
   - `{slug}/menu/index.html` — 디지털 메뉴판
   - `{slug}/menu/menu-data.js` — 메뉴 데이터
   - `{slug}/link/index.html` — SNS 링크 페이지
   - `{slug}/img/qr-menu.png` — QR 코드 (qrcode.js로 브라우저 생성)
4. orders.site_slug 저장
5. 완료 팝업 + QR 코드 표시 + 다운로드

### 파일 편집 (openFileEditor)
- `📝 data.js` 버튼 → site_slug 설정 시 표시
- GitHub에서 data.js 로드 → 편집 → 저장

### 채팅 + 파일 첨부
- `+` 버튼으로 이미지/PDF 첨부
- Supabase Storage uploads 버킷에 업로드
- 이미지: 인라인 미리보기, PDF: 링크

---

## 고객 포털 (portal/portal.js)

### 접근 조건
- 결제 전: orders 테이블에 email이 있으면 기본 뷰 (주문 상태 + 채팅)
- 결제 후: clients 테이블에 등록되면 전체 대시보드

### 기능
- 주문 상태 확인
- 어드민과 채팅 (파일 첨부 포함)
- 수정 요청
- 리뷰 작성

---

## 결제 흐름

1. 어드민이 고객에게 Stripe 결제 링크 전송
2. 고객 결제 완료
3. Stripe → stripe-webhook Edge Function 호출
4. orders.payment_status = 'paid'
5. clients 테이블 자동 등록 (status: 'active')

결제 링크: js/stripe-config.js 에서 관리
현재 설정: basis_monthly = basis_yearly = 동일 링크

---

## QR 코드
- 라이브러리: qrcode.js (jsdelivr CDN, 외부 API 의존 없음)
- 연결 URL: `https://web.lokalonline.at/{slug}/menu/`
- 저장 위치: `{slug}/img/qr-menu.png` (GitHub)
- 어드민 완료 팝업에서 바로 확인 + 다운로드 가능

---

## 완료 항목 (2026-05-27)

### 이메일 알림 ✅
- Edge Function 배포, Resend API 키, Database Webhooks, 도메인 인증, 발송 테스트 모두 완료
- 발신: noreply@lokalonline.at / 수신: info@lokalonline.at

### 어드민 계정 변경 ✅
- info@lokalonline.at (snowsiro@gmail.com에서 변경)
- Supabase Auth, RLS 정책, 코드 전체 반영 완료

### 추가 보안 ✅
- 주문 폼 Honeypot 스팸 방지 완료
- Storage 버킷 정책 5MB 제한, MIME 타입 제한 (order/storage_policies.sql)
- Supabase GRANT 정책 2026-10 변경 대응 완료

---

## 완료 항목 (2026-05-28)

### 독일어 번역 ✅
- admin/dashboard.html, admin/app.js 전체 한국어 → 독일어 번역

### 보안 개선 ✅
- portal/portal.js, admin/app.js XSS 취약점 수정 (esc() 적용)
- send-email Edge Function: messages INSERT 시에만 이메일 발송 (UPDATE/DELETE 제외)

### 매직링크 리디렉트 수정 ✅
- 이메일 클릭 후 `/portal/dashboard.html`로 바로 이동 (이전: 메인 페이지)
- js/main.js, portal/index.html 양쪽 수정

### 주문 폼 개선 ✅
- 파일 업로드 실패 시 non-blocking 경고 메시지 표시
- 로고/사진 업로드 전 클라이언트 사이드 검증 (형식, 10MB 제한)

### 포털 개선 ✅
- 미읽은 어드민 메시지 수 배지 표시 (💬 Nachrichten 헤딩)
- Realtime 채널 beforeunload 시 unsubscribe (메모리 누수 방지)

### 어드민 개선 ✅
- Webseiten 탭 업종별 필터 추가 (Restaurant/Bar, Café/Bäckerei, Beauty/Friseur, Einzelhandel)
- 메시지 Realtime 구독 추가 (고객 메시지 실시간 수신)
- 주문 모달 전환 시 이전 채널 자동 정리 (beforeunload 포함)

---

## 미완료 / 진행 중

### 이메일 알림 (설정 중)
- Edge Function 배포: ✅
- Resend API 키 Supabase Secrets 등록: ✅
- Database Webhooks 설정: ✅
- **⚠️ 미완료: Resend에서 lokalonline.at 도메인 인증**
  - resend.com → Domains → lokalonline.at 상태 확인
  - Verified가 아니면 DNS TXT 레코드 추가 필요
  - 인증 전까지 이메일 발송 불가

### 법적 필수 항목 (사업자 허가 후)
- Impressum (사업자 정보 페이지)
- Datenschutzerklärung (개인정보처리방침 / DSGVO)
- Cookie 동의 배너
- AGB (이용약관)

### 기타 예정
- 청구서/영수증 자동화 (Stripe에서 설정 가능)

---

## GitHub Actions

push to main + supabase/functions/** 변경 시 자동 배포:
- stripe-webhook
- send-email

필요 GitHub Secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` = vhnourjddnlslgabrasb

---

## 다음 세션에서 할 일

1. 사업자 허가 후 법적 필수 페이지 제작 (Impressum, DSGVO, AGB)
2. Stripe 청구서 자동화 설정
