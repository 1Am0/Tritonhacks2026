-- Shared AI review request lock table.
-- One row per topic + 10-message milestone.
-- The client inserts a row to claim a review slot; other clients see it and wait for the next milestone.

CREATE TABLE IF NOT EXISTS public.debate_ai_requests (
    topic text NOT NULL,
    message_count integer NOT NULL,
    requested_by_session_id text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (topic, message_count)
);

ALTER TABLE public.debate_ai_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'debate_ai_requests'
          AND policyname = 'Allow read access to AI request locks'
    ) THEN
        CREATE POLICY "Allow read access to AI request locks"
            ON public.debate_ai_requests
            FOR SELECT
            USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'debate_ai_requests'
          AND policyname = 'Allow insert access to AI request locks'
    ) THEN
        CREATE POLICY "Allow insert access to AI request locks"
            ON public.debate_ai_requests
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'debate_ai_requests'
          AND policyname = 'Allow update access to AI request locks'
    ) THEN
        CREATE POLICY "Allow update access to AI request locks"
            ON public.debate_ai_requests
            FOR UPDATE
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'debate_ai_requests'
          AND policyname = 'Allow delete access to AI request locks'
    ) THEN
        CREATE POLICY "Allow delete access to AI request locks"
            ON public.debate_ai_requests
            FOR DELETE
            USING (true);
    END IF;
END $$;

-- Realtime publication helper.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'debate_ai_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_ai_requests;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;
