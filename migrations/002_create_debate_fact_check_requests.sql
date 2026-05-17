-- Migration: create debate_fact_check_requests table for coordinating shared fact-checks
create table if not exists public.debate_fact_check_requests (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  message_count int not null,
  requested_by_session_id text,
  requested_at timestamptz default now()
);

create unique index if not exists debate_fact_check_requests_topic_message_count_idx
  on public.debate_fact_check_requests (topic, message_count);

-- NOTE: In production enable RLS and add policies to allow authenticated inserts only or
-- make inserts via a server-side function using the service_role key.
