-- ตารางกำหนดสิทธิ์ผู้พิจารณาใบลารายบุคคล (ผู้ตรวจสอบ / ผู้บังคับบัญชา / ผู้มีอำนาจสั่งอนุญาต)
CREATE TABLE IF NOT EXISTS public.leave_authorized_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  division text NOT NULL DEFAULT '',
  can_verify boolean NOT NULL DEFAULT false,
  can_supervisor boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  granted_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.leave_authorized_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leave_authorized_roles" ON public.leave_authorized_roles;
CREATE POLICY "Allow all on leave_authorized_roles" ON public.leave_authorized_roles FOR ALL USING (true) WITH CHECK (true);
