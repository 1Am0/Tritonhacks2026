alter table public.debate_topic_presence
  add column if not exists stance text;

alter table public.debate_topic_presence
  drop constraint if exists debate_topic_presence_stance_check;

alter table public.debate_topic_presence
  add constraint debate_topic_presence_stance_check
  check (stance in ('agree', 'disagree') or stance is null);

create index if not exists debate_topic_presence_topic_stance_idx
  on public.debate_topic_presence (topic, stance);

create table if not exists public.debate_ai_results (
  topic text primary key,
  analyzed_message_count integer not null default 0,
  result jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.debate_ai_results
  add column if not exists analyzed_message_count integer not null default 0;

alter table public.debate_ai_results enable row level security;

drop policy if exists "public read debate ai results" on public.debate_ai_results;

create policy "public read debate ai results"
  on public.debate_ai_results
  for select
  using (true);

drop policy if exists "public insert debate ai results" on public.debate_ai_results;

create policy "public insert debate ai results"
  on public.debate_ai_results
  for insert
  with check (true);

drop policy if exists "public update debate ai results" on public.debate_ai_results;

create policy "public update debate ai results"
  on public.debate_ai_results
  for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'realtime_pub'
  ) then
    create publication realtime_pub for table public.debate_ai_results;
  else
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'realtime_pub'
        and schemaname = 'public'
        and tablename = 'debate_ai_results'
    ) then
      alter publication realtime_pub add table public.debate_ai_results;
    end if;
  end if;
end
$$;
