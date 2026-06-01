-- =========================================================================
-- FIX: member_count default, server_mutes table, mute RLS, ban policies,
--      remove theme_config, fix existing member_counts
-- =========================================================================

-- 1. Fix member_count DEFAULT (was 1, trigger adds another → 2)
ALTER TABLE public.servers ALTER COLUMN member_count SET DEFAULT 0;

-- 2. Fix existing servers with wrong member_count (old DEFAULT 1 + bump trigger = 2)
UPDATE public.servers s
SET member_count = (SELECT count(*) FROM public.server_members WHERE server_id = s.id)
WHERE member_count != (SELECT count(*) FROM public.server_members WHERE server_id = s.id);

-- 3. Remove theme_config column (theme system removed)
ALTER TABLE public.servers DROP COLUMN IF EXISTS theme_config;

-- 4. Create server_mutes table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.server_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(server_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.server_mutes TO authenticated;
GRANT ALL ON public.server_mutes TO service_role;
ALTER TABLE public.server_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutes_select_member" ON public.server_mutes;
CREATE POLICY "mutes_select_member" ON public.server_mutes FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "mutes_manage_mod" ON public.server_mutes;
CREATE POLICY "mutes_manage_mod" ON public.server_mutes FOR INSERT TO authenticated
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70);
DROP POLICY IF EXISTS "mutes_delete_mod" ON public.server_mutes;
CREATE POLICY "mutes_delete_mod" ON public.server_mutes FOR DELETE TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70);

-- 5. Create/replace is_muted helper function
CREATE OR REPLACE FUNCTION public.is_muted(_server UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_mutes
    WHERE server_id = _server AND user_id = _user
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 6. Fix message INSERT policy to block muted users
DROP POLICY IF EXISTS "msg_insert_member" ON public.messages;
CREATE POLICY "msg_insert_member" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND
              EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
                      AND public.is_server_member(c.server_id, auth.uid())
                      AND NOT public.is_muted(c.server_id, auth.uid())));

-- 7. Ensure server_bans table exists with proper policies
CREATE TABLE IF NOT EXISTS public.server_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.server_bans TO authenticated;
GRANT ALL ON public.server_bans TO service_role;
ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bans_select_member" ON public.server_bans;
CREATE POLICY "bans_select_member" ON public.server_bans FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "bans_manage_mod" ON public.server_bans;
CREATE POLICY "bans_manage_mod" ON public.server_bans FOR INSERT TO authenticated
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70);
DROP POLICY IF EXISTS "bans_insert_mod" ON public.server_bans;
DROP POLICY IF EXISTS "bans_select_mod" ON public.server_bans;
DROP POLICY IF EXISTS "bans_delete_mod" ON public.server_bans;
CREATE POLICY "bans_delete_mod" ON public.server_bans FOR DELETE TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70);

-- 8. Add server_bans and server_mutes to realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.server_bans;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.server_mutes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
