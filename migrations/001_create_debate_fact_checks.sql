-- Migration: create debate_fact_checks table
-- Columns:
-- id (serial pk), topic (text), message_id (text), verdict (boolean), reason (text), checked_by_session_id (text), checked_at (timestamptz), message_count (integer)
-- Unique constraint on (topic, message_id)

CREATE TABLE IF NOT EXISTS public.debate_fact_checks (
  id bigserial PRIMARY KEY,
  topic text NOT NULL,
  message_id text NOT NULL,
  verdict boolean NOT NULL,
  reason text,
  checked_by_session_id text,
  checked_at timestamptz DEFAULT now(),
  message_count integer DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS debate_fact_checks_topic_message_idx ON public.debate_fact_checks ((topic), (message_id));
