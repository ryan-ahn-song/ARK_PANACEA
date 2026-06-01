# PANACEA — Community Health Intelligence

> 소외 지역(underserved communities)의 감염병 조기 대응을 돕는 커뮤니티 헬스 인텔리전스 웹 앱.
> 증상 기반 AI 트리아지, 지역 질병 히트맵, 게이미피케이션 기반 건강 미션을 하나의 경험으로 통합합니다.

e-ICON 출품작으로 제작되었으며, 웹(web) 우선의 미니멀한 인터페이스를 지향합니다.

---

## ✨ 핵심 기능

| 기능 | 설명 |
|------|------|
| **AI Guidance** | 증상을 선택하거나 음성으로 입력하면, Grok LLM이 감염병 트리아지 결과(가능성 상위 3개)를 교육용 참고 정보로 제시합니다. 결과는 음성으로도 읽어줍니다. |
| **Body Atlas** | 신체 부위·질환별 증상 클러스터를 동적으로 탐색하고 분석으로 연결합니다. |
| **Heatmap** | 지역(예: 나이로비)의 질병 보고 데이터를 지도 위 히트맵으로 시각화하고, 질환 태그로 필터링합니다. |
| **Dashboard** | 오늘의 건강 미션, 진행 링, 환경 위험 인사이트를 한눈에 제공합니다. |
| **Guardian** | 미션 완료로 XP를 쌓아 Guardian 레벨을 올리고 보상을 잠금 해제하는 게이미피케이션 레이어. |
| **Profile** | 실제 사용자 등급·백분위·XP·건강 로그를 표시합니다. |

> ⚠️ **면책**: 본 앱의 AI 결과는 **교육용 참고 정보**이며 의학적 진단이 아닙니다.

---

## 🛠 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack, `proxy.ts` 컨벤션)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Horizon Minimal — monochrome, Noto Serif / Manrope / JetBrains Mono)
- **Backend / Auth / DB**: Supabase (Postgres, Row Level Security, Email OTP Auth)
- **AI**: xAI Grok (`grok-3-mini`)
- **Maps**: Leaflet + react-leaflet (CartoDB 타일)
- **Voice**: Web Speech API (음성 입력 / 음성 출력)
- **Hosting**: Vercel

---

## 🔐 인증 흐름

이메일 기반 **OTP(One-Time Password)** 로그인을 사용합니다.

1. `/login` 에서 이메일 입력 → Supabase `signInWithOtp` 로 6자리 코드 발송
2. `/auth/verify` 에서 코드 입력 → `verifyOtp` 로 세션 발급
3. 인증된 사용자만 `/dashboard`, `/profile`, `/ai-guidance`, `/guardian`, `/api/analyse` 접근 가능 (`proxy.ts` 게이트)
4. `/body-atlas`, `/heatmap` 은 비로그인 공개 탐색 허용

---

## 🚀 로컬 실행

```bash
cd app
npm install
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

### 환경 변수 (`app/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
GROK_API_KEY=<your-xai-api-key>
# 선택: 분산 rate-limit IP 해시 솔트 (미설정 시 GROK_API_KEY를 fallback으로 사용)
RATE_LIMIT_SECRET=<random-server-secret>
```

> `.env.local` 및 기타 시크릿 파일은 절대 커밋하지 마세요(`.gitignore`로 차단되어 있습니다).

---

## 📦 주요 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 실행
npm run lint    # ESLint
```

---

## 🗂 프로젝트 구조

```
app/
├─ src/
│  ├─ app/
│  │  ├─ (app)/         # 인증 후 화면: dashboard, profile, ai-guidance, guardian, body-atlas, heatmap
│  │  ├─ (auth)/        # 인증 화면: login, auth/verify
│  │  ├─ api/analyse/   # Grok 기반 증상 분석 API (인증 + rate limit + 스키마 검증)
│  │  └─ page.tsx       # 랜딩 페이지
│  ├─ components/       # UI · 내비게이션 · 히트맵 컴포넌트
│  ├─ lib/              # Supabase 클라이언트 · Grok 클라이언트 · 타입
│  └─ proxy.ts          # Next.js 16 라우트 보호 게이트
└─ next.config.ts       # 보안 헤더(CSP, HSTS 등)
```

---

## 🛡 보안

- 모든 Postgres 테이블에 **Row Level Security** 적용
- `/api/analyse` 는 서버측 인증 + 사용자/IP 기준 분산 rate limit + 요청 크기/증상 enum 검증 + LLM 응답 스키마 검증
- `next.config.ts` 에 CSP · HSTS · X-Frame-Options · nosniff · Referrer/Permissions Policy 적용
