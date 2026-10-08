-- =========================================================================
-- OmniOffice — Database Schema & Initial Seed (Supabase PostgreSQL)
-- =========================================================================

-- 0. Clean reset to ensure compatible types and no conflicting constraints
drop table if exists files cascade;
drop table if exists tasks cascade;
drop table if exists messages cascade;
drop table if exists chat_channels cascade;
drop table if exists meetings cascade;
drop table if exists organization_members cascade;
drop table if exists access_requests cascade;
drop table if exists users cascade;
drop table if exists organizations cascade;

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
  division text not null, -- กลุ่ม/ฝ่าย (เช่น กลุ่มเทคโนโลยีดิจิทัลและสารสนเทศ)
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
-- 4. Chat Channels
-- ===============================
create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  type text default 'channel' check (type in ('channel', 'dm', 'group')),
  created_at timestamptz default now()
);

alter table chat_channels enable row level security;
create policy "Allow all read chat_channels" on chat_channels for select using (true);
create policy "Allow all write chat_channels" on chat_channels for all using (true);

-- ===============================
-- 5. Messages
-- ===============================
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  content text not null,
  attachment_url text,
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "Allow all read messages" on messages for select using (true);
create policy "Allow all write messages" on messages for all using (true);

-- ===============================
-- 6. Tasks (Kanban)
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
-- 7. Meetings
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
-- 8. Files
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
-- 10. Audit Logs (บันทึกประวัติกิจกรรมระบบ)
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
-- 11. Enable Realtime Publications
-- ===============================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table users;
    alter publication supabase_realtime add table tasks;
    alter publication supabase_realtime add table messages;
  end if;
exception
  when others then null;
end $$;

-- ===============================
-- 10. Seed Initial Organization & Personnel (ทำเนียบจริง พมจ. กำแพงเพชร)
-- ===============================
insert into organizations (id, name, logo_url)
values ('00000000-0000-0000-0000-000000000001', 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร', null)
on conflict (id) do nothing;

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

-- ===============================
-- 12. Seed Initial Access Requests (คำขอสิทธิ์ทดสอบ)
-- ===============================
insert into access_requests (id, prefix, first_name, last_name, nickname, name, personnel_type, position, division, email, phone, line_id, requested_role, reason, status)
values
  ('req_1', 'นาย', 'พงษ์ศักดิ์', 'รัตนวิมล', 'บอล', 'นายพงษ์ศักดิ์ รัตนวิมล', 'ข้าราชการ', 'นักพัฒนาสังคมปฏิบัติการ', 'กลุ่มนโยบายและวิชาการ', 'pongsak.r@m-society.go.th', '055-705031 ต่อ 112', 'ball_kpp', 'member', 'ขอสิทธิ์เพื่อติดตามโครงการและประสานงานข้อมูลสารสนเทศร่วมกับทีมงาน พมจ. กำแพงเพชร', 'pending'),
  ('req_2', 'นางสาว', 'กานดา', 'ธนโชติ', 'กาน', 'นางสาวกานดา ธนโชติ', 'พนักงานราชการ', 'เจ้าหน้าที่ธุรการและสารบรรณ', 'ฝ่ายบริหารทั่วไป', 'kanda.t@m-society.go.th', '055-705031 ต่อ 115', 'kanda_admin', 'member', 'ขอสิทธิ์เข้าใช้งานระบบจองรถยนต์สำนักงาน จองห้องประชุม และส่งเอกสารในระบบแชท', 'pending')
on conflict (id) do nothing;