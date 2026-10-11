-- =========================================================================
-- OmniOffice — Database Schema & Initial Seed (Supabase PostgreSQL)
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
  personnel_type text default 'ข้าราชการ' check (personnel_type in ('ข้าราชการ', 'ลูกจ้างประจำ', 'พนักงานราชการ', 'พนักงานกองทุน', 'พนักงานจ้างเหมาบริการ', 'ที่ปรึกษา/ผู้ทรงคุณวุฒิ', 'ที่ปรึกษา / ผู้ทรงคุณวุฒิ')),
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
  category text not null check (category in ('รถตู้ส่วนกลาง', 'รถกระบะตรวจการณ์', 'รถยนต์นั่งส่วนบุคคล', 'รถกระบะบรรทุก', 'รถตู้ VIP ผู้บริหาร')),
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
-- 11. Car Bookings (ระบบคำขอจองรถยนต์ราชการ 3 ขั้นตอน)
-- ===============================
create table car_bookings (
  id text primary key,
  request_no text not null,
  vehicle_id text references vehicles(id) on delete restrict,
  vehicle_name text not null,
  license_plate text not null,
  
  -- ผู้ขอใช้รถ (Tier 1: Requestor)
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
  require_driver boolean not null default true,
  assigned_driver text,
  
  -- งบประมาณค่าน้ำมันเชื้อเพลิง (ถ้ามี)
  fuel_budget_requested boolean default false,
  fuel_budget_amount numeric(10, 2),
  fuel_budget_source text,
  
  -- สถานะคำขอ 3 ขั้น
  status text not null default 'pending_review' check (status in ('pending_review', 'endorsed', 'approved', 'rejected', 'completed')),
  created_at text not null,
  
  -- ขั้นที่ 2: ความเห็นชอบของหัวหน้าฝ่าย (Manager)
  manager_id text,
  manager_name text,
  manager_notes text,
  manager_action_at text,
  
  -- ขั้นที่ 3: การอนุมัติของ พมจ. (Admin)
  approver_id text,
  approver_name text,
  approver_notes text,
  approver_action_at text,
  
  -- บันทึกการปฏิเสธ
  reject_reason text,
  rejected_by text,
  
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

-- 2. Initial Personnel (ทำเนียบจริง พมจ. กำแพงเพชร 11 ท่าน)
insert into users (id, prefix, first_name, last_name, nickname, name, personnel_type, position, division, email, phone, line_id, role, avatar_url)
values
  ('usr_1', 'นางสาว', 'มะลิวัน', 'สิทธิโยธี', 'มิ', 'นางสาวมะลิวัน สิทธิโยธี', 'ข้าราชการ', 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)', 'maliwan.s@m-society.go.th', '055-705031 ต่อ 101', 'maliwan_kpp', 'admin', 'https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg'),
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

-- 3. Initial Access Requests (คำขอสิทธิ์ทดสอบ)
insert into access_requests (id, prefix, first_name, last_name, nickname, name, personnel_type, position, division, email, phone, line_id, requested_role, reason, status)
values
  ('req_1', 'นาย', 'พงษ์ศักดิ์', 'รัตนวิมล', 'บอล', 'นายพงษ์ศักดิ์ รัตนวิมล', 'ข้าราชการ', 'นักพัฒนาสังคมปฏิบัติการ', 'กลุ่มนโยบายและวิชาการ', 'pongsak.r@m-society.go.th', '055-705031 ต่อ 112', 'ball_kpp', 'member', 'ขอสิทธิ์เพื่อติดตามโครงการและประสานงานข้อมูลสารสนเทศร่วมกับทีมงาน พมจ. กำแพงเพชร', 'pending'),
  ('req_2', 'นางสาว', 'กานดา', 'ธนโชติ', 'กาน', 'นางสาวกานดา ธนโชติ', 'พนักงานราชการ', 'เจ้าหน้าที่ธุรการและสารบรรณ', 'ฝ่ายบริหารทั่วไป', 'kanda.t@m-society.go.th', '055-705031 ต่อ 115', 'kanda_admin', 'member', 'ขอสิทธิ์เข้าใช้งานระบบจองรถยนต์สำนักงาน จองห้องประชุม และส่งเอกสารในระบบแชท', 'pending')
on conflict (id) do nothing;

-- 4. Initial Vehicles (ยานพาหนะส่วนกลาง 5 คัน)
insert into vehicles (id, name, license_plate, category, capacity, driver_name, fuel_type, status, image, features, mileage, fuel_level, last_maintenance_date, insurance_expiry, assigned_division)
values
  ('veh_1', 'Toyota Commuter 3.0 D4D', 'นข 4589 กำแพงเพชร', 'รถตู้ส่วนกลาง', 12, 'นายสมชาย มั่นคง', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', array['12 ที่นั่ง', 'แอร์ไมโครบัสแยกหน้า-หลัง', 'เข็มขัดนิรภัยทุกที่นั่ง', 'GPS ติดตามรถ'], 142580, 'เต็มถัง (100%)', '15 ก.ย. 2569', '31 ธ.ค. 2569', 'ฝ่ายบริหารทั่วไป (ส่วนกลาง)'),
  ('veh_2', 'Toyota Hilux Revo Double Cab 4WD', 'กค 7812 กำแพงเพชร', 'รถกระบะตรวจการณ์', 5, 'นายบุญส่ง ชื่นใจ', 'ดีเซล B7', 'available', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ขับเคลื่อน 4 ล้อ', 'ยกสูง ลุยพื้นที่ทุรกันดาร', 'กระบะบรรทุกอุปกรณ์'], 89340, '3/4 ถัง (75%)', '28 ส.ค. 2569', '31 มี.ค. 2570', 'ฝ่ายบริหารทั่วไป (ตรวจการณ์)'),
  ('veh_3', 'Honda CR-V e:HEV RS', 'กข 9210 กำแพงเพชร', 'รถยนต์นั่งส่วนบุคคล', 5, 'ขับขี่เอง / พนักงานขับรถเวร', 'เบนซิน ไฮบริด (E20)', 'available', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', array['5 ที่นั่ง', 'ไฮบริดประหยัดพลังงาน', 'ระบบ Honda SENSING', 'ภารกิจด่วน'], 45210, 'เต็มถัง (100%)', '10 ก.ย. 2569', '15 พ.ค. 2570', 'ฝ่ายบริหารทั่วไป (ภารกิจด่วน)'),
  ('veh_4', 'Toyota Majesty 2.8 Premium VIP', 'นง 1122 กำแพงเพชร', 'รถตู้ VIP ผู้บริหาร', 7, 'นายอนุชา พลแสน', 'ดีเซล พรีเมียม', 'available', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80', array['7 ที่นั่ง Captain Seats', 'โต๊ะทำงานปรับระดับ', 'ม่านบังแดดรอบคัน', 'รับรองผู้บริหาร/ผู้ว่าฯ'], 28150, '3/4 ถัง (75%)', '5 ต.ค. 2569', '30 มิ.ย. 2570', 'สำนักงาน พมจ. (รับรองผู้บริหาร)'),
  ('veh_5', 'Isuzu D-Max Spacecab 1.9 Ddi', 'บท 3456 กำแพงเพชร', 'รถกระบะบรรทุก', 2, 'นายประเสริฐ ยิ้มแย้ม', 'ดีเซล B7', 'in_use', 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80', array['2 ที่นั่ง', 'คอกสแตนเลสบรรทุก', 'ขนย้ายถุงยังชีพ/สิ่งของพระราชทาน', 'รองรับงานหนัก'], 195420, '1/2 ถัง (50%)', '12 ก.ค. 2569', '28 ก.พ. 2570', 'ฝ่ายบริหารทั่วไป (งานส่งของ/พัสดุ)')
on conflict (id) do nothing;

-- 5. Initial Car Booking Requests (คำขอจองรถทดสอบ 3 ขั้นตอน)
insert into car_bookings (
  id, request_no, vehicle_id, vehicle_name, license_plate,
  requester_id, requester_name, requester_position, requester_division, requester_phone,
  purpose, destination, origin, departure_time, return_time,
  passenger_count, passengers_list, require_driver, assigned_driver,
  fuel_budget_requested, fuel_budget_amount, fuel_budget_source,
  status, created_at,
  manager_id, manager_name, manager_notes, manager_action_at,
  approver_id, approver_name, approver_notes, approver_action_at
)
values
  (
    'req_car_001', 'คข-69/008', 'veh_2', 'Toyota Hilux Revo Double Cab 4WD', 'กค 7812 กำแพงเพชร',
    'usr_3', 'นายณัฐพล รัตนพงษ์', 'นักพัฒนาสังคมปฏิบัติการ', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', '083-456-7890',
    'ลงพื้นที่ตรวจเยี่ยมและประเมินสภาพที่อยู่อาศัยของคนพิการและผู้สูงอายุยากไร้ เพื่อขอรับงบประมาณปรับปรุงสภาพแวดล้อม',
    'ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร', 'สำนักงาน พมจ.กำแพงเพชร (ศาลากลางจังหวัด)',
    '2026-10-12T08:30', '2026-10-12T16:30',
    4, 'นายณัฐพล รัตนพงษ์, นายวรวุฒิ พึ่งพัก, นางสาวพิมพ์ใจ ชัยเจริญ, นางสมรักษ์ ธรรมวิมล',
    true, null,
    true, 1200.00, 'โครงการปรับสภาพแวดล้อมที่อยู่อาศัยคนพิการ',
    'pending_review', '10 ต.ค. 2569 14:20 น.',
    null, null, null, null,
    null, null, null, null
  ),
  (
    'req_car_002', 'คข-69/007', 'veh_1', 'Toyota Commuter 3.0 D4D', 'นข 4589 กำแพงเพชร',
    'usr_4', 'นางปิยะดา สุขสมบูรณ์', 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารทั่วไป', '084-567-8901',
    'นำคณะข้าราชการและเจ้าหน้าที่เข้าร่วมประชุมสัมมนาเชิงปฏิบัติการการขับเคลื่อนยุทธศาสตร์การพัฒนาคุณภาพชีวิต',
    'ห้องประชุมซุ้มกอ ชั้น 4 ศาลากลางจังหวัดกำแพงเพชร', 'สำนักงาน พมจ.กำแพงเพชร',
    '2026-10-13T09:00', '2026-10-13T17:00',
    8, 'นางปิยะดา สุขสมบูรณ์ และคณะเจ้าหน้าที่ฝ่ายบริหารทั่วไป รวม 8 คน',
    true, 'นายสมชาย มั่นคง',
    false, null, null,
    'endorsed', '9 ต.ค. 2569 11:15 น.',
    'usr_2', 'นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)', 'ตรวจสอบความพร้อมแล้ว รถตู้ นข 4589 ว่าง และได้มอบหมายนายสมชาย มั่นคง เป็นพนักงานขับรถ เห็นควรเสนอ พมจ. เพื่อโปรดพิจารณาอนุมัติ', '9 ต.ค. 2569 15:30 น.',
    null, null, null, null
  ),
  (
    'req_car_003', 'คข-69/006', 'veh_3', 'Honda CR-V e:HEV RS', 'กข 9210 กำแพงเพชร',
    'usr_1', 'นางสาวมะลิวัน สิทธิโยธี', 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)', '055-705031 ต่อ 101',
    'ร่วมประชุมติดตามการดำเนินงานศูนย์ช่วยเหลือสังคมตำบล และมอบถุงยังชีพแก่ราษฎรกลุ่มเปราะบาง',
    'องค์การบริหารส่วนตำบลทรงธรรม อำเภอเมือง จังหวัดกำแพงเพชร', 'สำนักงาน พมจ.กำแพงเพชร',
    '2026-10-11T09:00', '2026-10-11T15:00',
    3, 'นางสาวมะลิวัน สิทธิโยธี, นายพนมศักย์ บริภัทรจิรากร, นางสาวขวัญนภา ศิริสมบัติ',
    true, 'นายบุญส่ง ชื่นใจ',
    false, null, null,
    'approved', '8 ต.ค. 2569 09:30 น.',
    'usr_2', 'นายเสกพล ดิษฐโชติ', 'ตรวจสอบแล้ว มีรถและพลขับพร้อมปฏิบัติหน้าที่', '8 ต.ค. 2569 10:00 น.',
    'usr_1', 'นางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร)', 'อนุมัติให้ใช้รถยนต์ราชการปฏิบัติราชการตามวัตถุประสงค์', '8 ต.ค. 2569 10:30 น.'
  )
on conflict (id) do nothing;

-- 6. Initial Official Chat Channels (ห้องแชทตามกลุ่มงาน)
insert into chat_channels (id, name, division, description, icon, type, is_official, member_ids, created_by)
values
  ('ch_all_staff', 'ประกาศและประสานงานกลาง พมจ.', null, 'ห้องสื่อสารและประสานงานภารกิจส่วนกลาง รวมข้าราชการและเจ้าหน้าที่ทุกกลุ่มงาน', '🏢', 'announcement', true, array['usr_1','usr_2','usr_3','usr_4','usr_5','usr_6','usr_7','usr_8','usr_9','usr_10','usr_11'], 'usr_1'),
  ('ch_executive', 'คณะกรรมการบริหารสำนักงาน', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)', 'ห้องประชุมปรึกษาข้อราชการเร่งด่วนสำหรับ พมจ. และหัวหน้ากลุ่ม/ฝ่าย', '👑', 'division', true, array['usr_1','usr_2','usr_3','usr_4'], 'usr_1'),
  ('ch_general_admin', 'ฝ่ายบริหารทั่วไป', 'ฝ่ายบริหารทั่วไป', 'งานสารบรรณ การเงินและบัญชี ยานพาหนะ พัสดุ และการบริหารงานบุคคล', '📁', 'division', true, array['usr_2','usr_8','usr_9','usr_10'], 'usr_2'),
  ('ch_policy_planning', 'กลุ่มนโยบายและวิชาการ', 'กลุ่มนโยบายและวิชาการ', 'จัดทำแผนยุทธศาสตร์ ข้อมูลสารสนเทศ สถิติสังคม และติดตามประเมินผลโครงการ', '📊', 'division', true, array['usr_4','usr_5'], 'usr_4'),
  ('ch_social_dev', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'กลุ่มการพัฒนาสังคมและสวัสดิการ', 'การช่วยเหลือผู้ประสบปัญหาทางสังคม เด็ก สตรี ผู้สูงอายุ และกลุ่มเปราะบาง', '🤝', 'division', true, array['usr_3','usr_7'], 'usr_3'),
  ('ch_disability_center', 'ศูนย์บริการคนพิการจังหวัด', 'ศูนย์บริการคนพิการจังหวัดกำแพงเพชร', 'การออกบัตรประจำตัวคนพิการ กองทุนส่งเสริมและฟื้นฟูสมรรถภาพคนพิการ', '♿', 'division', true, array['usr_6'], 'usr_1'),
  ('ch_advisors', 'คณะทำงานที่ปรึกษาและภาคีเครือข่าย', 'คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก', 'ประสานงานร่วมกับผู้ทรงคุณวุฒิ คณะอนุกรรมการ และภาคประชาสังคม', '🎓', 'division', true, array['usr_11','usr_1','usr_3'], 'usr_1'),
  ('ch_project_disability_day', 'คณะทำงานจัดงานวันคนพิการสากล 2569', null, 'กลุ่มโครงการเฉพาะกิจ: วางแผนจัดกิจกรรมมอบโล่ประกาศเกียรติคุณและนิทรรศการ', '🌟', 'custom', false, array['usr_1','usr_2','usr_3','usr_6','usr_7'], 'usr_6')
on conflict (id) do nothing;