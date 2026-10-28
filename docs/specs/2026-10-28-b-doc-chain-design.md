# B. 문서 생성 체인 설계 (2026-10-28) · 이슈 #5 #6 #7

아이디어 → 기획안 → 개발 로드맵 → PRD → 기능명세 → 개발/디자인 프롬프트를 **맥의 `claude -p`**로 한 단계씩 만든다.

## 1. 실행 환경 (A에서 바뀐 점)

```
브라우저(맥 · 휴대폰 → Tailscale Serve https://<맥>.<tailnet>.ts.net)
  └▶ 맥의 Next 서버 ─ Server Action ─▶ src/lib/claude/run.ts ─ claude -p
                      └▶ src/lib/storage (~/Hatch md)
```
- Next 서버가 맥에서 돌아 `claude`를 직접 실행한다 → **별도 bridge 서버 · 토큰 · CORS 없음**
- Chrome Private Network Access 문제는 생기지 않는다 (공개 사이트 → 100.x 요청이 없음)
- `bridge/`는 **보류**. 갈아탈 신호: 맥이 꺼져 있어도 써야 함 / 다른 사람도 씀 / Vercel 배포 필요 → 작업 대기열 + 맥 워커
- 접속 범위는 tailnet(내 기기)만. Funnel(공개)은 쓰지 않는다

## 2. claude 실행 (`src/lib/claude/run.ts`, 서버 전용)

- `runClaude({ prompt, jsonSchema }): Promise<unknown>` — 성공 시 `structured_output` 반환
- 명령: `claude -p --output-format json --json-schema <schema> --tools "" --no-session-persistence` (+ `--model $HATCH_CLAUDE_MODEL` 있으면). 프롬프트는 stdin
- 실행 파일 `HATCH_CLAUDE_BIN` (기본 `claude`). 테스트는 가짜 스크립트로 바꾼다
- 동시 실행 1개 (모듈 안 잠금 + `.running.json`), 5분 넘으면 프로세스 종료
- 작업 폴더: 빈 임시 폴더 (프로젝트 CLAUDE.md를 읽지 않게)
- 확인 항목: 사용자 전역 `~/.claude/CLAUDE.md`가 함께 읽히는지 B-1에서 확인. 읽히면 `--system-prompt`로 기본 지시를 바꾸거나 `--setting-sources` 조정
- 2026-10-28 실험: 짧은 입력 + 스키마 1칸으로 약 17초, `structured_output`에 결과가 담겨 옴

## 3. 체인 단계

| key | 이름 | 입력 | 파일 |
| --- | --- | --- | --- |
| `plan` | 기획안 | 아이디어(제목 · 메모) | plan.md |
| `roadmap` | 개발 로드맵 | 기획안 | roadmap.md |
| `prd` | PRD | 로드맵 (+ 기획안) | prd.md |
| `spec` | 기능명세 | PRD | spec.md |
| `dev-prompt` | 개발 프롬프트 | 기능명세 | dev-prompt.md |
| `design-prompt` | 디자인 프롬프트 | 기능명세 | design-prompt.md |

- "커리큘럼"은 **개발 로드맵**으로 확정 (MVP → 확장 마일스톤). PRD는 로드맵의 MVP 범위만 다룬다
- `DocKey`의 `curriculum` → `roadmap`, 파일 `roadmap.md`. 아직 실제 데이터가 없어 변환은 하지 않는다
- 입력은 **사람이 고친 뒤의 md 본문**(머리말 제외). 앞 문서가 없으면 그 단계는 만들 수 없다

### 단계 파일 형식 (`src/lib/chain/steps/<key>.ts`)
```ts
type ChainStep<T> = {
  key: DocKey;
  from: DocKey | 'idea';      // 앞 단계
  extra?: DocKey[];           // 함께 넣는 문서 (prd ← plan)
  schema: z.ZodType<T>;       // 출력 형식. JSON Schema는 z.toJSONSchema(schema)
  prompt: string;             // src/lib/prompts/chain/<key>.ts 의 상수
  render: (out: T) => string; // md 문서로 (코드가 만든다)
};
```
- 체인 순서 목록: `src/lib/chain/index.ts` 의 `CHAIN` 배열 하나. `DOC_STEPS` 순서와 같다
- 프롬프트 조립(상황 블록 + 입력 문서 + 단계 지시)은 `src/lib/chain/build-prompt.ts`. 문장은 `src/lib/prompts/`에만
- 각 단계 출력의 칸 (B-1은 plan, 나머지는 B-2에서 이 칸 그대로):
  - plan: 한 줄 요약 · 문제 · 대상 사용자 · 핵심 가치 · 주요 기능(이름 · 설명) · 성공 지표 · 위험 · 확인 필요
  - roadmap: 마일스톤(이름 · 목표 · 범위 · 완료 기준) 배열, 첫 마일스톤 = MVP · 제외 범위
  - prd: 배경 · 목표/비목표 · 사용자 스토리 · 요구사항(id · 내용 · 우선순위) · 지표 · 출시 범위
  - spec: 화면(이름 · 요소 · 동작) · 기능(id · 입력 · 처리 · 출력 · 예외) · 데이터 항목
  - dev-prompt: 개발 에이전트에게 줄 프롬프트 본문 · 기술 가정 · 작업 순서
  - design-prompt: 디자인 도구에 줄 프롬프트 본문 · 화면 목록 · 톤 · 참고 패턴
- 모르는 사실은 지어내지 않고 `[확인 필요: ○○]` (프롬프트 규칙)

## 4. 저장 (`src/lib/storage/` 확장, 기존 함수 모양 유지)

- 문서 md 머리말: `generatedAt` · `sourceHash`(입력 문서 본문 sha256 앞 12자) · `version: 1`
- `saveDoc(id, key, body, { sourceHash }): void` — 이전 판이 있으면 `<id>/.history/<key>-<시각>.md`로 옮긴 뒤 저장
- `updateDocBody(id, key, body): void` — 사람이 편집. 머리말 유지, 이전 판은 `.history/`로
- `getDocs(id)` 의 `Doc`에 `stale: boolean` 추가 — 저장된 `sourceHash` ≠ 지금 앞 문서 해시
  (사람이 쓴 문서처럼 머리말이 없으면 `stale: false`)
- 생성 중 표시: `<id>/.running.json` `{ key, startedAt }`. 10분 넘으면 무시. 끝나면(성공 · 실패) 지운다
- 지우는 동작 없음. 덮어쓸 때는 항상 `.history/`로

## 5. 화면 (`/ideas/[id]` 문서 6칸)

| 상태 | 보이는 것 |
| --- | --- |
| 문서 없음 · 앞 문서 있음 | "만들기" 버튼 |
| 문서 없음 · 앞 문서 없음 | 비활성 "앞 문서 먼저" |
| 만드는 중 | 진행 표시 · 다른 칸 버튼 막음. 새로고침해도 유지 (`.running.json`, 3초마다 새로고침) |
| 문서 있음 | 마크다운 렌더(react-markdown) · "편집"(TextArea → 저장) · "다시 만들기"(확인 창) |
| 앞 문서가 바뀜 | 배지 "앞 문서가 바뀌었어요" |

- 생성은 Server Action `generateDocAction(id, key)`: 앞 문서 읽기 → 프롬프트 조립 → `runClaude` → zod 검사 → render → `saveDoc`
- 진행 배지(모음 화면)는 A 그대로 동작

## 6. 오류 (`ChainError`, 화면에 한국어 한 줄)

| 원인 | 문구 |
| --- | --- |
| 실행 파일 없음 | claude를 찾을 수 없어요. Claude Code가 설치돼 있는지 확인해 주세요. |
| 로그인 안 됨 · `is_error` | Claude 실행에 실패했어요. 터미널에서 `claude`를 한 번 실행해 로그인 상태를 확인해 주세요. |
| 5분 초과 | 5분 안에 끝나지 않았어요. 다시 만들어 주세요. |
| 형식 불일치 (zod 실패) | 결과 형식이 맞지 않아요. 다시 만들어 주세요. |
| 다른 문서 생성 중 | 다른 문서를 만드는 중이에요. 끝난 뒤 다시 눌러 주세요. |
| 앞 문서 없음 | 앞 문서를 먼저 만들어 주세요. |

- 원문 오류(stderr)는 서버 로그에만, 프롬프트 본문은 로그에 남기지 않는다

## 7. 테스트

- 단계마다: 정상 예시 통과 · 필수 칸 누락 실패 · `render` 결과에 제목 칸 포함
- `run.ts`: `HATCH_CLAUDE_BIN`에 가짜 스크립트 — 성공 · `is_error` · 비정상 종료 · 시간 초과 · 동시 실행 거부
- storage: `saveDoc` 이력 이동 · `stale` 계산 · `.running.json` 만료
- 실제 생성: 브라우저에서 아이디어 하나로 기획안 → … → 프롬프트까지 (B-2 끝에서)

## 8. 작업 나누기

| 이슈 | 내용 |
| --- | --- |
| #5 B-1 | run.ts · 단계 형식 · build-prompt · storage 확장 · 상세 화면 · plan 단계 · roadmap 이름 변경 · zod/react-markdown 추가 |
| #6 B-2 | roadmap · prd · spec · dev-prompt · design-prompt 단계 + 프롬프트 (`chain-author` 서브에이전트 병렬) |
| #7 B-3 | `tailscale serve` 접속 · Server Action Origin(`serverActions.allowedOrigins`) 확인 · README · bridge 보류 표시 · `chain-step` 스킬 경로 갱신 |

## 9. 범위 밖

체인 한 번에 끝까지 실행 · 생성 중 실시간 글자 흐름(stream) · 문서 이력 화면 · Vercel 배포 · PO 도구(C)
