-- =========================================================================
-- PANELA — Level rewards, achievements, bookmarks, topic history
-- =========================================================================

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS topic_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.server_level_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  level_threshold INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('role', 'item', 'custom')),
  reward_value TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, level_threshold, reward_type)
);
GRANT SELECT ON public.server_level_rewards TO authenticated;
GRANT ALL ON public.server_level_rewards TO service_role;
ALTER TABLE public.server_level_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "level_rewards_select_member" ON public.server_level_rewards;
CREATE POLICY "level_rewards_select_member" ON public.server_level_rewards FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()) OR public.server_member_level(server_id, auth.uid()) >= 80);
DROP POLICY IF EXISTS "level_rewards_manage" ON public.server_level_rewards;
CREATE POLICY "level_rewards_manage" ON public.server_level_rewards FOR ALL TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 80)
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 80);

CREATE TABLE IF NOT EXISTS public.server_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message TEXT,
  UNIQUE(server_id, user_id, achievement_key)
);
GRANT SELECT ON public.server_achievements TO authenticated;
GRANT ALL ON public.server_achievements TO service_role;
ALTER TABLE public.server_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_select_member" ON public.server_achievements;
CREATE POLICY "achievements_select_member" ON public.server_achievements FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "achievements_insert_self" ON public.server_achievements;
CREATE POLICY "achievements_insert_self" ON public.server_achievements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "achievements_update_self" ON public.server_achievements;
CREATE POLICY "achievements_update_self" ON public.server_achievements FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.award_server_achievement(
  _server_id UUID,
  _user_id UUID,
  _achievement_key TEXT,
  _message TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id UUID;
BEGIN
  INSERT INTO public.server_achievements (server_id, user_id, achievement_key, message)
  VALUES (_server_id, _user_id, _achievement_key, _message)
  ON CONFLICT (server_id, user_id, achievement_key) DO NOTHING;
  SELECT id INTO result_id
  FROM public.server_achievements
  WHERE server_id = _server_id AND user_id = _user_id AND achievement_key = _achievement_key;
  RETURN result_id;
END; $$;

CREATE TABLE IF NOT EXISTS public.message_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_bookmarks TO authenticated;
GRANT ALL ON public.message_bookmarks TO service_role;
ALTER TABLE public.message_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookmarks_select_self" ON public.message_bookmarks;
CREATE POLICY "bookmarks_select_self" ON public.message_bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "bookmarks_modify_self" ON public.message_bookmarks;
CREATE POLICY "bookmarks_modify_self" ON public.message_bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.channel_topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  topic TEXT,
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.channel_topic_history TO authenticated;
GRANT ALL ON public.channel_topic_history TO service_role;
ALTER TABLE public.channel_topic_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "channel_topic_history_select_member" ON public.channel_topic_history;
CREATE POLICY "channel_topic_history_select_member" ON public.channel_topic_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.server_members sm ON sm.server_id = c.server_id
    WHERE c.id = channel_id AND sm.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "channel_topic_history_insert_self" ON public.channel_topic_history;
CREATE POLICY "channel_topic_history_insert_self" ON public.channel_topic_history FOR INSERT TO authenticated
  WITH CHECK (updated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.update_channel_topic(_channel_id UUID, _topic TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id UUID;
BEGIN
  SELECT server_id INTO _server_id FROM public.channels WHERE id = _channel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canal_nao_encontrado'; END IF;
  UPDATE public.channels
  SET topic = _topic, topic_updated_at = now()
  WHERE id = _channel_id;
  INSERT INTO public.channel_topic_history (channel_id, topic, updated_by)
  VALUES (_channel_id, _topic, auth.uid());
END; $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.server_level_rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_topic_history;
