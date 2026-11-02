-- 사용자 테스트 설문 응답 (#71). Supabase SQL 편집기에서 한 번 실행한다. 다시 실행해도 안전하다
create table if not exists public.survey_responses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  participant text not null check (participant in ('P1','P2','P3','P4','P5')),
  version int not null,
  answers jsonb not null
);
alter table public.survey_responses enable row level security;
-- 공개 규칙(policy)을 만들지 않는다: anon, authenticated는 읽기도 쓰기도 못 한다. 서버의 비밀 키만 쓴다
