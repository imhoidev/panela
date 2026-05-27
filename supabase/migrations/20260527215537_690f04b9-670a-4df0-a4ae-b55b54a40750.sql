
-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER TABLE public.server_members REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='channels';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.channels; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='server_members';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='message_reactions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; END IF;
END $$;

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS servers_touch ON public.servers;
CREATE TRIGGER servers_touch BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- owner auto-membership trigger
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, level)
    VALUES (NEW.id, NEW.owner_id, 99)
    ON CONFLICT DO NOTHING;
  -- default text channel
  INSERT INTO public.channels (server_id, name, type, position)
    VALUES (NEW.id, 'geral', 'text', 0)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS servers_after_insert ON public.servers;
CREATE TRIGGER servers_after_insert AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- member_count maintenance
CREATE OR REPLACE FUNCTION public.bump_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.server_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS server_members_count ON public.server_members;
CREATE TRIGGER server_members_count AFTER INSERT OR DELETE ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.bump_member_count();

-- ensure unique channel name per server
DO $$ BEGIN
  CREATE UNIQUE INDEX channels_server_name_unique ON public.channels(server_id, name);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
