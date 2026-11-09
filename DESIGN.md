# DESIGN.md — lokalonline.at 디자인 규칙

이 파일은 lokalonline.at 자체 페이지(홈, 주문폼, 고객 포털, 관리자)의 기준입니다.
업종 템플릿(`templates/`)과 고객 사이트(`seoulmate/`, `yori2/`)는 고객마다 브랜드가 따로 있어서, 색과 글꼴은 각자 것을 쓰고 아래의 **공통 규칙**(대비, 글자 크기, 모션, 아이콘)만 따릅니다. Jaresi 소개 페이지(`Jaresi/`)도 지금 스타일을 유지하고 공통 규칙만 따릅니다.

## 메인 사이트 (`css/style.css`)

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `--dark` | `#1b0d07` | 진한 배경, 본문 글자 |
| `--orange` | `#e06535` | 장식, 테두리, 24px 이상의 큰 글자. 작은 글자나 흰 글자 버튼의 배경에는 쓰지 않습니다(흰 바탕에서 3.5:1) |
| `--orange-dark` | `#c4531f` | 흰 글자를 올리는 버튼 배경(4.6:1) |
| `--orange-ink` | `#a8461a` | 작은 주황 글자(eyebrow, 강조 문구)와 버튼 hover(흰 바탕 5.9:1, 크림 5.2:1) |
| `--cream` | `#f4efe9` | 섹션 배경 |
| `--text-muted` | `#7a6963` | 보조 글자(흰 바탕 5.2:1, 크림 4.6:1) |

- 글꼴: Inter 하나.
- 주문폼(`order/index.html`)은 같은 값을 자체 `:root`에 둡니다. 바꿀 때는 두 곳을 함께 바꿉니다.

## 관리자·고객 포털 (`admin/admin.css`)

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `--primary` | `#1e3a5f` | 진한 배경, 강조 |
| `--accent` | `#f4900c` | 주 버튼과 배지의 배경. 위 글자는 `--text`(#1a202c, 6.9:1). 흰 글자는 2.4:1이라 쓰지 않습니다 |

## 공통 규칙 (템플릿과 고객 사이트 포함)

- **대비:** 글자 4.5:1 이상. 24px 이상(굵게 18.66px 이상)의 큰 글자와 아이콘·테두리는 3:1 이상. 사진 위 글자는 어두운 막을 깔아 같은 기준을 맞춥니다.
- **글자 크기:** 가장 작은 글자는 12px입니다.
- **모션**
  - 모든 스타일에 아래 '동작 줄이기' 블록을 넣습니다.
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    }
    ```
  - 움직이는 hover(`transform`)는 `@media (hover: hover) and (pointer: fine) { … }` 안에서만 씁니다. 휴대폰과 태블릿은 탭한 뒤에도 hover가 남습니다. Tailwind 페이지는 `[@media(hover:hover)_and_(pointer:fine)]:hover:…`로 씁니다.
  - `transition: all` 대신 바뀌는 속성을 적습니다.
- **아이콘:** Lucide(인라인 SVG). 새로 넣는 아이콘에는 이모지를 쓰지 않습니다.
- **새 고객 사이트:** 관리자 생성기가 `templates/<업종>/`을 복사해 사이트를 만듭니다(`admin/app.js`). 템플릿을 고치면 새 사이트에 반영되고, 이미 만든 사이트는 따로 고칩니다.

## 아직 맞추지 않은 곳

- 이모지 아이콘 230개: 다음 PR에서 Lucide로 바꿉니다.
- 12px보다 작은 글자, eyebrow·자간 넓힌 대문자 라벨, 24px보다 작은 탭 영역: 템플릿·고객 사이트·관리자(다음 PR).
- 320px에서 가로로 밀리는 페이지: `Jaresi/` 34px, `templates/restaurant/`·`seoulmate/menu/` 12px.
- `transition: all` 31곳.
- 쓰이지 않는 `css/style.backup.css`.
