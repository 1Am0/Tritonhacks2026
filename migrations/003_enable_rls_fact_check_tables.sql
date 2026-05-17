-- Migration: enable RLS and add permissive policies for fact-check tables
-- WARNING: These policies are permissive to allow client inserts using anon key for development.
-- For production, restrict inserts to authenticated users or use a server-side function with service_role key.

-- Enable RLS for requests table
ALTER TABLE IF EXISTS public.debate_fact_check_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select
CREATE POLICY "Allow select public" ON public.debate_fact_check_requests
  FOR SELECT USING (true);

-- Allow inserts from anon or authenticated (development convenience)
CREATE POLICY "Allow insert anon_or_auth" ON public.debate_fact_check_requests
  FOR INSERT WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- Enable RLS for fact checks table
ALTER TABLE IF EXISTS public.debate_fact_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select public" ON public.debate_fact_checks
  FOR SELECT USING (true);

CREATE POLICY "Allow insert anon_or_auth" ON public.debate_fact_checks
  FOR INSERT WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- Allow updates for the checker or allow broader update (dev)
CREATE POLICY "Allow update anon_or_auth" ON public.debate_fact_checks
  FOR UPDATE USING (auth.role() = 'anon' OR auth.role() = 'authenticated') WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- NOTE: Replace these policies with stricter rules before deploying to production.
