alter table public.debate_messages
add column if not exists session_id text;

create index if not exists debate_messages_session_id_idx
on public.debate_messages (session_id);
