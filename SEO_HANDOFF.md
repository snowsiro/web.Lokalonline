# SEO 인수인계 — 예약앱(lokalonline.at) 쪽 작업용

작성: 2026-10-15 · 대상: **새 세션에서 예약앱 저장소를 붙여 진행**

이 문서는 web.lokalonline.at(이 저장소) 작업이 끝난 뒤, **예약앱 쪽에 남은
일**을 다른 세션에서 이어받기 위한 것이다. 이 저장소에는 더 할 일이 없다.

---

## 1. 발단

> "고객홈페이지중에 yori2의 홈페이지가 구글에 노출이안되네"

조사 결과 원인이 두 시스템에 걸쳐 있었다. 이 저장소 몫은 처리했고,
**예약앱 몫이 남았다.**

---

## 2. 시스템 구성 (헷갈리기 쉬우니 먼저)

| 호스트 | 정체 | 호스팅 | 저장소 |
|---|---|---|---|
| `web.lokalonline.at` | 고객 홈페이지 (yori2 등) | GitHub Pages (185.199.x) | `snowsiro/web.Lokalonline` ← **이 저장소** |
| `lokalonline.at` | 예약 마켓플레이스 | Cloudflare → Render | **미확인 — 새 세션에서 붙일 것** |
| `jaresi.lokalonline.at` | 위와 **동일 앱의 다른 호스트명** | 같은 Cloudflare IP → Render | 위와 동일 |

`lokalonline.at`과 `jaresi.lokalonline.at`은 DNS가 같은 IP(172.67.178.99 /
104.21.83.158)이고 응답 헤더도 같다(`x-render-origin-server: Render`).
**한 앱이 두 도메인으로 서빙된다.** 이게 아래 canonical 문제의 뿌리다.

### CNAME 이력 (중요)

```
2026-05-29  lokalonline.at        ← GitHub Pages가 apex를 서빙하던 시기
2026-06-17  web.lokalonline.at    ← 현재
```

즉 **2026-05-29 ~ 06-17 약 3주간** `lokalonline.at/yori2/`가 고객 홈페이지였다.
지금 그 경로는 예약앱의 catch-all로 떨어진다. 구글이 그때 수집한 URL을 아직
들고 있을 수 있으나, 3주짜리라 영향은 크지 않다.

---

## 3. 이미 끝난 것 (이 저장소, 커밋 `4e784b4`)

브랜치 `claude/link-page-management-h28nkc` (origin/main 대비 2커밋 앞섬, 미머지)

- `sitemap.xml` 신규 — robots.txt가 전부터 가리키고 있었으나 파일이 없어 404였다.
  검증된 11개 URL 등록 (전부 HTTP 200 확인)
- 전 페이지(21개) self-referencing `<link rel="canonical">`
- yori2 / seoulmate 홈에 `Restaurant` JSON-LD (주소·전화·영업시간·메뉴·예약링크)
- seoulmate에 통째로 없던 meta description / og / twitter 보충
- 생성기(`admin/app.js`): canonical·JSON-LD 자동 삽입, 템플릿의 title/description/og를
  **생성 시점에 HTML로** 기록(기존엔 JS 런타임에만 채워짐), 새 사이트를 sitemap.xml에
  자동 등록

검증 98개 통과. 자세한 내용은 `PROJECT_STATUS.md`의 **SEO** 절 참조.

---

## 4. 새 세션에서 할 일 (예약앱 저장소)

### 4-1. 매칭 안 되는 경로가 HTTP 200을 반환한다 — 핵심

앱이 **모든 경로**에 200 + 일반 "Discover restaurants" 화면을 돌려준다.

```
lokalonline.at/yori2/                  → 200, "Discover restaurants"
lokalonline.at/yori2                   → 200, 위와 동일
lokalonline.at/xyz-nonexistent-123/    → 200, 위와 완전히 동일
```

존재하는 업체 슬러그와 아무 문자열이 구분되지 않는다. 전형적인 soft-404
catch-all로, 무한한 중복 URL이 생겨 크롤링 예산을 낭비한다.

**할 일: 라우트에 매칭되지 않으면 404를 반환.**

### 4-2. canonical ↔ sitemap 이 서로 반대를 가리킨다

실제 업체 페이지는 `/book/<슬러그>`다. 그런데:

```
앱 사이트맵(lokalonline.at/sitemap.xml) 에 등록된 URL:
  https://lokalonline.at/book/yori2          ← "이걸 색인해"

그 페이지가 선언하는 canonical:
  https://jaresi.lokalonline.at/book/yori2   ← "아니 저쪽이 진짜야"
```

사이트맵은 색인하라 하고 canonical은 다른 호스트를 가리킨다. 결과적으로
마켓플레이스 도메인은 "Yori2 reservieren" 류 검색에서 올라오지 못하고
jaresi 서브도메인이 가져간다.

**할 일: 둘 중 하나로 통일.**
- 마켓플레이스(`lokalonline.at`)가 노출되길 원한다 → canonical을 self-referencing으로
- jaresi가 가져가야 한다 → 사이트맵에서 `lokalonline.at/book/yori2` 제거

어느 쪽이 맞는지는 **제품 결정**이므로 새 세션에서 먼저 물어볼 것.

### 4-3. (선택) 옛 슬러그 경로만 301

2-3절의 3주 구간 때문에 구글이 `lokalonline.at/<슬러그>/`를 들고 있을 수 있다.
`/yori2/`, `/seoulmate/`, `/jaresi/`, `/hayandal/` 4개만
`https://web.lokalonline.at/<슬러그>/`로 301하면 그 신호를 회수할 수 있다.
앱 라우트(`/`, `/impressum`, `/datenschutz`, `/agb`, `/discover/...`, `/book/<슬러그>`)와
충돌하지 않는다. 4-1의 404 처리보다 우선순위는 낮다.

### 4-4. 앱 사이트맵이 업체 1곳만 담고 있다

```
https://lokalonline.at/
https://lokalonline.at/impressum
https://lokalonline.at/datenschutz
https://lokalonline.at/agb
https://lokalonline.at/discover/cuisine/korean
https://lokalonline.at/discover/city/wien
https://lokalonline.at/book/yori2          ← 업체 페이지가 이것 하나뿐
```

등록 업체가 늘면 사이트맵도 같이 늘어야 한다. 동적 생성인지 수동인지
새 세션에서 확인할 것.

---

## 5. 절대 하지 말 것

- **`/book/<슬러그>`를 리디렉트하지 말 것.** 살아있는 실제 예약 페이지다
  (렌더 결과: "Yori2 – Online reservation", JSON-LD 있음).
- `lokalonline.at/<슬러그>/`를 **일괄** 301하지 말 것. 처음에 이렇게 제안했다가
  틀린 것으로 확인됐다. 4-3처럼 **알려진 레거시 슬러그 4개만** 대상으로 한다.

---

## 6. 재현/검증 명령

```bash
# catch-all 확인 — 없는 슬러그와 응답이 같은지
curl -sS -o /dev/null -w "%{http_code}\n" https://lokalonline.at/yori2/
curl -sS -o /dev/null -w "%{http_code}\n" https://lokalonline.at/xyz-nonexistent-123/

# 앱 사이트맵
curl -sS https://lokalonline.at/sitemap.xml

# 렌더 후 title/canonical (SPA라 렌더링 필요)
/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
  --no-sandbox --disable-gpu --virtual-time-budget=9000 \
  --dump-dom "https://lokalonline.at/book/yori2" \
  | grep -oE '<title>[^<]*</title>|rel="canonical" href="[^"]*"'

# 호스팅 확인
getent hosts lokalonline.at jaresi.lokalonline.at web.lokalonline.at
curl -sSI https://lokalonline.at/ | grep -iE "server|x-render"
```

---

## 7. 코드와 무관하게 남은 일 (사용자 직접)

1. **Google Search Console에 `web.lokalonline.at` 등록** → 사이트맵 제출 →
   `web.lokalonline.at/yori2/` 색인 요청. 인증 흔적이 전혀 없었다.
   **이걸 안 하면 위의 모든 작업이 늦게 반영된다. 우선순위 1위.**
2. 예약앱 도메인도 Search Console 등록 (별도 속성)
3. **Google Business Profile** — 음식점 상호 검색은 사실상 이게 좌우한다

---

## 8. 알려진 문제 (미처리)

- `jaresi/`, `hayandal/`은 이 저장소에 `index.html`이 없어
  `web.lokalonline.at/jaresi/`, `/hayandal/`이 **404**다. 두 사이트의
  링크페이지 맨 위 "Website" 버튼이 그 404를 가리킨다.
  → 사이트맵에서는 제외해 뒀다. 홈을 만들거나 링크를 고쳐야 한다.
