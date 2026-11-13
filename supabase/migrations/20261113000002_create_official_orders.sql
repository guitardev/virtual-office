-- ==============================================================================
-- Smart MSO Data Hub: Official Orders & Announcements Repository
-- Date: 2026-11-13
-- Description:
--   1. Enable pg_trgm for fast partial/fuzzy Thai & numeric search.
--   2. Create `public.official_orders` with structured `order_seq` & `order_year_be`.
--   3. Create unique, composite, and GIN trigram indexes.
--   4. Create `get_official_orders_year_counts()` RPC for fast year filter pills.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.official_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_category TEXT NOT NULL DEFAULT 'order'
    CHECK (doc_category IN ('order', 'announcement', 'regulation')),
  doc_number_raw TEXT NOT NULL,
  order_seq INTEGER,
  order_year_be SMALLINT NOT NULL CHECK (order_year_be BETWEEN 2500 AND 2700),
  issued_date DATE NOT NULL,
  title TEXT NOT NULL,
  issuer_org TEXT NOT NULL DEFAULT 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
  division TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'amended', 'revoked')),
  supersedes_order_id UUID REFERENCES public.official_orders(id) ON DELETE SET NULL,
  nas_path TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  search_normalized TEXT NOT NULL DEFAULT '',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1. Prevent duplicate order numbers within same category, issuer, and year
CREATE UNIQUE INDEX IF NOT EXISTS idx_official_orders_unique_num
  ON public.official_orders (doc_category, issuer_org, order_year_be, doc_number_raw)
  WHERE is_deleted = false;

-- 2. Fast year + category + numeric sequence sorting
CREATE INDEX IF NOT EXISTS idx_official_orders_year_cat_seq
  ON public.official_orders (order_year_be DESC, doc_category, order_seq DESC NULLS LAST, issued_date DESC)
  WHERE is_deleted = false;

-- 3. Fast partial / fuzzy search via pg_trgm GIN index
CREATE INDEX IF NOT EXISTS idx_official_orders_search_trgm
  ON public.official_orders USING gin (search_normalized gin_trgm_ops)
  WHERE is_deleted = false;

-- 4. RLS Policies
ALTER TABLE public.official_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read official_orders" ON public.official_orders;
CREATE POLICY "Allow all read official_orders"
  ON public.official_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all write official_orders" ON public.official_orders;
CREATE POLICY "Allow all write official_orders"
  ON public.official_orders FOR ALL USING (true) WITH CHECK (true);

-- 5. Fast year counts RPC for Data Hub filter pills
CREATE OR REPLACE FUNCTION public.get_official_orders_year_counts()
RETURNS TABLE (
  order_year_be SMALLINT,
  total_count BIGINT,
  order_count BIGINT,
  announcement_count BIGINT,
  regulation_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    o.order_year_be,
    COUNT(*)::BIGINT AS total_count,
    COUNT(*) FILTER (WHERE o.doc_category = 'order')::BIGINT AS order_count,
    COUNT(*) FILTER (WHERE o.doc_category = 'announcement')::BIGINT AS announcement_count,
    COUNT(*) FILTER (WHERE o.doc_category = 'regulation')::BIGINT AS regulation_count
  FROM public.official_orders o
  WHERE o.is_deleted = false
  GROUP BY o.order_year_be
  ORDER BY o.order_year_be DESC;
$$;

