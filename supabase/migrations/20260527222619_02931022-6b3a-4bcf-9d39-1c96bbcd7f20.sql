
-- Slug helpers for servers
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )),
  '')
$$;

CREATE OR REPLACE FUNCTION public.servers_ensure_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  -- normalize provided slug if any
  IF NEW.slug IS NOT NULL THEN
    NEW.slug := public.slugify(NEW.slug);
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := COALESCE(public.slugify(NEW.name), 'panela');
    base := left(base, 28);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.servers WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
      IF n > 20 THEN EXIT; END IF;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    -- if user supplied, ensure uniqueness (raise if taken on update)
    IF EXISTS (SELECT 1 FROM public.servers WHERE slug = NEW.slug AND id <> NEW.id) THEN
      RAISE EXCEPTION 'slug_taken' USING ERRCODE = '23505';
    END IF;
    NEW.slug := left(NEW.slug, 32);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_servers_ensure_slug ON public.servers;
CREATE TRIGGER trg_servers_ensure_slug
  BEFORE INSERT OR UPDATE OF slug, name ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.servers_ensure_slug();

-- Backfill existing rows with NULL slug
UPDATE public.servers SET slug = NULL WHERE slug IS NULL;
-- Trigger fires on update to regenerate
UPDATE public.servers SET name = name WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS servers_slug_idx ON public.servers (slug);
