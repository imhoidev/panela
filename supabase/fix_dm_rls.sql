-- Helper functions that bypass RLS to see all participants in conversations you belong to
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_dm_participants(conv_ids UUID[])
RETURNS TABLE(conversation_id UUID, user_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.conversation_id, p.user_id
  FROM public.dm_participants p
  WHERE p.conversation_id = ANY(conv_ids)
    AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = p.conversation_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_dm_participants_single(conv_id UUID)
RETURNS TABLE(conversation_id UUID, user_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.conversation_id, p.user_id
  FROM public.dm_participants p
  WHERE p.conversation_id = conv_id
    AND EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = conv_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_shared_dm_conversation(other_user_id UUID)
RETURNS TABLE(conversation_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p1.conversation_id
  FROM public.dm_participants p1
  JOIN public.dm_participants p2 ON p2.conversation_id = p1.conversation_id
  WHERE p1.user_id = auth.uid() AND p2.user_id = other_user_id
  LIMIT 1;
$$;
