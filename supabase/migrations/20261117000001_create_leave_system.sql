-- ระบบใบลา (Leave Request System) รองรับ 2 แบบฟอร์ม:
-- 1. ใบลาป่วย / ลาคลอดบุตร / ลากิจส่วนตัว
-- 2. ใบลาพักผ่อน
-- พร้อมเชื่อมโยงกับ attendance_daily_notes และ attendance_user_mappings

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('sick_leave', 'personal_leave', 'maternity_leave', 'vacation_leave')),
  written_at text NOT NULL DEFAULT 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
  written_date date NOT NULL DEFAULT CURRENT_DATE,
  subject text NOT NULL,
  to_recipient text NOT NULL DEFAULT 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
  applicant_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  applicant_position text NOT NULL DEFAULT '',
  applicant_division text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_working_days numeric(5,1) NOT NULL DEFAULT 1,
  last_leave_type text,
  last_leave_start_date date,
  last_leave_end_date date,
  last_leave_days numeric(5,1),
  contact_info text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  vacation_accumulated_days numeric(5,1) NOT NULL DEFAULT 0,
  vacation_annual_days numeric(5,1) NOT NULL DEFAULT 10,
  acting_person_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  acting_person_name text NOT NULL DEFAULT '',
  acting_person_position text NOT NULL DEFAULT '',
  fiscal_year integer NOT NULL,
  prev_sick_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_personal_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_maternity_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_vacation_days numeric(5,1) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_verifier' CHECK (status IN ('pending_verifier', 'pending_supervisor', 'pending_approver', 'approved', 'rejected', 'cancelled')),
  verifier_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  verifier_name text,
  verifier_position text,
  verifier_note text,
  verified_at timestamptz,
  supervisor_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  supervisor_name text,
  supervisor_position text,
  supervisor_comment text,
  supervisor_reviewed_at timestamptz,
  approver_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  approver_name text,
  approver_position text,
  order_decision text CHECK (order_decision IN ('approved', 'rejected')),
  order_comment text,
  ordered_at timestamptz,
  attachment_url text,
  attachment_name text,
  synced_to_attendance boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  sync_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_applicant ON public.leave_requests (applicant_user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests (start_date, end_date);

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  sick_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  personal_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  maternity_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  vacation_accumulated_days numeric(5,1) NOT NULL DEFAULT 0,
  vacation_annual_days numeric(5,1) NOT NULL DEFAULT 10,
  vacation_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fiscal_year)
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leave_requests" ON public.leave_requests;
CREATE POLICY "Allow all on leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on leave_balances" ON public.leave_balances;
CREATE POLICY "Allow all on leave_balances" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);
