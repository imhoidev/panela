-- =========================================================================
-- PANELA — DM conversations, server categories, friends, stats
-- =========================================================================

-- ============ DM CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.dm_conversations TO authenticated;
GRANT ALL ON public.dm_conversations TO service_role;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_conv_select_participant" ON public.dm_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "dm_conv_insert" ON public.dm_conversations FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "dm_conv_update_participant" ON public.dm_conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = id AND user_id = auth.uid()));

-- ============ DM PARTICIPANTS ============
CREATE TABLE IF NOT EXISTS public.dm_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.dm_participants TO authenticated;
GRANT ALL ON public.dm_participants TO service_role;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_part_select_self" ON public.dm_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "dm_part_insert" ON public.dm_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id = user_id));
CREATE POLICY "dm_part_update_self" ON public.dm_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============ DM MESSAGES ============
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  reply_to UUID REFERENCES public.dm_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_msg_select_participant" ON public.dm_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "dm_msg_insert_self" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "dm_msg_update_self" ON public.dm_messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "dm_msg_delete_self" ON public.dm_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Trigger: update dm_conversations last_message_at on new DM
CREATE OR REPLACE FUNCTION public.update_dm_conversation_last()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  preview TEXT;
BEGIN
  preview = LEFT(COALESCE(NEW.content, '[attachment]'), 100);
  UPDATE public.dm_conversations
  SET last_message_at = NEW.created_at, last_message_preview = preview
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_dm_message_after
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_dm_conversation_last();

-- ============ FRIENDS / FOLLOWS ============
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friends TO authenticated;
GRANT ALL ON public.friends TO service_role;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends_select_self" ON public.friends FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "friends_insert_self" ON public.friends FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "friends_update_self" ON public.friends FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "friends_delete_self" ON public.friends FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ============ SERVER CATEGORIES ============
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS description TEXT;

-- ============ PROFILE STATS ============
CREATE TABLE IF NOT EXISTS public.profile_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages_total INTEGER NOT NULL DEFAULT 0,
  servers_total INTEGER NOT NULL DEFAULT 0,
  reactions_given INTEGER NOT NULL DEFAULT 0,
  reactions_received INTEGER NOT NULL DEFAULT 0,
  voice_minutes_total INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_stats TO authenticated;
GRANT ALL ON public.profile_stats TO service_role;
ALTER TABLE public.profile_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stats_select_all" ON public.profile_stats FOR SELECT TO authenticated
  USING (true);

-- Trigger to update profile_stats on message insert
CREATE OR REPLACE FUNCTION public.update_profile_stats_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_stats (user_id, messages_total, servers_total)
  VALUES (NEW.author_id, 1, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET messages_total = profile_stats.messages_total + 1,
      updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_profile_stats_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats_message();

-- Trigger to update profile_stats on server join
CREATE OR REPLACE FUNCTION public.update_profile_stats_server()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_stats (user_id, messages_total, servers_total)
  VALUES (NEW.user_id, 0, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET servers_total = profile_stats.servers_total + 1,
      updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_profile_stats_server
  AFTER INSERT ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats_server();

-- Trigger to decrease servers_total on leave
CREATE OR REPLACE FUNCTION public.decrease_profile_stats_server()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profile_stats
  SET servers_total = GREATEST(0, profile_stats.servers_total - 1),
      updated_at = now()
  WHERE user_id = OLD.user_id;
  RETURN OLD;
END; $$;

CREATE TRIGGER trg_profile_stats_server_leave
  AFTER DELETE ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.decrease_profile_stats_server();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
