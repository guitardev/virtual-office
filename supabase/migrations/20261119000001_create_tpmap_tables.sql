-- ตารางจัดเก็บข้อมูลความยากจนแบบชี้เป้า (TPMAP) จังหวัดกำแพงเพชร (รหัส 62) ปี 2565–2569
CREATE TABLE IF NOT EXISTS public.tpmap_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL,
  province_id text NOT NULL DEFAULT '62',
  dataset_group text NOT NULL CHECK (dataset_group IN ('card', 'all', 'nocard')),
  area_level text NOT NULL CHECK (area_level IN ('amphur', 'tambol')),
  area_id text NOT NULL,
  area_name text NOT NULL,
  amphur_id text NOT NULL,
  amphur_name text NOT NULL DEFAULT '',
  poor_household_cnt integer NOT NULL DEFAULT 0,
  poor_jpt_cnt integer NOT NULL DEFAULT 0,
  poor_mofreg_cnt integer NOT NULL DEFAULT 0,
  poor_mofval_cnt integer NOT NULL DEFAULT 0,
  dim_health integer NOT NULL DEFAULT 0,
  dim_living integer NOT NULL DEFAULT 0,
  dim_education integer NOT NULL DEFAULT 0,
  dim_income integer NOT NULL DEFAULT 0,
  dim_accessibility integer NOT NULL DEFAULT 0,
  pov_rate numeric(8,4) NOT NULL DEFAULT 0,
  indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, dataset_group, area_level, area_id)
);

CREATE INDEX IF NOT EXISTS idx_tpmap_records_lookup
  ON public.tpmap_records (fiscal_year, dataset_group, area_level, poor_mofval_cnt DESC);

CREATE INDEX IF NOT EXISTS idx_tpmap_records_amphur
  ON public.tpmap_records (amphur_id);

ALTER TABLE public.tpmap_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on tpmap_records" ON public.tpmap_records;
CREATE POLICY "Allow all on tpmap_records" ON public.tpmap_records FOR ALL USING (true) WITH CHECK (true);
