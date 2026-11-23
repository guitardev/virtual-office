-- ยกระดับระบบใบลาอิเล็กทรอนิกส์ (Leave Request v2):
-- 1. รองรับลาครึ่งวัน (morning/afternoon), แบบฟอร์ม 3 (ขอยกเลิกวันลา), สถานะ returned (ตีกลับให้แก้ไข)
-- 2. เก็บลายเซ็นดิจิทัลรายขั้นตอน, เหตุผลตีกลับ, วันหยุดที่ถูกหักออก, และการยกเลิกวันลาบางส่วน/เต็มจำนวน
-- 3. สร้างตารางวันหยุดราชการไทย (thai_public_holidays) + Seed ปี พ.ศ. 2568-2570
-- 4. เปิด Supabase Realtime บน public.leave_requests

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS leave_day_period text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS cancelled_days numeric(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_target_leave_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_target_request_no text,
  ADD COLUMN IF NOT EXISTS cancel_target_leave_type text,
  ADD COLUMN IF NOT EXISTS cancel_target_start_date date,
  ADD COLUMN IF NOT EXISTS cancel_target_end_date date,
  ADD COLUMN IF NOT EXISTS cancel_target_days numeric(5,1),
  ADD COLUMN IF NOT EXISTS applicant_signature text,
  ADD COLUMN IF NOT EXISTS acting_person_signature text,
  ADD COLUMN IF NOT EXISTS verifier_signature text,
  ADD COLUMN IF NOT EXISTS supervisor_signature text,
  ADD COLUMN IF NOT EXISTS approver_signature text,
  ADD COLUMN IF NOT EXISTS attachment_storage text,
  ADD COLUMN IF NOT EXISTS excluded_holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS returned_by_name text,
  ADD COLUMN IF NOT EXISTS returned_note text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.leave_requests'::regclass
      AND contype = 'c'
  LOOP
    IF c.def LIKE '%leave_type%' OR c.def LIKE '%status%' OR c.def LIKE '%leave_day_period%' THEN
      EXECUTE format('ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_leave_type_check
    CHECK (leave_type IN ('sick_leave', 'personal_leave', 'maternity_leave', 'vacation_leave', 'cancel_leave')),
  ADD CONSTRAINT leave_requests_status_check
    CHECK (status IN ('pending_verifier', 'pending_supervisor', 'pending_approver', 'approved', 'rejected', 'returned', 'cancelled')),
  ADD CONSTRAINT leave_requests_day_period_check
    CHECK (leave_day_period IN ('full', 'morning', 'afternoon'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_requests_request_no
  ON public.leave_requests (request_no);

CREATE INDEX IF NOT EXISTS idx_leave_requests_overlap
  ON public.leave_requests (applicant_user_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancel_target
  ON public.leave_requests (cancel_target_leave_id)
  WHERE cancel_target_leave_id IS NOT NULL;

-- ตารางวันหยุดราชการไทย (พ.ศ. / ปีงบประมาณ)
CREATE TABLE IF NOT EXISTS public.thai_public_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thai_public_holidays_fy
  ON public.thai_public_holidays (fiscal_year, holiday_date);

ALTER TABLE public.thai_public_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on thai_public_holidays" ON public.thai_public_holidays;
CREATE POLICY "Allow all on thai_public_holidays"
  ON public.thai_public_holidays FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.thai_public_holidays (holiday_date, name, fiscal_year, created_by)
VALUES
  -- 2025 (พ.ศ. 2568)
  ('2025-01-01', 'วันขึ้นปีใหม่', 2568, 'system_seed'),
  ('2025-02-12', 'วันมาฆบูชา', 2568, 'system_seed'),
  ('2025-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์', 2568, 'system_seed'),
  ('2025-04-07', 'วันชดเชยวันจักรี', 2568, 'system_seed'),
  ('2025-04-13', 'วันสงกรานต์', 2568, 'system_seed'),
  ('2025-04-14', 'วันสงกรานต์', 2568, 'system_seed'),
  ('2025-04-15', 'วันสงกรานต์', 2568, 'system_seed'),
  ('2025-04-16', 'วันชดเชยวันสงกรานต์', 2568, 'system_seed'),
  ('2025-05-04', 'วันฉัตรมงคล', 2568, 'system_seed'),
  ('2025-05-05', 'วันชดเชยวันฉัตรมงคล', 2568, 'system_seed'),
  ('2025-05-09', 'วันพืชมงคล', 2568, 'system_seed'),
  ('2025-05-11', 'วันวิสาขบูชา', 2568, 'system_seed'),
  ('2025-05-12', 'วันชดเชยวันวิสาขบูชา', 2568, 'system_seed'),
  ('2025-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 2568, 'system_seed'),
  ('2025-07-10', 'วันอาสาฬหบูชา', 2568, 'system_seed'),
  ('2025-07-11', 'วันเข้าพรรษา', 2568, 'system_seed'),
  ('2025-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', 2568, 'system_seed'),
  ('2025-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ', 2568, 'system_seed'),
  ('2025-10-13', 'วันนวมินทรมหาราช', 2569, 'system_seed'),
  ('2025-10-23', 'วันปิยมหาราช', 2569, 'system_seed'),
  ('2025-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 วันชาติ และวันพ่อแห่งชาติ', 2569, 'system_seed'),
  ('2025-12-10', 'วันรัฐธรรมนูญ', 2569, 'system_seed'),
  ('2025-12-31', 'วันสิ้นปี', 2569, 'system_seed'),
  -- 2026 (พ.ศ. 2569)
  ('2026-01-01', 'วันขึ้นปีใหม่', 2569, 'system_seed'),
  ('2026-01-02', 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ (ปีใหม่)', 2569, 'system_seed'),
  ('2026-03-03', 'วันมาฆบูชา', 2569, 'system_seed'),
  ('2026-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์', 2569, 'system_seed'),
  ('2026-04-13', 'วันสงกรานต์', 2569, 'system_seed'),
  ('2026-04-14', 'วันสงกรานต์', 2569, 'system_seed'),
  ('2026-04-15', 'วันสงกรานต์', 2569, 'system_seed'),
  ('2026-05-04', 'วันฉัตรมงคล', 2569, 'system_seed'),
  ('2026-05-13', 'วันพืชมงคล', 2569, 'system_seed'),
  ('2026-05-31', 'วันวิสาขบูชา', 2569, 'system_seed'),
  ('2026-06-01', 'วันชดเชยวันวิสาขบูชา', 2569, 'system_seed'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 2569, 'system_seed'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', 2569, 'system_seed'),
  ('2026-07-29', 'วันอาสาฬหบูชา', 2569, 'system_seed'),
  ('2026-07-30', 'วันเข้าพรรษา', 2569, 'system_seed'),
  ('2026-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ', 2569, 'system_seed'),
  ('2026-10-13', 'วันนวมินทรมหาราช', 2570, 'system_seed'),
  ('2026-10-23', 'วันปิยมหาราช', 2570, 'system_seed'),
  ('2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 วันชาติ และวันพ่อแห่งชาติ', 2570, 'system_seed'),
  ('2026-12-07', 'วันชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 วันชาติ และวันพ่อแห่งชาติ', 2570, 'system_seed'),
  ('2026-12-10', 'วันรัฐธรรมนูญ', 2570, 'system_seed'),
  ('2026-12-31', 'วันสิ้นปี', 2570, 'system_seed'),
  -- 2027 (พ.ศ. 2570)
  ('2027-01-01', 'วันขึ้นปีใหม่', 2570, 'system_seed'),
  ('2027-02-21', 'วันมาฆบูชา', 2570, 'system_seed'),
  ('2027-02-22', 'วันชดเชยวันมาฆบูชา', 2570, 'system_seed'),
  ('2027-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์', 2570, 'system_seed'),
  ('2027-04-13', 'วันสงกรานต์', 2570, 'system_seed'),
  ('2027-04-14', 'วันสงกรานต์', 2570, 'system_seed'),
  ('2027-04-15', 'วันสงกรานต์', 2570, 'system_seed'),
  ('2027-05-04', 'วันฉัตรมงคล', 2570, 'system_seed'),
  ('2027-05-20', 'วันวิสาขบูชา', 2570, 'system_seed'),
  ('2027-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 2570, 'system_seed'),
  ('2027-07-18', 'วันอาสาฬหบูชา', 2570, 'system_seed'),
  ('2027-07-19', 'วันเข้าพรรษา', 2570, 'system_seed'),
  ('2027-07-20', 'วันชดเชยวันอาสาฬหบูชา', 2570, 'system_seed'),
  ('2027-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', 2570, 'system_seed'),
  ('2027-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ', 2570, 'system_seed'),
  ('2027-10-13', 'วันนวมินทรมหาราช', 2571, 'system_seed'),
  ('2027-10-23', 'วันปิยมหาราช', 2571, 'system_seed'),
  ('2027-10-25', 'วันชดเชยวันปิยมหาราช', 2571, 'system_seed'),
  ('2027-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 วันชาติ และวันพ่อแห่งชาติ', 2571, 'system_seed'),
  ('2027-12-06', 'วันชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 วันชาติ และวันพ่อแห่งชาติ', 2571, 'system_seed'),
  ('2027-12-10', 'วันรัฐธรรมนูญ', 2571, 'system_seed'),
  ('2027-12-31', 'วันสิ้นปี', 2571, 'system_seed')
ON CONFLICT (holiday_date) DO NOTHING;

-- เปิด Supabase Realtime Publication สำหรับ public.leave_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leave_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
  END IF;
END $$;
