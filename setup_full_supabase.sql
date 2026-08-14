-- =========================================================================
-- PANELA — SCRIPT COMPLETO DE CONFIGURAÇÃO AUTOMÁTICA DO SUPABASE (FULL AUTO CONFIG)
-- =========================================================================
-- Copie e cole este script inteiro no Editor SQL do seu projeto Supabase.
-- Ele cria todas as extensões, tipos (enums), tabelas, funções, triggers,
-- políticas de RLS, buckets de storage e publicações em tempo real (Realtime).
-- =========================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'coo', 'ceo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'canceled', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.server_privacy AS ENUM ('public', 'private', 'invite_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.channel_type AS ENUM ('text', 'voice', 'announcement', 'rules', 'forum'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 3. TABELAS DE USUÁRIOS E PERFIS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  bio_rich JSONB,
  avatar_url TEXT,
  banner_url TEXT,
  name_color TEXT DEFAULT '#e4d8b4',
  name_colors JSONB,
  name_effect TEXT,
  message_style JSONB,
  social_links JSONB DEFAULT '{}'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  current_plan public.subscription_plan NOT NULL DEFAULT 'free',
  status_text TEXT,
  status_emoji TEXT,
  status TEXT NOT NULL DEFAULT 'online',
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

-- User Roles Globais
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "user_roles_select_self_or_staff" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coo') OR public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "user_roles_ceo_insert" ON public.user_roles;
CREATE POLICY "user_roles_ceo_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ceo'));
DROP POLICY IF EXISTS "user_roles_ceo_delete" ON public.user_roles;
CREATE POLICY "user_roles_ceo_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ceo'));

-- Subscriptions (Planos PRO)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'pro',
  status public.subscription_status NOT NULL DEFAULT 'pending',
  contact_method TEXT,
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
CREATE POLICY "subs_insert_self" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "subs_update_staff_or_self_cancel" ON public.subscriptions;
CREATE POLICY "subs_update_staff_or_self_cancel" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'coo') OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_plan(_user_id UUID)
RETURNS public.subscription_plan LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' AND (ends_at IS NULL OR ends_at > now()) ORDER BY starts_at DESC NULLS LAST LIMIT 1),
    'free'::public.subscription_plan
  )
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET current_plan = public.current_plan(NEW.user_id), updated_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_profile_plan ON public.subscriptions;
CREATE TRIGGER trg_sync_profile_plan AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_profile_plan();

-- =========================================================================
-- 4. SERVIDORES / COMUNIDADES
-- =========================================================================

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
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.servers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

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

-- Functions & Helpers para Servidores
CREATE OR REPLACE FUNCTION public.is_server_member(_server UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE server_id = _server AND user_id = _user)
     OR EXISTS (SELECT 1 FROM public.servers WHERE id = _server AND owner_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.server_member_level(_server UUID, _user UUID)
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT level FROM public.server_members WHERE server_id = _server AND user_id = _user),
    (SELECT CASE WHEN EXISTS (SELECT 1 FROM public.servers WHERE id = _server AND owner_id = _user) THEN 100 ELSE 0 END)
  )
$$;

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, level)
    VALUES (NEW.id, NEW.owner_id, 100) ON CONFLICT DO NOTHING;
  INSERT INTO public.channels (server_id, name, type, position)
    VALUES (NEW.id, 'geral', 'text', 0) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS servers_after_insert ON public.servers;
CREATE TRIGGER servers_after_insert AFTER INSERT ON public.servers FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

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
CREATE TRIGGER server_members_count AFTER INSERT OR DELETE ON public.server_members FOR EACH ROW EXECUTE FUNCTION public.bump_member_count();

DROP POLICY IF EXISTS "servers_select_visible" ON public.servers;
CREATE POLICY "servers_select_visible" ON public.servers FOR SELECT USING (privacy = 'public' OR public.is_server_member(id, auth.uid()) OR owner_id = auth.uid());
DROP POLICY IF EXISTS "servers_insert_self" ON public.servers;
CREATE POLICY "servers_insert_self" ON public.servers FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "servers_update_owner" ON public.servers;
CREATE POLICY "servers_update_owner" ON public.servers FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.server_member_level(id, auth.uid()) >= 95);
DROP POLICY IF EXISTS "servers_delete_owner" ON public.servers;
CREATE POLICY "servers_delete_owner" ON public.servers FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "members_select_member" ON public.server_members;
CREATE POLICY "members_select_member" ON public.server_members FOR SELECT TO authenticated
  USING (public.is_server_member(server_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.privacy = 'public'));
DROP POLICY IF EXISTS "members_insert_self" ON public.server_members;
CREATE POLICY "members_insert_self" ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.privacy = 'public') OR EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND s.owner_id = auth.uid())));
DROP POLICY IF EXISTS "members_insert_invite_mod" ON public.server_members;
CREATE POLICY "members_insert_invite_mod" ON public.server_members FOR INSERT TO authenticated WITH CHECK (user_id != auth.uid() AND public.server_member_level(server_id, auth.uid()) >= 80);
DROP POLICY IF EXISTS "members_delete_self_or_mod" ON public.server_members;
CREATE POLICY "members_delete_self_or_mod" ON public.server_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.server_member_level(server_id, auth.uid()) >= 90);

-- Banimentos e Silêncios
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
CREATE POLICY "bans_select_member" ON public.server_bans FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "bans_manage_mod" ON public.server_bans;
CREATE POLICY "bans_manage_mod" ON public.server_bans FOR INSERT TO authenticated WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70);
DROP POLICY IF EXISTS "bans_delete_mod" ON public.server_bans;
CREATE POLICY "bans_delete_mod" ON public.server_bans FOR DELETE TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 70);

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
CREATE POLICY "mutes_select_member" ON public.server_mutes FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "mutes_manage_mod" ON public.server_mutes;
CREATE POLICY "mutes_manage_mod" ON public.server_mutes FOR INSERT TO authenticated WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70);
DROP POLICY IF EXISTS "mutes_delete_mod" ON public.server_mutes;
CREATE POLICY "mutes_delete_mod" ON public.server_mutes FOR DELETE TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 70);

CREATE OR REPLACE FUNCTION public.is_muted(_server UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_mutes WHERE server_id = _server AND user_id = _user AND (expires_at IS NULL OR expires_at > now()))
$$;

-- Cargos do Servidor (Server Roles)
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
CREATE POLICY "sroles_select_member" ON public.server_roles FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "sroles_manage_high" ON public.server_roles;
CREATE POLICY "sroles_manage_high" ON public.server_roles FOR ALL TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 90) WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 90);

CREATE TABLE IF NOT EXISTS public.server_member_roles (
  member_id UUID NOT NULL REFERENCES public.server_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON public.server_member_roles TO authenticated;
GRANT ALL ON public.server_member_roles TO service_role;
ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smr_select_member" ON public.server_member_roles;
CREATE POLICY "smr_select_member" ON public.server_member_roles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id AND public.is_server_member(sm.server_id, auth.uid())));
DROP POLICY IF EXISTS "smr_manage_high" ON public.server_member_roles;
CREATE POLICY "smr_manage_high" ON public.server_member_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id AND public.server_member_level(sm.server_id, auth.uid()) >= 90)) WITH CHECK (EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.id = member_id AND public.server_member_level(sm.server_id, auth.uid()) >= 90));

-- Helper: Verificador Centralizado de Permissões Granulares
CREATE OR REPLACE FUNCTION public.has_server_permission(_server UUID, _user UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_owner BOOLEAN;
  _level INTEGER;
  _has_perm BOOLEAN;
BEGIN
  IF _user IS NULL OR _server IS NULL THEN RETURN FALSE; END IF;
  SELECT (owner_id = _user) INTO _is_owner FROM public.servers WHERE id = _server;
  IF _is_owner IS TRUE THEN RETURN TRUE; END IF;
  _level := public.server_member_level(_server, _user);
  IF _level >= 90 THEN RETURN TRUE; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.server_members sm
    JOIN public.server_member_roles smr ON smr.member_id = sm.id
    JOIN public.server_roles sr ON sr.id = smr.role_id
    WHERE sm.server_id = _server AND sm.user_id = _user
      AND ((sr.permissions->>'ADMINISTRATE')::boolean IS TRUE OR (sr.permissions->>_perm)::boolean IS TRUE)
  ) INTO _has_perm;
  RETURN COALESCE(_has_perm, FALSE);
END; $$;

-- Categorias de Canais
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

DROP POLICY IF EXISTS "categories_select_member" ON public.server_categories;
CREATE POLICY "categories_select_member" ON public.server_categories FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
DROP POLICY IF EXISTS "categories_manage_mod" ON public.server_categories;
CREATE POLICY "categories_manage_mod" ON public.server_categories FOR ALL TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 70 OR public.has_server_permission(server_id, auth.uid(), 'MANAGE_CATEGORIES'))
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 70 OR public.has_server_permission(server_id, auth.uid(), 'MANAGE_CATEGORIES'));

-- =========================================================================
-- 5. CANAIS E MENSAGENS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.channel_type NOT NULL DEFAULT 'text',
  topic TEXT,
  topic_updated_at TIMESTAMPTZ,
  category TEXT,
  description TEXT,
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
  USING (public.is_server_member(server_id, auth.uid()) AND public.server_member_level(server_id, auth.uid()) >= min_level AND (expires_at IS NULL OR expires_at > now()));
DROP POLICY IF EXISTS "channels_manage_high" ON public.channels;
CREATE POLICY "channels_manage_high" ON public.channels FOR ALL TO authenticated
  USING (public.server_member_level(server_id, auth.uid()) >= 80 OR public.has_server_permission(server_id, auth.uid(), 'MANAGE_CHANNELS'))
  WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 80 OR public.has_server_permission(server_id, auth.uid(), 'MANAGE_CHANNELS'));

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  thread_root UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_member" ON public.messages;
CREATE POLICY "msg_select_member" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "msg_insert_member" ON public.messages;
CREATE POLICY "msg_insert_member" ON public.messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND public.is_server_member(c.server_id, auth.uid()) AND NOT public.is_muted(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "msg_update_author_or_mod" ON public.messages;
CREATE POLICY "msg_update_author_or_mod" ON public.messages FOR UPDATE TO authenticated USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND (public.server_member_level(c.server_id, auth.uid()) >= 70 OR public.has_server_permission(c.server_id, auth.uid(), 'MANAGE_MESSAGES'))));
DROP POLICY IF EXISTS "msg_delete_author_or_mod" ON public.messages;
CREATE POLICY "msg_delete_author_or_mod" ON public.messages FOR DELETE TO authenticated USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND (public.server_member_level(c.server_id, auth.uid()) >= 70 OR public.has_server_permission(c.server_id, auth.uid(), 'MANAGE_MESSAGES'))));

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
CREATE POLICY "att_select_via_msg" ON public.message_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.channels c ON c.id = m.channel_id WHERE m.id = message_id AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "att_insert_author" ON public.message_attachments;
CREATE POLICY "att_insert_author" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND m.author_id = auth.uid()));

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
CREATE POLICY "react_select_member" ON public.message_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.channels c ON c.id = m.channel_id WHERE m.id = message_id AND public.is_server_member(c.server_id, auth.uid())));
DROP POLICY IF EXISTS "react_insert_self" ON public.message_reactions;
CREATE POLICY "react_insert_self" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "react_delete_self" ON public.message_reactions;
CREATE POLICY "react_delete_self" ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Recompensas, Conquistas, Bookmarks e Histórico
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
CREATE POLICY "level_rewards_select_member" ON public.server_level_rewards FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()) OR public.server_member_level(server_id, auth.uid()) >= 80);
CREATE POLICY "level_rewards_manage" ON public.server_level_rewards FOR ALL TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 80) WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 80);

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
CREATE POLICY "achievements_select_member" ON public.server_achievements FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "achievements_insert_self" ON public.server_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "achievements_update_self" ON public.server_achievements FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.award_server_achievement(_server_id UUID, _user_id UUID, _achievement_key TEXT, _message TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id UUID;
BEGIN
  INSERT INTO public.server_achievements (server_id, user_id, achievement_key, message)
    VALUES (_server_id, _user_id, _achievement_key, _message) ON CONFLICT (server_id, user_id, achievement_key) DO NOTHING;
  SELECT id INTO result_id FROM public.server_achievements WHERE server_id = _server_id AND user_id = _user_id AND achievement_key = _achievement_key;
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
CREATE POLICY "bookmarks_select_self" ON public.message_bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bookmarks_modify_self" ON public.message_bookmarks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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
CREATE POLICY "channel_topic_history_select_member" ON public.channel_topic_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.channels c JOIN public.server_members sm ON sm.server_id = c.server_id WHERE c.id = channel_id AND sm.user_id = auth.uid()));
CREATE POLICY "channel_topic_history_insert_self" ON public.channel_topic_history FOR INSERT TO authenticated WITH CHECK (updated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.update_channel_topic(_channel_id UUID, _topic TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id UUID;
BEGIN
  SELECT server_id INTO _server_id FROM public.channels WHERE id = _channel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canal_nao_encontrado'; END IF;
  UPDATE public.channels SET topic = _topic, topic_updated_at = now() WHERE id = _channel_id;
  INSERT INTO public.channel_topic_history (channel_id, topic, updated_by) VALUES (_channel_id, _topic, auth.uid());
END; $$;

-- Stickers e Eventos
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
CREATE POLICY "packs_select_all" ON public.sticker_packs FOR SELECT USING (true);
CREATE POLICY "packs_manage_owner" ON public.sticker_packs FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);
GRANT SELECT, INSERT, DELETE ON public.stickers TO authenticated;
GRANT ALL ON public.stickers TO service_role;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stickers_select_all" ON public.stickers FOR SELECT USING (true);
CREATE POLICY "stickers_manage_pack_owner" ON public.stickers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND (p.owner_id = auth.uid() OR public.server_member_level(p.server_id, auth.uid()) >= 80))) WITH CHECK (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND (p.owner_id = auth.uid() OR public.server_member_level(p.server_id, auth.uid()) >= 80)));

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
CREATE POLICY "events_select_member" ON public.server_events FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "events_manage_mod" ON public.server_events FOR ALL TO authenticated USING (created_by = auth.uid() OR public.server_member_level(server_id, auth.uid()) >= 70) WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 50);

-- Convites (Invites)
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
CREATE POLICY "invites_select_member" ON public.invites FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "invites_insert_manage" ON public.invites FOR INSERT TO authenticated WITH CHECK (public.server_member_level(server_id, auth.uid()) >= 50 OR public.has_server_permission(server_id, auth.uid(), 'CREATE_INVITES'));
CREATE POLICY "invites_delete_manage" ON public.invites FOR DELETE TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 50 OR public.has_server_permission(server_id, auth.uid(), 'CREATE_INVITES'));

CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.invites;
  banned BOOLEAN;
BEGIN
  SELECT * INTO inv FROM public.invites WHERE code = invite_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'convite_invalido'; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RAISE EXCEPTION 'convite_expirado'; END IF;
  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN RAISE EXCEPTION 'convite_esgotado'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.server_bans WHERE server_id = inv.server_id AND user_id = auth.uid()) INTO banned;
  IF banned THEN RAISE EXCEPTION 'banido'; END IF;
  INSERT INTO public.server_members (server_id, user_id, level) VALUES (inv.server_id, auth.uid(), 1) ON CONFLICT (server_id, user_id) DO NOTHING;
  UPDATE public.invites SET use_count = use_count + 1 WHERE id = inv.id;
  RETURN inv.server_id;
END; $$;

-- Moderação & Logs
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
CREATE POLICY "reports_insert_self" ON public.moderation_reports FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
CREATE POLICY "reports_select_staff" ON public.moderation_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coo') OR public.has_role(auth.uid(), 'ceo'));

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
CREATE POLICY "logs_select_mod" ON public.moderation_logs FOR SELECT TO authenticated USING (public.server_member_level(server_id, auth.uid()) >= 70 OR public.has_server_permission(server_id, auth.uid(), 'ADMINISTRATE'));

-- Server XP
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
CREATE POLICY "xp_select_member" ON public.server_xp FOR SELECT TO authenticated USING (public.is_server_member(server_id, auth.uid()));
CREATE POLICY "xp_insert_update_self" ON public.server_xp FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "xp_update_self" ON public.server_xp FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.grant_xp_for_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_xp (server_id, user_id, xp)
    SELECT c.server_id, NEW.author_id, 1 FROM public.channels c WHERE c.id = NEW.channel_id
    ON CONFLICT (server_id, user_id) DO UPDATE SET xp = server_xp.xp + 1, updated_at = now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_message_xp ON public.messages;
CREATE TRIGGER trg_message_xp AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.grant_xp_for_message();

-- =========================================================================
-- 6. MENSAGENS DIRETAS (DMs), AMIGOS E ESTATÍSTICAS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.dm_conversations TO authenticated;
GRANT ALL ON public.dm_conversations TO service_role;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

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

-- Policies de DMs e Amigos
CREATE POLICY "dm_conv_select" ON public.dm_conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_conversations.id AND user_id = auth.uid()));
CREATE POLICY "dm_conv_insert" ON public.dm_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dm_conv_update" ON public.dm_conversations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_conversations.id AND user_id = auth.uid()));

CREATE POLICY "dm_part_select_self" ON public.dm_participants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "dm_part_insert" ON public.dm_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id = user_id));
CREATE POLICY "dm_part_update_self" ON public.dm_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "dm_msg_select_participant" ON public.dm_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "dm_msg_insert_self" ON public.dm_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = dm_messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "dm_msg_update_self" ON public.dm_messages FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "dm_msg_delete_self" ON public.dm_messages FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "friends_select_self" ON public.friends FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "friends_insert_self" ON public.friends FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "friends_update_self" ON public.friends FOR UPDATE TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "friends_delete_self" ON public.friends FOR DELETE TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "stats_select_all" ON public.profile_stats FOR SELECT TO authenticated USING (true);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_sub_select_self" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_sub_insert_self" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_sub_delete_self" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Functions para DMs e Stats
CREATE OR REPLACE FUNCTION public.update_dm_conversation_last()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE preview TEXT;
BEGIN
  preview = LEFT(COALESCE(NEW.content, '[attachment]'), 100);
  UPDATE public.dm_conversations SET last_message_at = NEW.created_at, last_message_preview = preview WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_dm_message_after ON public.dm_messages;
CREATE TRIGGER trg_dm_message_after AFTER INSERT ON public.dm_messages FOR EACH ROW EXECUTE FUNCTION public.update_dm_conversation_last();

CREATE OR REPLACE FUNCTION public.update_profile_stats_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_stats (user_id, messages_total, servers_total) VALUES (NEW.author_id, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET messages_total = profile_stats.messages_total + 1, updated_at = now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_profile_stats_message ON public.messages;
CREATE TRIGGER trg_profile_stats_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats_message();

CREATE OR REPLACE FUNCTION public.update_profile_stats_server()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_stats (user_id, messages_total, servers_total) VALUES (NEW.user_id, 0, 1)
    ON CONFLICT (user_id) DO UPDATE SET servers_total = profile_stats.servers_total + 1, updated_at = now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_profile_stats_server ON public.server_members;
CREATE TRIGGER trg_profile_stats_server AFTER INSERT ON public.server_members FOR EACH ROW EXECUTE FUNCTION public.update_profile_stats_server();

CREATE OR REPLACE FUNCTION public.decrease_profile_stats_server()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profile_stats SET servers_total = GREATEST(0, profile_stats.servers_total - 1), updated_at = now() WHERE user_id = OLD.user_id;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_profile_stats_server_leave ON public.server_members;
CREATE TRIGGER trg_profile_stats_server_leave AFTER DELETE ON public.server_members FOR EACH ROW EXECUTE FUNCTION public.decrease_profile_stats_server();

CREATE OR REPLACE FUNCTION public.get_dm_participants(conv_ids UUID[])
RETURNS TABLE(conversation_id UUID, user_id UUID) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.conversation_id, p.user_id FROM public.dm_participants p WHERE p.conversation_id = ANY(conv_ids) AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = p.conversation_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_dm_participants_single(conv_id UUID)
RETURNS TABLE(conversation_id UUID, user_id UUID) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.conversation_id, p.user_id FROM public.dm_participants p WHERE p.conversation_id = conv_id AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = conv_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_shared_dm_conversation(other_user_id UUID)
RETURNS TABLE(conversation_id UUID) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p1.conversation_id FROM public.dm_participants p1 JOIN public.dm_participants p2 ON p2.conversation_id = p1.conversation_id WHERE p1.user_id = auth.uid() AND p2.user_id = other_user_id LIMIT 1;
$$;

-- =========================================================================
-- 7. TRIGGER: CRIAR PERFIL AUTOMATICAMENTE AO CADASTRO (auth.users)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  n INTEGER := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'panela_' || substr(NEW.id::text, 1, 8));
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'panela_' || substr(NEW.id::text, 1, 8); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', final_username), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 8. STORAGE BUCKETS
-- =========================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('server-icons', 'server-icons', true),
  ('stickers', 'stickers', true),
  ('attachments', 'attachments', true),
  ('server-banners', 'server-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars','banners','server-icons','stickers','attachments','server-banners'));
DROP POLICY IF EXISTS "storage_auth_upload_own_folder" ON storage.objects;
CREATE POLICY "storage_auth_upload_own_folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars','banners','server-icons','stickers','attachments','server-banners') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "storage_auth_update_own" ON storage.objects;
CREATE POLICY "storage_auth_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('avatars','banners','server-icons','stickers','attachments','server-banners') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "storage_auth_delete_own" ON storage.objects;
CREATE POLICY "storage_auth_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('avatars','banners','server-icons','stickers','attachments','server-banners') AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================================
-- 9. SUPABASE REALTIME (PUBLICAÇÕES)
-- =========================================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_bans; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_mutes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_categories; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_xp; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ajuste final: atualizar contadores de membros de servidores
UPDATE public.servers s SET member_count = (SELECT count(*) FROM public.server_members WHERE server_id = s.id) WHERE member_count != (SELECT count(*) FROM public.server_members WHERE server_id = s.id);
