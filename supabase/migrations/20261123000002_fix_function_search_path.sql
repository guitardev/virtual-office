-- Security hardening: lock down mutable search_path on public functions flagged by Supabase Security Advisor
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_official_orders_year_counts',
        'get_attendance_scanner_stats',
        'sync_user_profile_to_attendance_mappings'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.sig);
  END LOOP;
END $$;
