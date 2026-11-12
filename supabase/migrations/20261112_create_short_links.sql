-- =========================================================================
-- Smart MSO Migration: Create Short Links Table, Atomic Click RPC & Realtime
-- Date: 2026-11-12
-- Target: Supabase PostgreSQL (Public Schema)
-- =========================================================================

-- 1. Create table short_links
CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  target_url text NOT NULL,
  title text NOT NULL DEFAULT '',
  division text NOT NULL DEFAULT '',
  click_count bigint NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_links_slug_format_chk CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT short_links_target_protocol_chk CHECK (target_url ~* '^https?://')
);

-- 2. Indexes for listing and creator filtering
CREATE INDEX IF NOT EXISTS idx_short_links_created_at
  ON public.short_links (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_short_links_created_by
  ON public.short_links (created_by);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read short_links" ON public.short_links;
DROP POLICY IF EXISTS "Allow all write short_links" ON public.short_links;

CREATE POLICY "Allow all read short_links"
  ON public.short_links
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all write short_links"
  ON public.short_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Grant Data API access for anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO anon, authenticated;

-- 5. Atomic click counter function (SECURITY INVOKER + fixed search_path)
CREATE OR REPLACE FUNCTION public.increment_short_link_click(link_slug text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.short_links
  SET
    click_count = click_count + 1,
    last_clicked_at = now()
  WHERE slug = lower(trim(link_slug))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_link_click(text) TO anon, authenticated;

-- 6. Add to Supabase Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.short_links;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

