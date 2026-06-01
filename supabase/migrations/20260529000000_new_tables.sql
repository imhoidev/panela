-- =========================================================================
-- PANELA — Novas tabelas: invites, bans, reports, xp, logs
-- =========================================================================

-- ============ INVITES ============
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_member" ON public.invites FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "invites_insert_manage" ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 50);
CREATE POLICY "invites_delete_manage" ON public.invites FOR DELETE TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 50);

-- ============ SERVER BANS ============
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

CREATE POLICY "bans_select_mod" ON public.server_bans FOR SELECT TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70);
CREATE POLICY "bans_insert_mod" ON public.server_bans FOR INSERT TO authenticated
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70);
CREATE POLICY "bans_delete_mod" ON public.server_bans FOR DELETE TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70);

-- ============ MODERATION REPORTS ============
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_reports TO service_role;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_self" ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());
CREATE POLICY "reports_select_staff" ON public.moderation_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coo') OR public.has_role(auth.uid(), 'ceo'));

-- ============ MODERATION LOGS ============
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mod_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  duration_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_logs TO authenticated;
GRANT ALL ON public.moderation_logs TO service_role;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_mod" ON public.moderation_logs FOR SELECT TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70);

-- ============ SERVER XP ============
CREATE TABLE IF NOT EXISTS public.server_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.server_xp TO authenticated;
GRANT ALL ON public.server_xp TO service_role;
ALTER TABLE public.server_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_select_member" ON public.server_xp FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "xp_insert_update_self" ON public.server_xp FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "xp_update_self" ON public.server_xp FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: add XP when message is inserted
CREATE OR REPLACE FUNCTION public.grant_xp_for_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_xp (server_id, user_id, xp)
  SELECT c.server_id, NEW.author_id, 1
  FROM public.channels c WHERE c.id = NEW.channel_id
  ON CONFLICT (server_id, user_id) DO UPDATE
  SET xp = server_xp.xp + 1, updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_message_xp AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.grant_xp_for_message();

-- ============ INVITE ACCEPT FUNCTION ============
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.invites;
  _server_id UUID;
  banned BOOLEAN;
BEGIN
  SELECT * INTO inv FROM public.invites WHERE code = invite_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'convite_invalido'; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'convite_expirado';
  END IF;
  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RAISE EXCEPTION 'convite_esgotado';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.server_bans WHERE server_id = inv.server_id AND user_id = auth.uid())
    INTO banned;
  IF banned THEN RAISE EXCEPTION 'banido'; END IF;
  INSERT INTO public.server_members (server_id, user_id, level)
    VALUES (inv.server_id, auth.uid(), 1)
    ON CONFLICT (server_id, user_id) DO NOTHING;
  UPDATE public.invites SET use_count = use_count + 1 WHERE id = inv.id;
  RETURN inv.server_id;
END; $$;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_xp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_events;
