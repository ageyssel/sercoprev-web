begin;

create table if not exists public.staff_mfa_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  challenge_token_hash text not null unique,
  user_agent_hash text not null,
  ip_hash text,
  attempts smallint not null default 0 check (attempts >= 0 and attempts <= 10),
  max_attempts smallint not null default 5 check (max_attempts between 1 and 10),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  constraint staff_mfa_challenges_expiry_check check (expires_at > created_at)
);

create index if not exists staff_mfa_challenges_user_created_idx
  on public.staff_mfa_challenges(user_id, created_at desc);
create index if not exists staff_mfa_challenges_active_idx
  on public.staff_mfa_challenges(user_id, expires_at desc)
  where consumed_at is null;

alter table public.staff_mfa_challenges enable row level security;
revoke all on table public.staff_mfa_challenges from public, anon, authenticated;

create table if not exists public.staff_mfa_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  user_agent_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint staff_mfa_sessions_expiry_check check (expires_at > created_at)
);

create index if not exists staff_mfa_sessions_user_expiry_idx
  on public.staff_mfa_sessions(user_id, expires_at desc);
create index if not exists staff_mfa_sessions_active_idx
  on public.staff_mfa_sessions(user_id, expires_at desc)
  where revoked_at is null;

alter table public.staff_mfa_sessions enable row level security;
revoke all on table public.staff_mfa_sessions from public, anon, authenticated;

comment on table public.staff_mfa_challenges is 'Desafíos de segundo factor por correo para usuarios internos de SERCOPREV. Los códigos se almacenan exclusivamente como HMAC.';
comment on table public.staff_mfa_sessions is 'Autorizaciones internas verificadas por segundo factor, vinculadas al usuario y navegador, con vigencia máxima de 24 horas.';

commit;
