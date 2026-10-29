# 데이터 구성 단계 설계 (2026-10-29)

이슈 #49. 사용자 요청: "데이터 라벨링부터 데이터 구성도 이런것도 좀 있으면 좋겠는데 와이어프레임 구성 전에".
지금 체인은 `기능명세 → 디자인 프롬프트`로 바로 넘어간다. 기능명세의 데이터 정보는 `dataItems`(이름 · 설명 한 줄)뿐이라, 와이어프레임에 들어갈 실제 값 · 필드 · 데이터 사이의 관계가 정해지지 않은 채 화면을 그리게 된다.
목표: 와이어프레임 전에 **화면이 다루는 데이터를 엔티티 · 필드로 정의하고 구성도(ERD)로 한눈에 보이게** 한다. 디자인 프롬프트는 이 정의를 받아 화면 구성 요소와 예시 데이터를 채운다.

## 1. 결정 (2026-10-29 사용자 확인)
- '데이터 라벨링' = **화면 데이터 항목 · 필드 정의**. 분석 이벤트 태깅 · 데이터 흐름도는 이번에 넣지 않는다
- **새 문서 단계** `data`(데이터 구성)로 둔다 (기능명세 확장 X). 순서 `기능명세 → 데이터 구성 → 디자인 프롬프트`
- 개발 프롬프트는 지금처럼 기능명세에서 만든다 (데이터 구성을 받지 않음)
- 구성도는 AI가 엔티티 · 관계를 JSON으로 주고 **코드가 mermaid `erDiagram`으로 렌더**. 앱 문서 탭에서 **그림으로** 보이고, md 파일에는 mermaid 텍스트가 그대로 남는다 (Notion · GitHub에 붙이면 그림)
- PR 1개 (400줄 / 15파일 안, lockfile 제외)

## 2. 함께 나온 다른 요청 — 따로 스펙 (순서만 정함)
사용자가 같은 대화에서 더 말한 것. 각각 독립이라 이 스펙에 넣지 않고 하나씩 스펙 → 구현한다.
1. **② 생성 중 로딩 애니메이션** — `claude -p`가 문서를 만드는 수십 초 동안 단계별 짧은 애니메이션 (Remotion Player 후보)
2. **③ 직군별 프롬프트 분리 + 직군 아이콘** — 개발 · 디자인 · 마케팅 등으로 프롬프트를 나누고 직군을 이모지 · 짧은 Remotion 애니메이션 배지로 표시
3. **④ 와이어프레임 직접 생성** — 디자인 프롬프트 글이 아니라 저충실도 와이어프레임 그림(SVG 등)을 앱이 그림. 이번 데이터 구성의 필드 · 예시값이 입력이 된다

## 3. 체인 · 저장
`src/lib/storage/types.ts`
```ts
export type DocKey = 'plan' | 'roadmap' | 'prd' | 'spec' | 'data' | 'dev-prompt' | 'design-prompt';

export const DOC_STEPS = [
  { key: 'plan', label: '기획안', file: 'plan.md', from: 'idea' },
  { key: 'roadmap', label: '개발 로드맵', file: 'roadmap.md', from: 'plan' },
  { key: 'prd', label: 'PRD', file: 'prd.md', from: 'roadmap' },
  { key: 'spec', label: '기능명세', file: 'spec.md', from: 'prd' },
  { key: 'data', label: '데이터 구성', file: 'data.md', from: 'spec' },        // 새로
  { key: 'dev-prompt', label: '개발 프롬프트', file: 'dev-prompt.md', from: 'spec' },
  { key: 'design-prompt', label: '디자인 프롬프트', file: 'design-prompt.md', from: 'data' }, // spec → data
];
```
- `design-prompt` 단계는 `extra: ['spec']` — 화면 목록 · 동작은 기능명세에서, 필드 · 예시값은 데이터 구성에서 받는다
- 탭 순서 · 요약 판 "다음 행동" · 진행률은 `DOC_STEPS`를 돌므로 코드 변경 없이 따라온다 (테스트의 단계 수만 6 → 7)
- `DOC_FILE_VERSION`은 그대로. 새 파일이 하나 생길 뿐 기존 파일 형식은 안 바뀐다

**기존 아이디어 (data.md 없음)**
- 기존 디자인 프롬프트: stale 계산은 앞 문서(`data`)가 없으면 false (`docs.ts` 현재 로직) → 경고 안 뜸, 내용 그대로 보임
- 디자인 프롬프트를 다시 만들면 앞 문서가 없어 기존 메시지 "앞 문서를 먼저 만들어 주세요."가 뜬다. 데이터 구성 탭은 "만들기" 상태로 보인다
- 마이그레이션 없음

## 4. AI 출력 스키마 — `src/lib/chain/steps/data.ts`
mermaid 식별자에 한국어를 쓰면 깨지므로, 엔티티 · 필드마다 **영문 key**(개발에도 그대로 쓰는 이름)와 **한국어 이름**을 같이 받는다.
```ts
const key = z.string().regex(/^[a-z][a-z0-9_]*$/); // snake_case

const field = z.object({
  key,
  name: z.string().min(1),                 // 화면에 보이는 이름 (한국어)
  type: z.enum(['text', 'number', 'boolean', 'date', 'enum', 'file', 'ref']),
  required: z.boolean(),
  example: z.string(),                     // 와이어프레임에 넣을 예시값. 근거 없으면 [확인 필요: …]
  screens: z.array(z.string()),            // 이 필드를 보여 주거나 입력받는 화면 (기능명세 화면 이름)
});

export const dataSchema = z
  .object({
    entities: z.array(z.object({ key, name: z.string().min(1), description: z.string().min(1), fields: z.array(field).min(1) })).min(1),
    relations: z.array(z.object({ from: key, to: key, kind: z.enum(['1:1', '1:N', 'N:M']), label: z.string().min(1) })),
    openQuestions: z.array(z.string()),
  })
  .superRefine(/* ① 엔티티 key 중복 X ② 엔티티 안 필드 key 중복 X ③ relation from · to가 엔티티 key에 있음 */);
```
- 검사 실패는 다른 단계와 같이 `ChainError` 한국어 한 줄 (generate.ts 공통 처리). 새 메시지는 만들지 않는다
- `toClaudeSchema`로 JSON 스키마를 만들 때 `superRefine`은 빠지므로, 관계 규칙은 프롬프트에도 한 줄 적는다 (§6)

## 5. md 렌더
~~~md
## 구성도
```mermaid
erDiagram
  user["사용자"] {
    text nickname "닉네임 · 필수"
    date joined_at "가입일"
  }
  post["게시글"] { … }
  user ||--o{ post : "작성한다"
```

## 엔티티
### 사용자 (`user`)
설명 한 줄

- **닉네임** `nickname` · text · 필수 · 예: 슈퍼PO · 화면: 홈, 프로필
- **가입일** `joined_at` · date · 선택 · 예: 2026-10-29 · 화면: 프로필

## 관계
- 사용자 1:N 게시글 — 작성한다

## 확인 필요
- …
~~~
- 관계 기호: `1:1` → `||--||`, `1:N` → `||--o{`, `N:M` → `}o--o{`
- mermaid 안의 라벨 · 주석 문자열은 `"`를 `'`로 바꾼다 (문자열 깨짐 방지). 엔티티 별칭(`key["이름"]`)은 mermaid 10.5+ 문법
- 화면이 없으면 `화면: -`, 관계가 없으면 `- 없음`, 확인 필요가 없으면 `- 없음` (다른 단계와 같은 꼴)
- 표 대신 목록: 지금 `doc-markdown`에 표 플러그인(remark-gfm)이 없다. 표가 필요해지는 단계가 2개를 넘으면 remark-gfm을 넣고 표로 바꾼다

## 6. 프롬프트
`src/lib/prompts/chain/data.ts` — `DATA_PROMPT`
```
## 할 일
기능명세의 화면 · 기능 · 데이터 항목을 와이어프레임 전에 쓸 데이터 구성으로 정리한다.
- entities: 저장하거나 화면에 보이는 데이터 묶음. key는 영문 snake_case, name은 한국어
- fields: 엔티티마다 key · name · type · required · example · screens. 기능명세의 화면 구성 요소가 모두 어떤 필드에 연결되게 한다
- example: 와이어프레임에 그대로 넣을 실제 같은 예시값. 근거가 없으면 [확인 필요: ○○]
- screens: 기능명세의 화면 이름을 그대로 쓴다
- relations: from · to는 entities의 key만 쓴다. kind는 1:1 · 1:N · N:M
- openQuestions: 보관 기간 · 개인정보 · 필수 여부처럼 정해야 하는 것
```
`DESIGN_PROMPT_PROMPT`에 한 줄 추가: "- 데이터 구성의 필드 이름 · 예시값을 화면 구성 요소와 예시 데이터로 쓴다 (지어낸 값 대신)". `ai-usage/prompts.md` §5에 두 줄 기록.

## 7. 화면 — mermaid 그림
- `src/app/_components/doc-markdown.tsx`의 `Pre`: `lang === 'mermaid'`면 `MermaidBlock`, 아니면 지금처럼 `CodeBlock`
- `src/app/_components/mermaid-block.tsx` (새, client)
  - `useEffect`에서 `await import('mermaid')` → `initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })` → `render(id, code)` → SVG를 넣는다
  - 그리는 중: 코드 블록 자리에 같은 높이 회색 상자. 실패하면 `CodeBlock`(lang `mermaid`)으로 대신 보여 준다 — 복사는 그대로 됨
  - 아래에 "구성도 코드 복사" 텍스트 버튼 (Notion · GitHub에 붙이는 용도)
- `code-block.tsx`의 `LABELS`에 `mermaid: '구성도'`
- 의존성: `mermaid` (^11). 화면에서만 동적 import라 서버 번들 · 첫 로딩에 안 들어간다
- 데모 모드: 읽기 화면은 같은 컴포넌트라 그대로 그림이 보인다

## 8. 테스트
- `steps/data.test.ts`: ① 렌더 — 구성도 블록 · 엔티티 목록 · 관계 기호 3종 · 빈 관계 `- 없음` ② 스키마 — relation이 없는 엔티티를 가리키면 실패, key 중복 실패, 한국어 key 실패 ③ 라벨의 `"`가 `'`로 바뀜
- `generate.test.ts`: GENERATABLE = DOC_STEPS 7개. design-prompt가 data 없이 만들면 "앞 문서를 먼저 만들어 주세요."
- `first-tab.test.ts` · `progress.test.ts` · summary 테스트: 단계 수 · 다음 행동 순서(spec 다음 data)에 맞춰 수정
- mermaid 그림은 단위 테스트 없이 로컬 dev 화면에서 확인 (그림 · 실패 시 코드 블록 · 복사)
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

## 9. 기록
- `docs/decisions/2026-10-29_데이터-구성-단계.md` — 왜 새 단계인가(기능명세가 길어지고 와이어프레임 전 확인 지점이 없어서) · 왜 개발 프롬프트는 그대로인가(바뀌는 범위를 반으로, 개발 프롬프트를 손볼 때 같이) · 왜 영문 key를 AI가 주나(mermaid 식별자 + 개발에서 그대로 씀). README 표에 한 줄
- `src/lib/chain/CLAUDE.md` 체인 줄 · "6단계" 문구 갱신

## 10. 하지 않는 것
- 분석 이벤트 태깅 · 데이터 흐름도
- 개발 프롬프트 입력 변경
- 구성도 직접 편집 (문서 편집은 지금처럼 md 텍스트 편집)
- 표 렌더(remark-gfm)
