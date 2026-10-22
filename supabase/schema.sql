-- =========================================================================
-- Smart MSO — Database Schema & Initial Seed (Supabase PostgreSQL)
-- Version: v1.4.5 (Phase 11 Compatible - Fleet, RBAC, Realtime & Live Sync)
-- =========================================================================

-- 0. Clean reset to ensure compatible types and no conflicting constraints
drop table if exists files cascade;
drop table if exists tasks cascade;
drop table if exists messages cascade;
drop table if exists chat_channels cascade;
drop table if exists meetings cascade;
drop table if exists organization_members cascade;
drop table if exists car_bookings cascade;
drop table if exists vehicles cascade;
drop table if exists access_requests cascade;
drop table if exists users cascade;
drop table if exists organizations cascade;
drop table if exists audit_logs cascade;

-- ===============================
-- 1. Organizations
-- ===============================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

alter table organizations enable row level security;
create policy "Allow all read organizations" on organizations for select using (true);
create policy "Allow all write organizations" on organizations for all using (true);

-- ===============================
-- 2. Users (ข้าราชการและบุคลากรภาครัฐ)
-- ===============================
create table users (
  id text primary key default gen_random_uuid()::text,
  prefix text default 'นาย',
  first_name text not null,
  last_name text not null,
  nickname text, -- ชื่อเล่น (เช่น เสก, บอย, เจมส์, ขวัญ)
  name text not null,
  personnel_type text default 'ข้าราชการ' check (personnel_type in ('ข้าราชการ', 'ลูกจ้างประจำ', 'พนักงานราชการ', 'พนักงานกองทุน', 'พนักงานจ้างเหมาบริการ', 'เจ้าหน้าที่โครงการ', 'ที่ปรึกษา/ผู้ทรงคุณวุฒิ', 'ที่ปรึกษา / ผู้ทรงคุณวุฒิ')),
  position text not null,
  division text not null, -- กลุ่ม/ฝ่าย (เช่น กลุ่มนโยบายและวิชาการ)
  email text unique not null,
  phone text,
  line_id text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'manager', 'member', 'guest')),
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now()
);

alter table users enable row level security;
create policy "Allow all read users" on users for select using (true);
create policy "Allow all write users" on users for all using (true);

-- ===============================
-- 3. Organization Members
-- ===============================
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member', 'guest')),
  joined_at timestamptz default now(),
  unique (organization_id, user_id)
);

alter table organization_members enable row level security;
create policy "Allow all read organization_members" on organization_members for select using (true);
create policy "Allow all write organization_members" on organization_members for all using (true);

-- ===============================
-- 4. Chat Channels & Groups (ห้องสื่อสารตามกลุ่มงาน)
-- ===============================
create table chat_channels (
  id text primary key,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  division text,
  description text,
  icon text default '💬',
  type text default 'division' check (type in ('announcement', 'division', 'custom', 'channel', 'dm', 'group')),
  is_official boolean default true,
  member_ids text[] default '{}',
  pinned_message_ids text[] default '{}',
  created_by text,
  created_at timestamptz default now()
);

alter table chat_channels enable row level security;
create policy "Allow all read chat_channels" on chat_channels for select using (true);
create policy "Allow all write chat_channels" on chat_channels for all using (true);

-- ===============================
-- 5. Messages (ข้อความแชทและเอกสารแนบ)
-- ===============================
create table messages (
  id text primary key default gen_random_uuid()::text,
  channel_id text references chat_channels(id) on delete cascade,
  user_id text references users(id) on delete set null,
  sender_name text not null,
  sender_avatar text,
  sender_role text default 'member',
  sender_position text,
  content text not null,
  tag text, -- เช่น [ด่วนที่สุด], [หนังสือเวียน], [รายงานการประชุม]
  attachment_url text,
  attachment_metadata jsonb,
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "Allow all read messages" on messages for select using (true);
create policy "Allow all write messages" on messages for all using (true);

-- ===============================
-- 6. Tasks (กระดานงาน Kanban)
-- ===============================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id text references users(id) on delete set null,
  due_date date,
  created_at timestamptz default now()
);

alter table tasks enable row level security;
create policy "Allow all read tasks" on tasks for select using (true);
create policy "Allow all write tasks" on tasks for all using (true);

-- ===============================
-- 7. Meetings (การประชุมและนัดหมาย)
-- ===============================
create table meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meeting_link text,
  location text,
  description text,
  category text default 'general',
  attendees jsonb default '[]'::jsonb,
  organizer jsonb default '{}'::jsonb,
  status text default 'confirmed',
  created_at timestamptz default now()
);

alter table meetings enable row level security;
create policy "Allow all read meetings" on meetings for select using (true);
create policy "Allow all write meetings" on meetings for all using (true);

-- ===============================
-- 8. Files (คลังเอกสารและไฟล์แนบ)
-- ===============================
create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id text references users(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);

alter table files enable row level security;
create policy "Allow all read files" on files for select using (true);
create policy "Allow all write files" on files for all using (true);

-- ===============================
-- 9. Access Requests (คำขอสิทธิ์เข้าใช้งานใหม่)
-- ===============================
create table access_requests (
  id text primary key,
  prefix text default 'นาย',
  first_name text not null,
  last_name text not null,
  nickname text,
  name text not null,
  personnel_type text default 'ข้าราชการ',
  position text not null,
  division text not null,
  email text not null,
  phone text,
  line_id text,
  requested_role text default 'member' check (requested_role in ('admin', 'manager', 'member', 'guest')),
  approved_role text check (approved_role in ('admin', 'manager', 'member', 'guest')),
  reason text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table access_requests enable row level security;
create policy "Allow all read access_requests" on access_requests for select using (true);
create policy "Allow all write access_requests" on access_requests for all using (true);

-- ===============================
-- 10. Vehicles (ยานพาหนะส่วนกลาง พมจ.กำแพงเพชร)
-- ===============================
create table vehicles (
  id text primary key,
  name text not null,
  license_plate text not null,
  category text not null check (category in ('รถตู้ส่วนกลาง', 'รถกระบะตรวจการณ์', 'รถยนต์นั่งส่วนบุคคล', 'รถกระบะบรรทุก', 'รถตู้ VIP ผู้บริหาร', 'รถจักรยานยนต์')),
  capacity integer not null default 4,
  driver_name text,
  fuel_type text not null default 'ดีเซล B7',
  status text not null default 'available' check (status in ('available', 'in_use', 'maintenance')),
  image text,
  features text[] default '{}',
  mileage integer not null default 0,
  fuel_level text not null default 'เต็มถัง (100%)',
  last_maintenance_date text,
  insurance_expiry text,
  assigned_division text default 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)',
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Allow all read vehicles" on vehicles for select using (true);
create policy "Allow all write vehicles" on vehicles for all using (true);

-- ===============================
-- 11. Car Bookings (ระบบคำขอจองรถยนต์ราชการ 7 ขั้นตอน)
-- ===============================
create table car_bookings (
  id text primary key,
  request_no text not null,
  vehicle_id text references vehicles(id) on delete restrict,
  vehicle_name text not null,
  license_plate text not null,
  
  -- ผู้ขอใช้รถ (ขั้นตอนที่ 1)
  requester_id text references users(id) on delete set null,
  requester_name text not null,
  requester_position text,
  requester_division text,
  requester_phone text,
  
  -- รายละเอียดภารกิจ
  purpose text not null,
  destination text not null,
  origin text not null default 'สำนักงาน พมจ.กำแพงเพชร',
  departure_time text not null,
  return_time text not null,
  passenger_count integer not null default 1,
  passengers_list text,
  estimated_distance numeric(10, 2),
  require_driver boolean not null default true,
  assigned_driver text,
  
  -- งบประมาณค่าน้ำมันเชื้อเพลิง (ถ้ามี)
  fuel_budget_requested boolean default false,
  fuel_budget_amount numeric(10, 2),
  fuel_budget_source text,
  
  -- สถานะคำขอ 7 ขั้นตอน
  status text not null default 'pending_division_head' check (status in (
    'pending_division_head',
    'pending_fleet_assignment',
    'pending_admin_head',
    'pending_provincial',
    'pending_review',
    'endorsed',
    'approved',
    'rejected',
    'completed'
  )),
  created_at text not null,
  
  -- ขั้นตอนที่ 1 & 2: ความเห็นชอบของหัวหน้ากลุ่ม/ฝ่าย หรือ ข้าราชการในกลุ่มตนเอง
  division_reviewer_id text,
  division_reviewer_name text,
  division_reviewer_position text,
  division_reviewer_role text,
  division_reviewer_notes text,
  division_reviewer_action_at text,

  -- ขั้นตอนที่ 3: บุคคลฝ่ายบริหาร จัดสรรรถและคนขับ
  fleet_dispatcher_id text,
  fleet_dispatcher_name text,
  fleet_dispatcher_position text,
  fleet_dispatcher_notes text,
  fleet_dispatcher_action_at text,
  
  -- ขั้นตอนที่ 4.1: หัวหน้าฝ่ายบริหารทั่วไป เพื่อเห็นชอบ
  admin_head_id text,
  admin_head_name text,
  admin_head_notes text,
  admin_head_action_at text,

  -- ข้อมูลเดิม (Backward-compatibility)
  manager_id text,
  manager_name text,
  manager_notes text,
  manager_action_at text,
  
  -- ขั้นตอนที่ 4.2: การอนุมัติของ พมจ.กำแพงเพชร
  approver_id text,
  approver_name text,
  approver_notes text,
  approver_action_at text,
  
  -- บันทึกการปฏิเสธ / ส่งกลับ
  reject_reason text,
  rejected_by text,
  
  -- ขั้นตอนที่ 5 & 7: รายละเอียดการส่งคืนกุญแจ และการแจ้งปัญหาซ่อมบำรุง
  key_returned boolean default false,
  has_issue_reported boolean default false,
  issue_report_details text,
  needs_maintenance boolean default false,
  
  -- รายงานส่งคืนและตรวจสภาพรถ (JSON)
  return_report jsonb,
  
  -- ประวัติการแจ้งเตือน (JSON array)
  notifications jsonb default '[]'::jsonb
);

alter table car_bookings enable row level security;
create policy "Allow all read car_bookings" on car_bookings for select using (true);
create policy "Allow all write car_bookings" on car_bookings for all using (true);

-- ===============================
-- 12. Audit Logs (บันทึกประวัติกิจกรรมระบบ)
-- ===============================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz default now(),
  actor_id text,
  actor_name text not null,
  action text not null,
  target text not null,
  status text check (status in ('success', 'denied')) default 'success',
  metadata jsonb
);

alter table audit_logs enable row level security;
create policy "Allow all read audit_logs" on audit_logs for select using (true);
create policy "Allow all write audit_logs" on audit_logs for insert with check (true);

-- ===============================
-- 13. Enable Realtime Publications
-- ===============================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table users;
    alter publication supabase_realtime add table access_requests;
    alter publication supabase_realtime add table vehicles;
    alter publication supabase_realtime add table car_bookings;
    alter publication supabase_realtime add table tasks;
    alter publication supabase_realtime add table messages;
  end if;
exception
  when others then null;
end $$;

-- =========================================================================
-- SEED DATA SECTION
-- =========================================================================

-- 1. Initial Organization
insert into organizations (id, name, logo_url)
values ('00000000-0000-0000-0000-000000000001', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร', null)
on conflict (id) do nothing;

-- 2. Initial Personnel (ทำเนียบจริง พมจ. กำแพงเพชร)
insert into users (id, prefix, first_name, last_name, nickname, name, personnel_type, position, division, email, phone, line_id, role, avatar_url)
values
  ('usr_2', 'นาย', 'เสกพล', 'ดิษฐโชติ', 'เสก', 'นายเสกพล ดิษฐโชติ', 'ข้าราชการ', 'นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)', 'ฝ่ายบริหารทั่วไป', 'sekpol.d@m-society.go.th', '055-705031 ต่อ 102', 'sek_kpp', 'manager', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/2b6d8e58-bfd5-44a7-a18d-4fb8e685452f-e1734057934925.png'),
  ('usr_3', 'นาย', 'วรวุฒิ', 'พึ่งพัก', 'เจมส์', 'นายวรวุฒิ พึ่งพัก', 'ข้าราชการ', 'นักพัฒนาสังคมชำนาญการพิเศษ (หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ)', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'worawut.p@m-society.go.th', '055-705031 ต่อ 104', 'james_kpp', 'manager', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e735d8a3-9afc-4271-803e-0438ae7cb5371-1-1-e1731912123637.png'),
  ('usr_4', 'นาย', 'พนมศักย์', 'บริภัทรจิรากร', 'บอย', 'นายพนมศักย์ บริภัทรจิรากร', 'ข้าราชการ', 'นักพัฒนาสังคมชำนาญการ (รักษาการหัวหน้ากลุ่มนโยบายและวิชาการ)', 'กลุ่มนโยบายและวิชาการ', 'phanomsak.b@m-society.go.th', '055-705031 ต่อ 103', 'boy_kpp', 'manager', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B2%E0%B8%A7-1-1-e1734061864108.png'),
  ('usr_5', 'นางสาว', 'ขวัญนภา', 'ศิริสมบัติ', 'ขวัญ', 'นางสาวขวัญนภา ศิริสมบัติ', 'พนักงานราชการ', 'เจ้าหน้าที่ระบบงานคอมพิวเตอร์', 'กลุ่มนโยบายและวิชาการ', 'kwannapa.s@m-society.go.th', '055-705031 ต่อ 106', 'kwan_kpp', 'member', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/a864cd1c-9230-490f-b838-5f62aa24bfca-e1732079225217.png'),
  ('usr_6', 'นางสาว', 'สุมาลี', 'แสงแก้ว', 'ส้ม', 'นางสาวสุมาลี แสงแก้ว', 'พนักงานกองทุน', 'นักสังคมสงเคราะห์ (เจ้าหน้าที่กองทุนส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการ)', 'ศูนย์บริการคนพิการจังหวัดกำแพงเพชร', 'sumalee.s@m-society.go.th', '055-705031 ต่อ 107', 'som_kpp', 'member', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e69828cb-560e-4c87-a197-91e98179257a-e1732768762731.png'),
  ('usr_7', 'นางสาว', 'พิชชาภา', 'ห้าวหาญ', 'ญาญ่า', 'นางสาวพิชชาภา ห้าวหาญ', 'ข้าราชการ', 'นักสังคมสงเคราะห์ปฏิบัติการ', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'pitchapa.h@m-society.go.th', '055-705031 ต่อ 108', 'yaya_kpp', 'member', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/88a864d8-a374-4867-87c8-4daa2671153e-e1734057993409.png'),
  ('usr_8', 'นางสาว', 'อารีวรรณ', 'ประเสริฐอุดมศักดิ์', 'ดาว', 'นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์', 'ข้าราชการ', 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน (การเงินและบัญชี)', 'ฝ่ายบริหารทั่วไป', 'areewan.p@m-society.go.th', '055-705031 ต่อ 109', 'dao_kpp', 'member', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%99%E0%B8%A1%E0%B8%A8%E0%B8%B1%E0%B8%81%E0%B8%A2%E0%B9%8C-%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A0%E0%B8%B1%E0%B8%97%E0%B8%A3%E0%B8%88%E0%B8%B4%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3-1-e1734061426233.png'),
  ('usr_9', 'นาย', 'สมหมาย', 'มั่นคง', 'หมาย', 'นายสมหมาย มั่นคง', 'ลูกจ้างประจำ', 'พนักงานขับรถยนต์ ชำนาญงาน (งานยานพาหนะ)', 'ฝ่ายบริหารทั่วไป', 'sommai.m@m-society.go.th', '055-705031 ต่อ 110', 'sommai_van', 'member', null),
  ('usr_10', 'นาย', 'ธีรพัฒน์', 'บุญยืน', 'อาร์ม', 'นายธีรพัฒน์ บุญยืน', 'พนักงานจ้างเหมาบริการ', 'เจ้าหน้าที่สนับสนุนงานสารบรรณและเทคโนโลยีดิจิทัล', 'ฝ่ายบริหารทั่วไป', 'theerapat.b@m-society.go.th', '055-705031 ต่อ 111', 'arm_kpp', 'member', null),
  ('usr_11', 'ดร.', 'ศรัณย์', 'สิทธิโชค', 'รัน', 'ดร. ศรัณย์ สิทธิโชค', 'ที่ปรึกษา/ผู้ทรงคุณวุฒิ', 'ผู้ทรงคุณวุฒิด้านสวัสดิการสังคม (คณะอนุกรรมการฟื้นฟูสมรรถภาพคนพิการ)', 'คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก', 'saran.s@socialadvisor.org', '089-854-1234', 'dr_saran', 'guest', null)
on conflict (id) do update set
  prefix = excluded.prefix,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  nickname = excluded.nickname,
  name = excluded.name,
  personnel_type = excluded.personnel_type,
  position = excluded.position,
  division = excluded.division,
  email = excluded.email,
  phone = excluded.phone,
  line_id = excluded.line_id,
  role = excluded.role,
  avatar_url = excluded.avatar_url;

-- 4. Initial Vehicles (ยานพาหนะส่วนกลาง 10 คัน)
insert into vehicles (id, name, license_plate, category, capacity, driver_name, fuel_type, status, image, features, mileage, fuel_level, last_maintenance_date, insurance_expiry, assigned_division)
values
  ('veh_1', 'รถประจำตำแหน่ง พมจ. (กน 7872 กำแพงเพชร)', 'กน 7872 กำแพงเพชร', 'รถยนต์นั่งส่วนบุคคล', 5, 'พนักงานขับรถประจำตำแหน่ง พมจ.', 'เบนซิน ไฮบริด (E20)', 'available', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80', array['รถประจำตำแหน่ง พมจ.', '5 ที่นั่ง', 'ภารกิจผู้บริหารระดับสูง', 'GPS ติดตามรถ'], 42350, 'เต็มถัง (100%)', '5 ต.ค. 2569', '31 ธ.ค. 2570', 'สำนักงาน พมจ. (ประจำตำแหน่งผู้บริหาร)'),
  ('veh_2', 'รถยนต์ส่วนกลาง (กน 8121 กำแพงเพชร)', 'กน 8121 กำแพงเพชร', 'รถยนต์นั่งส่วนบุคคล', 5, 'พนักงานขับรถเวรส่วนกลาง', 'แก๊สโซฮอล์ 91/95', 'available', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ระบบแอร์เย็นฉ่ำ', 'GPS ติดตามรถ', 'รองรับงานตรวจราชการทั่วไป'], 68120, '3/4 ถัง (75%)', '12 ก.ย. 2569', '31 มี.ค. 2570', 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)'),
  ('veh_3', 'รถยนต์ส่วนกลาง (กฉ 5196 กำแพงเพชร)', 'กฉ 5196 กำแพงเพชร', 'รถยนต์นั่งส่วนบุคคล', 5, 'พนักงานขับรถเวรส่วนกลาง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ภารกิจลงพื้นที่ชุมชน', 'ระบบนำทาง GPS', 'ยางสภาพดีเยี่ยม'], 81400, 'เต็มถัง (100%)', '20 ส.ค. 2569', '30 เม.ย. 2570', 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)'),
  ('veh_4', 'รถยนต์ส่วนกลาง พก. (กฉ 9733 กำแพงเพชร)', 'กฉ 9733 กำแพงเพชร', 'รถยนต์นั่งส่วนบุคคล', 5, 'เจ้าหน้าที่ศูนย์บริการคนพิการ', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', array['รถประจำศูนย์บริการคนพิการ (พก.)', 'พื้นที่กว้างขวาง', 'รองรับรถเข็นวีลแชร์', 'ลงพื้นที่เยี่ยมผู้พิการ'], 53200, 'เต็มถัง (100%)', '1 ต.ค. 2569', '31 พ.ค. 2570', 'ศูนย์บริการคนพิการจังหวัดกำแพงเพชร (พก.)'),
  ('veh_5', 'รถกระบะตรวจการณ์ (กค 6520 กำแพงเพชร)', 'กค 6520 กำแพงเพชร', 'รถกระบะตรวจการณ์', 5, 'นายสมหมาย มั่นคง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ยกสูง ลุยพื้นที่ทุรกันดาร', 'กระบะบรรทุกสิ่งของ/อุปกรณ์', 'ขับเคลื่อนสมบุกสมบัน'], 95400, '3/4 ถัง (75%)', '18 ส.ค. 2569', '30 มิ.ย. 2570', 'ฝ่ายบริหารทั่วไป (ตรวจการณ์)'),
  ('veh_6', 'รถกระบะบรรทุก/ตรวจการณ์ (กง 3659 กำแพงเพชร)', 'กง 3659 กำแพงเพชร', 'รถกระบะบรรทุก', 5, 'พนักงานขับรถเวรส่วนกลาง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80', array['บรรทุกสิ่งของช่วยเหลือผู้ประสบภัย', 'ขนย้ายอุปกรณ์กายอุปกรณ์', 'ลุยงานภาคสนาม'], 112800, '1/2 ถัง (50%)', '15 ก.ค. 2569', '31 ก.ค. 2570', 'ฝ่ายบริหารทั่วไป (งานส่งของ/พัสดุ)'),
  ('veh_7', 'รถตู้ส่วนกลาง (นข 1422 กำแพงเพชร)', 'นข 1422 กำแพงเพชร', 'รถตู้ส่วนกลาง', 12, 'นายสมชาย มั่นคง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', array['12 ที่นั่ง', 'แอร์ไมโครบัสแยกหน้า-หลัง', 'เข็มขัดนิรภัยครบทุกที่นั่ง', 'เดินทางประชุม/สัมมนาเป็นหมู่คณะ'], 135400, 'เต็มถัง (100%)', '25 ก.ย. 2569', '31 ส.ค. 2570', 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)'),
  ('veh_8', 'รถตู้ส่วนกลาง (นข 3598 กำแพงเพชร)', 'นข 3598 กำแพงเพชร', 'รถตู้ส่วนกลาง', 12, 'นายบุญส่ง ชื่นใจ', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', array['12 ที่นั่ง', 'เบาะปรับเอนสบาย', 'แอร์เย็นทั่วถึง', 'GPS ติดตามความเร็ว'], 148900, '3/4 ถัง (75%)', '10 ส.ค. 2569', '30 ก.ย. 2570', 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)'),
  ('veh_9', 'รถกระบะตรวจการณ์ (กข 6972 กำแพงเพชร)', 'กข 6972 กำแพงเพชร', 'รถกระบะตรวจการณ์', 5, 'พนักงานขับรถเวรส่วนกลาง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ยกสูง ขับเคลื่อน 4 ล้อ', 'ลุยตรวจราชการ 11 อำเภอ', 'กระบะกว้าง'], 104200, '1/2 ถัง (50%)', '2 ก.ย. 2569', '31 ต.ค. 2570', 'ฝ่ายบริหารทั่วไป (ตรวจการณ์)'),
  ('veh_10', 'รถจักรยานยนต์ส่วนกลาง (กษย 929 กำแพงเพชร)', 'กษย 929 กำแพงเพชร', 'รถจักรยานยนต์', 2, 'เจ้าหน้าที่ธุรการ/ส่งสารบรรณ', 'แก๊สโซฮอล์ 91/95', 'available', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80', array['2 ที่นั่ง', 'กล่องใส่เอกสารท้ายรถ', 'งานรับ-ส่งหนังสือราชการด่วน', 'ประหยัดน้ำมัน คล่องตัวในเมือง'], 18600, 'เต็มถัง (100%)', '1 ต.ค. 2569', '30 พ.ย. 2570', 'ฝ่ายบริหารทั่วไป (งานสารบรรณ/ส่งเอกสาร)')
on conflict (id) do nothing;

-- 4. Initial Official Chat Channels (ห้องแชทตามกลุ่มงาน)
insert into chat_channels (id, name, division, description, icon, type, is_official, member_ids, created_by)
values
  ('ch_all_staff', 'ประกาศและประสานงานกลาง พมจ.', null, 'ห้องสื่อสารและประสานงานภารกิจส่วนกลาง รวมข้าราชการและเจ้าหน้าที่ทุกกลุ่มงาน', '🏢', 'announcement', true, array['usr_2','usr_3','usr_4','usr_5','usr_6','usr_7','usr_8','usr_9','usr_10','usr_11'], 'usr_2'),
  ('ch_executive', 'คณะกรรมการบริหารสำนักงาน', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)', 'ห้องประชุมปรึกษาข้อราชการเร่งด่วนสำหรับ พมจ. และหัวหน้ากลุ่ม/ฝ่าย', '👑', 'division', true, array['usr_2','usr_3','usr_4'], 'usr_2'),
  ('ch_general_admin', 'ฝ่ายบริหารทั่วไป', 'ฝ่ายบริหารทั่วไป', 'งานสารบรรณ การเงินและบัญชี ยานพาหนะ พัสดุ และการบริหารงานบุคคล', '📁', 'division', true, array['usr_2','usr_8','usr_9','usr_10'], 'usr_2'),
  ('ch_policy_planning', 'กลุ่มนโยบายและวิชาการ', 'กลุ่มนโยบายและวิชาการ', 'จัดทำแผนยุทธศาสตร์ ข้อมูลสารสนเทศ สถิติสังคม และติดตามประเมินผลโครงการ', '📊', 'division', true, array['usr_4','usr_5'], 'usr_4'),
  ('ch_social_dev', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'การช่วยเหลือผู้ประสบปัญหาทางสังคม เด็ก สตรี ผู้สูงอายุ และกลุ่มเปราะบาง', '🤝', 'division', true, array['usr_3','usr_7'], 'usr_3'),
  ('ch_disability_center', 'ศูนย์บริการคนพิการจังหวัด', 'ศูนย์บริการคนพิการจังหวัดกำแพงเพชร', 'การออกบัตรประจำตัวคนพิการ กองทุนส่งเสริมและฟื้นฟูสมรรถภาพคนพิการ', '♿', 'division', true, array['usr_6'], 'usr_2'),
  ('ch_advisors', 'คณะทำงานที่ปรึกษาและภาคีเครือข่าย', 'คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก', 'ประสานงานร่วมกับผู้ทรงคุณวุฒิ คณะอนุกรรมการ และภาคประชาสังคม', '🎓', 'division', true, array['usr_11','usr_3'], 'usr_2'),
  ('ch_project_disability_day', 'คณะทำงานจัดงานวันคนพิการสากล 2569', null, 'กลุ่มโครงการเฉพาะกิจ: วางแผนจัดกิจกรรมมอบโล่ประกาศเกียรติคุณและนิทรรศการ', '🌟', 'custom', false, array['usr_2','usr_3','usr_6','usr_7'], 'usr_6')
on conflict (id) do nothing;