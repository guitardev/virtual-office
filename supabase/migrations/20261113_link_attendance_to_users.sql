-- ==============================================================================
-- Smart MSO: Link Attendance Tables to public.users & Add Scanner Stats RPC
-- Date: 2026-11-13
-- Description:
--   1. Add foreign-key `user_id` columns referencing `public.users(id)` on
--      `attendance_user_mappings`, `attendance_logs`, and `attendance_authorized_editors`.
--   2. Add `is_mapped` & `match_method` metadata to `attendance_user_mappings`.
--   3. Create partial & composite indexes for fast per-user queries.
--   4. Create `get_attendance_scanner_stats()` RPC for fast 64-slot scan counts.
--   5. Create trigger to keep `attendance_user_mappings` synced when `public.users` updates.
-- ==============================================================================

-- 1. Extend attendance_user_mappings
ALTER TABLE public.attendance_user_mappings
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_mapped BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS match_method TEXT NOT NULL DEFAULT 'unmapped';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_user_mappings_match_method_check'
  ) THEN
    ALTER TABLE public.attendance_user_mappings
      ADD CONSTRAINT attendance_user_mappings_match_method_check
      CHECK (match_method IN ('manual', 'auto_name', 'unmapped'));
  END IF;
END $$;

-- 2. Extend attendance_logs & attendance_authorized_editors with FK to public.users
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_authorized_editors
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Indexes (Partial, Unique & Composite for 1-to-1 integrity and query performance)
-- Ensure no duplicate user_id exists before creating unique partial index (keep most recently updated row)
WITH ranked_duplicates AS (
  SELECT
    scanner_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, scanner_user_id ASC
    ) AS rn
  FROM public.attendance_user_mappings
  WHERE user_id IS NOT NULL
)
UPDATE public.attendance_user_mappings m
SET
  user_id = NULL,
  member_id = 'scanner_uid_' || m.scanner_user_id,
  is_mapped = false,
  match_method = 'unmapped'
FROM ranked_duplicates d
WHERE m.scanner_user_id = d.scanner_user_id
  AND d.rn > 1;

DROP INDEX IF EXISTS public.idx_attendance_mappings_user_id;
CREATE UNIQUE INDEX idx_attendance_mappings_user_id
  ON public.attendance_user_mappings (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id_ts
  ON public.attendance_logs (user_id, scan_timestamp DESC)
  WHERE is_deleted = false AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_editors_user_id
  ON public.attendance_authorized_editors (user_id)
  WHERE user_id IS NOT NULL;

-- 4. Backfill existing matches against public.users
UPDATE public.attendance_user_mappings m
SET
  user_id = u.id,
  is_mapped = true,
  match_method = 'manual'
FROM public.users u
WHERE m.member_id = u.id
  AND m.user_id IS NULL;

UPDATE public.attendance_user_mappings m
SET
  is_mapped = true,
  match_method = 'manual'
WHERE m.is_mapped = false
  AND m.member_id IS NOT NULL
  AND m.member_id NOT LIKE 'scanner_uid_%';

UPDATE public.attendance_logs l
SET user_id = m.user_id
FROM public.attendance_user_mappings m
WHERE l.scanner_user_id = m.scanner_user_id
  AND m.user_id IS NOT NULL
  AND l.user_id IS DISTINCT FROM m.user_id;

UPDATE public.attendance_authorized_editors e
SET user_id = u.id
FROM public.users u
WHERE e.member_id = u.id
  AND e.user_id IS NULL;

-- 5. RPC: Fast per-scanner-ID scan counts & latest timestamp (returns <= 64 rows)
CREATE OR REPLACE FUNCTION public.get_attendance_scanner_stats()
RETURNS TABLE (
  scanner_user_id INTEGER,
  scan_count BIGINT,
  last_scan_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    l.scanner_user_id,
    COUNT(*)::BIGINT AS scan_count,
    MAX(l.scan_timestamp) AS last_scan_at
  FROM public.attendance_logs l
  WHERE l.is_deleted = false
  GROUP BY l.scanner_user_id
  ORDER BY l.scanner_user_id;
$$;

-- 6. Trigger: Keep mapped user display info synced if public.users profile changes
CREATE OR REPLACE FUNCTION public.sync_user_profile_to_attendance_mappings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.division IS DISTINCT FROM OLD.division OR
    NEW.position IS DISTINCT FROM OLD.position
  ) THEN
    UPDATE public.attendance_user_mappings
    SET
      member_name = NEW.name,
      division = COALESCE(NEW.division, ''),
      position = COALESCE(NEW.position, ''),
      updated_at = timezone('utc'::text, now())
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_profile_to_attendance_mappings ON public.users;
CREATE TRIGGER trg_sync_user_profile_to_attendance_mappings
  AFTER UPDATE OF name, division, position ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_to_attendance_mappings();

