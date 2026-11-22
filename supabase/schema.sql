-- Swasth AI schema. Run ONCE in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

create extension if not exists vector;

-- 1) Verified health knowledge (RAG source). Embedding size 768 must match the app.
create table if not exists public.knowledge (
  id           bigserial primary key,
  topic        text   not null,
  content      text   not null,
  source_name  text   not null,
  source_url   text,
  source_date  date,
  language     text   not null default 'en',
  verified     boolean not null default false,   -- bot ONLY uses rows where verified = true
  content_hash text   not null unique,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);
create index if not exists knowledge_embedding_idx
  on public.knowledge using hnsw (embedding vector_cosine_ops);

-- 2) Daily usage counters (per user and one global counter) to stay inside free quotas.
create table if not exists public.usage (
  key   text not null,
  day   date not null,
  count int  not null default 0,
  primary key (key, day)
);

-- 3) Lock the tables: with RLS on and no policies, ONLY the server (service key) can read/write.
alter table public.knowledge enable row level security;
alter table public.usage     enable row level security;

-- 4) Atomic counter. Returns new count, or -1 if the limit was already reached.
create or replace function public.bump_usage(p_key text, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.usage as u (key, day, count) values (p_key, current_date, 1)
  on conflict (key, day) do update set count = u.count + 1
    where u.count < p_limit
  returning u.count into v;
  return coalesce(v, -1);
end $$;

-- 5) Similarity search over VERIFIED rows only.
create or replace function public.match_knowledge(
  query_embedding vector(768),
  match_count int default 4,
  min_similarity float default 0.6,
  p_language text default 'en')
returns table (id bigint, topic text, content text, source_name text,
               source_url text, source_date date, similarity float)
language sql stable security definer set search_path = public as $$
  select k.id, k.topic, k.content, k.source_name, k.source_url, k.source_date,
         (1 - (k.embedding <=> query_embedding))::float as similarity
  from public.knowledge k
  where k.verified = true
    and k.language = p_language
    and k.embedding is not null
    and (1 - (k.embedding <=> query_embedding)) >= min_similarity
  order by k.embedding <=> query_embedding
  limit least(match_count, 8);
$$;

-- 6) Only the server key may call these functions (not browsers/anon users).
revoke all on function public.bump_usage(text, int) from public, anon, authenticated;
revoke all on function public.match_knowledge(vector, int, float, text) from public, anon, authenticated;
grant execute on function public.bump_usage(text, int) to service_role;
grant execute on function public.match_knowledge(vector, int, float, text) to service_role;

-- 7) Triage encounters & reference IDs (Safety, tracking and doctor slip audit).
create table if not exists public.triage_records (
  id           bigserial primary key,
  reference_id text not null unique,
  user_id      uuid,
  complaint    text not null,
  language     text not null default 'en',
  status       text not null default 'AI DIAGNOSED',
  created_at   timestamptz not null default now()
);
create index if not exists triage_records_ref_idx on public.triage_records (reference_id);
create index if not exists triage_records_user_idx on public.triage_records (user_id);
alter table public.triage_records enable row level security;

-- 8) Patient Profiles table (Mandatory Patient Full Name and Age for medical slips)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  age        int  not null check (age >= 1 and age <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
