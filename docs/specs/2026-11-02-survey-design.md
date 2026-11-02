# 사용자 테스트 설문을 웹에서 받기 설계 (2026-11-02)

이슈 #71 (refs #63). 사용자 요청: "설문을 웹페이지에서 받으면 안 돼? Vercel에 주소 이어서", "Supabase 연결하자".
문항은 `docs/user-test/form.md`(#70)를 그대로 쓴다.

## 1. 결정 (2026-11-02 사용자 확인)
- 주소 `/survey` 하나. 네비바에는 넣지 않고 진행자가 주소나 QR로 알려 준다
- 저장은 Supabase 표 하나 `survey_responses`. 사용자가 Supabase 프로젝트를 새로 만들었다
- 환경 변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (서버 전용). 로컬 `.env.local`과 Vercel Production에 사용자가 넣었다
- 데모(읽기 전용)에서도 설문 제출만은 연다. Hatch 파일은 건드리지 않고 Supabase에만 쓴다
- 결과 화면은 만들지 않는다. Supabase 대시보드에서 보고 CSV로 내려받는다

## 2. 표

`supabase/survey.sql`에 두고 사용자가 Supabase SQL 편집기에서 한 번 실행한다.

```sql
create table if not exists public.survey_responses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  participant text not null check (participant in ('P1','P2','P3','P4','P5')),
  version int not null,
  answers jsonb not null
);
alter table public.survey_responses enable row level security;
-- 공개 규칙(policy)을 만들지 않는다: anon, authenticated는 읽기도 쓰기도 못 한다. 서버의 비밀 키만 쓴다
```

- `version`: 문항 판 번호. 문항을 고치면 올린다. 표는 그대로 둔다
- `answers`: 문항 id → 답. 그리드는 과제 번호 → 답, 체크박스는 배열

## 3. 코드

| 파일 | 하는 일 |
| --- | --- |
| `src/lib/survey/questions.ts` | 문항 정의(구역, id, 유형, 선택지, 필수) + `SURVEY_VERSION`. form.md와 같은 내용 |
| `src/lib/survey/schema.ts` | 문항 정의에서 zod 스키마를 만든다. 필수 칸, 선택지 밖 값, 글자 수(단답 200자, 장문 2,000자) 검사 |
| `src/lib/survey/store.ts` | `server-only`. `isSurveyReady()`(환경 변수 둘 다 있나), `saveResponse()`: Supabase REST `POST /rest/v1/survey_responses`에 `fetch`. 의존성(supabase-js)은 넣지 않는다 |
| `src/app/survey/page.tsx`, `survey-form.tsx` | Montage 폼. 연결이 없으면 안내 문구와 막힌 제출 버튼 |
| `src/app/survey/actions.ts` | Server Action: 검사 → 저장 → `/survey/done`으로 이동. 실패하면 입력을 되살리고 오류 문구 |
| `src/app/survey/done/page.tsx` | 감사 문구 |

- 비밀 키 요청 머리: `sb_secret_`로 시작하면 `apikey`만, JWT면 `apikey`와 `Authorization: Bearer` 둘 다
- 레이아웃: 설문은 참가자가 휴대폰으로도 연다. 네비바 없이 가운데 한 열(최대 640px)로 둔다
- 화면 문구에 가운데 점을 쓰지 않는다

## 4. 오류
| 상황 | 화면 |
| --- | --- |
| 환경 변수 없음 | "설문 저장소가 연결되지 않았어요. 진행자에게 알려 주세요." 제출 버튼 막힘 |
| 필수 칸 빠짐, 값 이상 | 칸 옆에 문구, 입력 유지 |
| Supabase가 2xx가 아님, 네트워크 오류 | "저장하지 못했어요. 잠시 뒤 다시 제출해 주세요." 입력 유지. 응답 본문은 서버 로그에만 |

## 5. 테스트
- schema: 필수 누락, 선택지 밖 값, 글자 수 초과, 정상 응답
- store: `fetch`를 가짜로 바꿔 요청 주소, 머리(키 종류별), 본문 확인. 환경 변수 없을 때 `isSurveyReady()` false
- 화면: 로컬 dev에서 제출 → Supabase 대시보드에 한 줄 생기는지 (실제 쓰기 1회, P5로 넣고 확인 뒤 사용자가 지운다)

## 6. 하지 않는 것 (다시 볼 신호)
- 결과 화면: 참가자가 5명을 넘거나 같은 분석을 세 번 넘게 손으로 하면 만든다
- 스팸 막기(캡차, 횟수 제한): 이상한 응답이 실제로 들어오면 넣는다
- 참가자 번호 P6 이상: 참가자가 늘면 check 제약과 선택지를 같이 늘린다
