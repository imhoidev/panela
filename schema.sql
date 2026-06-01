-- =========================================================================
-- PANELA — Schema completo
-- =========================================================================

-- ============ ENUMS ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'coo', 'ceo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'canceled', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.server_privacy AS ENUM ('public', 'private', 'invite_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.channel_type AS ENUM ('text', 'voice', 'announcement', 'rules', 'forum'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  bio_rich JSONB,                       -- markdown + estilos PRO
  avatar_url TEXT,
  banner_url TEXT,                      -- PRO: pode ser GIF
  name_color TEXT DEFAULT '#e4d8b4',    -- cor primária do nome
  name_colors JSONB,                    -- PRO: até 5 cores (rainbow/gradient)
  name_effect TEXT,                     -- PRO: 'glow' | 'rainbow' | 'typing'
  message_style JSONB,                  -- PRO: bolha customizada
  social_links JSONB DEFAULT '{}'::jsonb, -- {twitter:'@x', instagram:'@y', ...}
  external_links JSONB DEFAULT '[]'::jsonb,
  current_plan public.subscription_plan NOT NULL DEFAULT 'free',
  status_text TEXT,
  status_emoji TEXT,
  age_verified BOOLEAN DEFAULT false,
  birthdate DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ USER ROLES (global) ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: security definer para evitar recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "user_roles_select_self_or_staff" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coo') OR public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "user_roles_ceo_insert" ON public.user_roles;
CREATE POLICY "user_roles_ceo_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "user_roles_ceo_delete" ON public.user_roles;
CREATE POLICY "user_roles_ceo_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo'));

-- ============ SUBSCRIPTIONS (pagamento manual via CEO) ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'pro',
  status public.subscription_status NOT NULL DEFAULT 'pending',
  contact_method TEXT,                  -- 'whatsapp' | 'email' | 'discord'
  contact_value TEXT,
  notes TEXT,
  amount_cents INTEGER,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_select_self_or_staff" ON public.subscriptions;
CREATE POLICY "subs_select_self_or_staff" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'coo'));
DROP POLICY IF EXISTS "subs_insert_self" ON public.subscriptions;
CREATE POLICY "subs_insert_self" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "subs_update_staff_or_self_cancel" ON public.subscriptions;
CREATE POLICY "subs_update_staff_or_self_cancel" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'coo') OR user_id = auth.uid());

-- current_plan helper
CREATE OR REPLACE FUNCTION public.current_plan(_user_id UUID)
RETURNS public.subscription_plan
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions
     WHERE user_id = _user_id AND status = 'active'
       AND (ends_at IS NULL OR ends_at > now())
     ORDER BY starts_at DESC NULLS LAST LIMIT 1),
    'free'::public.subscription_plan
  )
$$;

-- Trigger: quando subscription vira active, atualiza profiles.current_plan
CREATE OR REPLACE FUNCTION public.sync_profile_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET current_plan = public.current_plan(NEW.user_id), updated_at = now()
    WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sync_profile_plan AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_plan();

-- ============ SERVERS ============
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  privacy public.server_privacy NOT NULL DEFAULT 'public',
  min_age INTEGER DEFAULT 13,
  focus_tags TEXT[] DEFAULT '{}',
  template TEXT,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-add owner as member + default channel on server creation
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, level)
    VALUES (NEW.id, NEW.owner_id, 99)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.channels (server_id, name, type, position)
    VALUES (NEW.id, 'geral', 'text', 0)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS servers_after_insert ON public.servers;
CREATE TRIGGER servers_after_insert AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();
GRANT SELECT ON public.servers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- server_members criado antes das policies que o referenciam
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
  nickname TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_members TO authenticated;
GRANT ALL ON public.server_members TO service_role;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

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

-- helpers
CREATE OR REPLACE FUNCTION public.is_server_member(_server UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE server_id = _server AND user_id = _user)
$$;
CREATE OR REPLACE FUNCTION public.server_member_level(_server UUID, _user UUID)
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT level FROM public.server_members WHERE server_id = _server AND user_id = _user), 0)
$$;

-- policies de servers
DROP POLICY IF EXISTS "servers_select_visible" ON public.servers;
CREATE POLICY "servers_select_visible" ON public.servers FOR SELECT
  USING (privacy = 'public' OR public.is_server_member(id, auth.uid()) OR owner_id = auth.uid());
DROP POLICY IF EXISTS "servers_insert_self" ON public.servers;
CREATE POLICY "servers_insert_self" ON public.servers FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "servers_update_owner" ON public.servers;
CREATE POLICY "servers_update_owner" ON public.servers FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.server_member_level(id, auth.uid()) >= 95);
DROP POLICY IF EXISTS "servers_delete_owner" ON public.servers;
CREATE POLICY "servers_delete_owner" ON public.servers FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- policies de server_members
DROP POLICY IF EXISTS "members_select_member" ON public.server_members;
CREATE POLICY "members_select_member" ON public.server_members FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()) OR
         EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.privacy = 'public'));
DROP POLICY IF EXISTS "members_insert_self" ON public.server_members;
CREATE POLICY "members_insert_self" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.privacy = 'public')
    OR
    EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.owner_id = auth.uid())
  ));
DROP POLICY IF EXISTS "members_insert_invite_mod" ON public.server_members;
CREATE POLICY "members_insert_invite_mod" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (user_id != auth.uid() AND
    public.server_member_level(server_id, auth.uid()) >= 80);
DROP POLICY IF EXISTS "members_delete_self_or_mod" ON public.server_members;
CREATE POLICY "members_delete_self_or_mod" ON public.server_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.server_member_level(server_id, auth.uid()) >= 90);

-- ============ SERVER ROLES ============
CREATE TABLE IF NOT EXISTS public.server_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 99),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  gif_tag_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_roles TO authenticated;
GRANT ALL ON public.server_roles TO service_role;
ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sroles_select_member" ON public.server_roles;
CREATE POLICY "sroles_select_member" ON public.server_roles FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "sroles_manage_high" ON public.server_roles;
CREATE POLICY "sroles_manage_high" ON public.server_roles FOR ALL TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 90)
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 90);

CREATE TABLE IF NOT EXISTS public.server_member_roles (
  member_id UUID NOT NULL REFERENCES public.server_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON public.server_member_roles TO authenticated;
GRANT ALL ON public.server_member_roles TO service_role;
ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smr_select_member" ON public.server_member_roles;
CREATE POLICY "smr_select_member" ON public.server_member_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id
                 AND public.is_server_member(sm.server_id, auth.uid())));
DROP POLICY IF EXISTS "smr_manage_high" ON public.server_member_roles;
CREATE POLICY "smr_manage_high" ON public.server_member_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id
                 AND public.server_member_level(sm.server_id, auth.uid()) >= 90))
  WITH CHECK (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id
                      AND public.server_member_level(sm.server_id, auth.uid()) >= 90));

-- ============ CHANNELS & MESSAGES ============
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.channel_type NOT NULL DEFAULT 'text',
  topic TEXT,
  position INTEGER DEFAULT 0,
  min_level INTEGER DEFAULT 1,
  min_age INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "channels_select_member" ON public.channels;
CREATE POLICY "channels_select_member" ON public.channels FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()) AND
         public.server_member_level(server_id, auth.uid()) >= min_level AND
         (expires_at IS NULL OR expires_at > now()));
DROP POLICY IF EXISTS "channels_manage_high" ON public.channels;
CREATE POLICY "channels_manage_high" ON public.channels FOR ALL TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 80)
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 80);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  thread_root UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_select_member" ON public.messages;
CREATE POLICY "msg_select_member" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
                 AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "msg_insert_member" ON public.messages;
CREATE POLICY "msg_insert_member" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND
              EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
                      AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "msg_update_author" ON public.messages;
CREATE POLICY "msg_update_author" ON public.messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
DROP POLICY IF EXISTS "msg_delete_author_or_mod" ON public.messages;
CREATE POLICY "msg_delete_author_or_mod" ON public.messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR
         EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id
                 AND public.server_member_level(c.server_id, auth.uid()) >= 70));

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  exif JSONB
);
GRANT SELECT, INSERT, DELETE ON public.message_attachments TO authenticated;
GRANT ALL ON public.message_attachments TO service_role;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_select_via_msg" ON public.message_attachments;
CREATE POLICY "att_select_via_msg" ON public.message_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.channels c ON c.id = m.channel_id
                 WHERE m.id = message_id AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "att_insert_author" ON public.message_attachments;
CREATE POLICY "att_insert_author" ON public.message_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND m.author_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "react_select_member" ON public.message_reactions;
CREATE POLICY "react_select_member" ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.channels c ON c.id = m.channel_id
                 WHERE m.id = message_id AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "react_insert_self" ON public.message_reactions;
CREATE POLICY "react_insert_self" ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "react_delete_self" ON public.message_reactions;
CREATE POLICY "react_delete_self" ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ STICKERS & EVENTS ============
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_pro_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticker_packs TO authenticated;
GRANT ALL ON public.sticker_packs TO service_role;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "packs_select_all" ON public.sticker_packs;
CREATE POLICY "packs_select_all" ON public.sticker_packs FOR SELECT USING (true);
DROP POLICY IF EXISTS "packs_manage_owner" ON public.sticker_packs;
CREATE POLICY "packs_manage_owner" ON public.sticker_packs FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);
GRANT SELECT, INSERT, DELETE ON public.stickers TO authenticated;
GRANT ALL ON public.stickers TO service_role;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stickers_select_all" ON public.stickers;
CREATE POLICY "stickers_select_all" ON public.stickers FOR SELECT USING (true);
DROP POLICY IF EXISTS "stickers_manage_pack_owner" ON public.stickers;
CREATE POLICY "stickers_manage_pack_owner" ON public.stickers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND p.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.server_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_events TO authenticated;
GRANT ALL ON public.server_events TO service_role;
ALTER TABLE public.server_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select_member" ON public.server_events;
CREATE POLICY "events_select_member" ON public.server_events FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "events_manage_mod" ON public.server_events;
CREATE POLICY "events_manage_mod" ON public.server_events FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.server_member_level(server_id, auth.uid()) >= 70)
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 50);

-- ============ TRIGGER: auto profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  n INTEGER := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'panela_' || substr(NEW.id::text, 1, 8)
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'panela_' || substr(NEW.id::text, 1, 8); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (NEW.id, final_username,
            COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', final_username),
            NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('server-icons', 'server-icons', true),
  ('stickers', 'stickers', true),
  ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT USING (
  bucket_id IN ('avatars','banners','server-icons','stickers','attachments')
);
DROP POLICY IF EXISTS "storage_auth_upload_own_folder" ON storage.objects;
CREATE POLICY "storage_auth_upload_own_folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id IN ('avatars','banners','server-icons','stickers','attachments')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "storage_auth_update_own" ON storage.objects;
CREATE POLICY "storage_auth_update_own" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id IN ('avatars','banners','server-icons','stickers','attachments')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "storage_auth_delete_own" ON storage.objects;
CREATE POLICY "storage_auth_delete_own" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id IN ('avatars','banners','server-icons','stickers','attachments')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.server_members;