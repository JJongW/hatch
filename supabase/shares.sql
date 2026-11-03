-- 공유 링크 사본 (#117, spec 2026-11-03-hosted-po-design §3-5). Supabase SQL 편집기에서 한 번 실행한다. 다시 실행해도 안전하다
-- 토큰 원문은 저장하지 않는다. SHA-256 해시(hex)만 둔다
create table if not exists public.hatch_shares (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  idea_id text not null,
  payload jsonb,                       -- 공유를 끄면 null (묘비)
  published_at bigint not null,        -- 맥이 서명한 시각(ms). 이보다 오래된 요청은 거절
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.hatch_shares enable row level security;
-- 공개 규칙(policy)을 만들지 않는다: 서버의 비밀 키만 읽고 쓴다. 기본 권한도 걷어 RLS 하나에만 기대지 않는다
revoke all on table public.hatch_shares from anon, authenticated;

-- 올리기: 묘비가 있거나 더 새 판이 있으면 false. 판단을 한 문장에서 해서 동시 요청에도 안전하다
create or replace function public.put_hatch_share(p_token_hash text, p_idea_id text, p_payload jsonb, p_at bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.hatch_shares as s (token_hash, idea_id, payload, published_at)
  values (p_token_hash, p_idea_id, p_payload, p_at)
  on conflict (token_hash) do update
    set payload = excluded.payload, idea_id = excluded.idea_id, published_at = excluded.published_at, updated_at = now()
    where s.deleted_at is null and s.published_at < excluded.published_at;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- 끄기: 내용을 지우고 해시와 시각만 남긴다 (같은 토큰으로 다시 못 올리게)
create or replace function public.delete_hatch_share(p_token_hash text, p_at bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.hatch_shares as s (token_hash, idea_id, payload, published_at, deleted_at)
  values (p_token_hash, '', null, p_at, now())
  on conflict (token_hash) do update set payload = null, deleted_at = coalesce(s.deleted_at, now()), updated_at = now();
end $$;

revoke all on function public.put_hatch_share(text, text, jsonb, bigint) from public, anon, authenticated;
revoke all on function public.delete_hatch_share(text, bigint) from public, anon, authenticated;
