-- =========================================================================
-- PANELA — Migration: Pinned Messages, Permissions Helper & Moderation Enhancements
-- =========================================================================

-- 1. Add pinned message columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Helper function: check granular permission or ownership/admin level
CREATE OR REPLACE FUNCTION public.has_server_permission(_server UUID, _user UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_owner BOOLEAN;
  _level INTEGER;
  _has_perm BOOLEAN;
BEGIN
  IF _user IS NULL OR _server IS NULL THEN RETURN FALSE; END IF;

  -- Check if user is owner of the server
  SELECT (owner_id = _user) INTO _is_owner FROM public.servers WHERE id = _server;
  IF _is_owner IS TRUE THEN RETURN TRUE; END IF;

  -- Check member level (90+ is full admin)
  _level := public.server_member_level(_server, _user);
  IF _level >= 90 THEN RETURN TRUE; END IF;

  -- Check JSONB permissions across member's assigned roles
  SELECT EXISTS (
    SELECT 1
    FROM public.server_members sm
    JOIN public.server_member_roles smr ON smr.member_id = sm.id
    JOIN public.server_roles sr ON sr.id = smr.role_id
    WHERE sm.server_id = _server
      AND sm.user_id = _user
      AND (
        (sr.permissions->>'ADMINISTRATE')::boolean IS TRUE OR
        (sr.permissions->>_perm)::boolean IS TRUE
      )
  ) INTO _has_perm;

  RETURN COALESCE(_has_perm, FALSE);
END; $$;

-- Grant permission on function
GRANT EXECUTE ON FUNCTION public.has_server_permission(UUID, UUID, TEXT) TO authenticated, service_role;

-- 3. Policy update for pinned messages (author or mod with MANAGE_MESSAGES / level >= 70 can update message pin state)
DROP POLICY IF EXISTS "msg_update_author_or_mod" ON public.messages;
CREATE POLICY "msg_update_author_or_mod" ON public.messages FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
        AND (
          public.server_member_level(c.server_id, auth.uid()) >= 70 OR
          public.has_server_permission(c.server_id, auth.uid(), 'MANAGE_MESSAGES')
        )
    )
  );

-- 4. Create category management table or helper
CREATE TABLE IF NOT EXISTS public.server_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_categories TO authenticated;
GRANT ALL ON public.server_categories TO service_role;
ALTER TABLE public.server_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_member" ON public.server_categories FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "categories_manage_mod" ON public.server_categories FOR ALL TO authenticated
  USING (
    public.server_member_level(server_id, auth.uid()) >= 70 OR
    public.has_server_permission(server_id, auth.uid(), 'MANAGE_CATEGORIES')
  )
  WITH CHECK (
    public.server_member_level(server_id, auth.uid()) >= 70 OR
    public.has_server_permission(server_id, auth.uid(), 'MANAGE_CATEGORIES')
  );

-- Realtime publication for server_categories
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_categories; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
