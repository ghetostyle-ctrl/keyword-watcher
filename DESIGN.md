# 키워드와처 design system

**스위트 공유 스펙 = `SUITE-DESIGN.md`** (AD FACTORY · 키워드와처 · Success AI 공통, v1 2026-09-28,
원본 `C:\Users\a\Documents\Codex\2026-09-24\new-chat\outputs\suite-design\`). 셸·토큰·컴포넌트 값은 모두 그 문서를 따른다.
이 파일에는 키워드와처만의 accent와 예외만 적는다.

## 1. 토큰 구성
- `src/styles/suite-tokens.css`: 스위트 공용 토큰(세 레포 동일 값, biome 포맷만 적용). `main.tsx`에서 가장 먼저 import.
- `src/styles/tokens.css`: 요소 리셋과 유틸리티만. 자체 색·크기 변수는 없다.
- `index.html`: `<html lang="ko" data-app="trendwatch">`, theme-color `#22242b`, 파비콘 캐시 쿼리 `?v=suite1`.
- 레이아웃 너비 변수는 `--sidebar-width`(232). `--sidebar`는 사이드바 배경색이다.
- 이전 이름(`--brand`, `--black`, `--dark-*`, `--surface-subtle/-muted`, `--subtle`, `--radius-md`, `--amber*`, `--red*`, `--text-md/2xl/3xl`, `--shadow-card`, `--accent-tint`, `--white`)은 모두 제거했다.

## 2. 앱별 accent (주황)
| 토큰 | 값 | 용도 |
|---|---|---|
| `--accent` | `#c2410c` | primary 채움(흰 글자 5.18:1), 링크, 포커스, 차트 선 |
| `--accent-hover` / `--accent-ink` | `#9a3412` | hover, soft 배경 위 텍스트 |
| `--accent-soft` / `--accent-line` | `#fff3eb` / `#f5c9ad` | 선택 카드·체크된 시작 키워드·"수집 중" 배지 |
| `--accent-on-dark` | `#fdba74` | 사이드바 활성 막대·아이콘·포커스 |

- accent는 "진행 중"과 "선택"에만 쓴다. **상승·성공은 녹색(`--success`)**, 하락·실패는 `--danger`.
- 배지 톤: `neutral`, `accent`(수집 중·최신·스냅샷 분석), `positive`(= success, 완료·연결됨·활성), `warning`, `error`.

## 3. 키워드와처 예외
- **로고:** `public/brand-mark.svg`의 `#ff6b00`/`#121212`는 로고 안에서만 쓴다(UI 채움 금지, 흰 라벨 2.9:1). 워드마크는 한 색 `--sidebar-text` 15/600.
- **티커(TREND LIVE):** 페이지 헤더 아래 흰 스트립(40px, `--surface`, 1px `--line`, `--radius-sm`). 라벨 Zap 14 `--accent` + 12/600 `--accent-ink`, 항목 13px, 증가값 `--success`. 실제 상승 키워드만 복제 트랙(`aria-hidden`)으로 순환, 일시정지 버튼과 hover·focus 일시정지, reduced-motion에서 정지. 라벨 `TREND LIVE`는 기능명이라 영문 유지.
- **시장 시그널:** 표준 카드. Radar 20을 40px `--accent-soft` 원 안에 둔다. 라벨 12/500 `--muted`, 제목 20/600, 본문 14 `--muted`.
- **사이드바 푸터:** 시작 가이드 nav, 13px 안내 한 줄 + `--accent-on-dark` 링크 `수집 설정하기`(#settings), `.local-note`(6px 점 + 로컬 SQLite 문구). 예전 `.sidebar-tip` 카드·LOCAL 배지는 삭제.
- **앱 전환 카드:** `<details>` 구조와 이름·부제 문자열은 그대로 유지(§9.1-2). 아바타는 각 앱 고정색, 현재 앱에 Check. ≤760에서는 아바타+화살표만.
- **≤760 상단 영역:** 1행 브랜드·연결 상태 칩·앱 전환, 2행 가로 스크롤 nav(활성 = 하단 2px `--accent-on-dark`). 헤더와 사이드바 푸터는 숨김.
- **카테고리 필터:** 세그먼트(§4.5). 카테고리 스타터 선택 카드는 `--accent-soft`/`--accent-line`, 제목 `--accent-ink`.
- **키워드 히스토리 차트:** 저장된 실제 점만, 날짜 공백이면 선을 끊는다. 선 2px `--accent`, 점 r3, 격자 `--line`.
- **숫자:** 지표 타일 값 28/600 tabular + 단위 14 muted (3개 한 줄, ≤760 1열), 상세 다이얼로그 검색량과 자동 수집 시각은 `--text-display` 28/600.
- **글자 크기 (v2 §10):** 본문·표 셀·카드 설명·폼 14px, 보조/메타 13px, 12px는 뱃지·칩·타임스탬프·표 헤더·카운트만. 사이드바 nav 14px. 화면 제목 = 메뉴 이름 (추적 키워드, 데이터 연결).

## 4. 라벨
영문 eyebrow는 한국어로: 시장 개요 · 내 키워드 · 데이터·자동화 · 수집 기록, nav 그룹 `워크스페이스`. `TREND LIVE`, `NEW`, `KST`는 유지.

## 5. 브레이크포인트
1200 / 1100 / 760 / 480 (900·650·600은 제거). ≤760에서 표는 `td[data-label]` 카드 행, 모든 타겟 44px 이상. `/?showcase=1`에서 버튼·배지·알림·빈 상태를 확인한다.
