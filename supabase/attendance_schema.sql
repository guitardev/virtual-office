-- ==============================================================================
-- Smart MSO: Attendance Logs Schema for Supabase Cloud (Hybrid Architecture)
-- นำโค้ดนี้ไปรันใน Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. ตารางบันทึกเวลาการปฏิบัติราชการ (attendance_logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    record_uid TEXT UNIQUE NOT NULL,
    scanner_user_id INTEGER NOT NULL,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    member_id TEXT,
    member_name TEXT NOT NULL,
    division TEXT DEFAULT '',
    position TEXT DEFAULT '',
    scan_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    original_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    io_mode SMALLINT NOT NULL DEFAULT 1,
    io_label TEXT NOT NULL,
    verify_mode SMALLINT NOT NULL DEFAULT 1,
    verify_label TEXT NOT NULL,
    machine_id INTEGER DEFAULT 1,
    source TEXT DEFAULT 'device',
    is_edited BOOLEAN DEFAULT false,
    edited_by TEXT,
    edited_at TIMESTAMP WITH TIME ZONE,
    edit_note TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ตารางการจับคู่รหัสเครื่องสแกน (User ID) กับบุคลากร (attendance_user_mappings)
CREATE TABLE IF NOT EXISTS public.attendance_user_mappings (
    scanner_user_id INTEGER PRIMARY KEY CHECK (scanner_user_id BETWEEN 1 AND 64),
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    division TEXT DEFAULT '',
    position TEXT DEFAULT '',
    is_mapped BOOLEAN NOT NULL DEFAULT false,
    match_method TEXT NOT NULL DEFAULT 'unmapped' CHECK (match_method IN ('manual', 'auto_name', 'unmapped')),
    updated_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. ตารางกำหนดสิทธิ์ผู้แก้ไขเวลา (attendance_authorized_editors)
CREATE TABLE IF NOT EXISTS public.attendance_authorized_editors (
    member_id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    member_name TEXT NOT NULL,
    division TEXT DEFAULT '',
    role TEXT DEFAULT 'member',
    granted_by TEXT,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. สร้าง Indexes เพื่อความรวดเร็วในการ Query
CREATE INDEX IF NOT EXISTS idx_attendance_scan_time ON public.attendance_logs (scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_logs (scanner_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON public.attendance_logs (member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_is_deleted ON public.attendance_logs (is_deleted);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_mappings_user_id ON public.attendance_user_mappings (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id_ts ON public.attendance_logs (user_id, scan_timestamp DESC) WHERE is_deleted = false AND user_id IS NOT NULL;

-- 5. เปิดสิทธิ์ Row Level Security (RLS)
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_authorized_editors ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับ attendance_logs
DROP POLICY IF EXISTS "Allow all for attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow all for attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

-- Policy สำหรับ attendance_user_mappings
DROP POLICY IF EXISTS "Allow all for attendance_user_mappings" ON public.attendance_user_mappings;
CREATE POLICY "Allow all for attendance_user_mappings" ON public.attendance_user_mappings FOR ALL USING (true) WITH CHECK (true);

-- Policy สำหรับ attendance_authorized_editors
DROP POLICY IF EXISTS "Allow all for attendance_authorized_editors" ON public.attendance_authorized_editors;
CREATE POLICY "Allow all for attendance_authorized_editors" ON public.attendance_authorized_editors FOR ALL USING (true) WITH CHECK (true);

-- เปิด Supabase Realtime สำหรับตารางนี้
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;

