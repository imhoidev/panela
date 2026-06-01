-- Fix owner level from 99 → 100 in the auto-membership trigger
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, level)
    VALUES (NEW.id, NEW.owner_id, 100)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.channels (server_id, name, type, position)
    VALUES (NEW.id, 'geral', 'text', 0)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- Fix existing servers where owner level was stored as 99
UPDATE public.server_members
SET level = 100
FROM public.servers
WHERE servers.id = server_members.server_id
  AND servers.owner_id = server_members.user_id
  AND server_members.level = 99;
