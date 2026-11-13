-- =========================================================================
-- Smart MSO Migration: Create Meeting Rooms Table & Enable Realtime
-- Date: 2026-11-04
-- Target: Supabase PostgreSQL (Public Schema)
-- =========================================================================

-- 1. Create table meeting_rooms
create table if not exists public.meeting_rooms (
  id text primary key,
  name text not null,
  building text not null,
  capacity integer not null default 10,
  equipment jsonb default '[]'::jsonb,
  status text not null default 'available',
  notes text,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.meeting_rooms enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow all read meeting_rooms" on public.meeting_rooms;
drop policy if exists "Allow all write meeting_rooms" on public.meeting_rooms;

-- Policies for public / authenticated access
create policy "Allow all read meeting_rooms" 
  on public.meeting_rooms 
  for select 
  using (true);

create policy "Allow all write meeting_rooms" 
  on public.meeting_rooms 
  for all 
  using (true);

-- 3. Add to Supabase Realtime Publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.meeting_rooms;
  end if;
exception
  when others then null;
end $$;

-- 4. Initial Seed Data (สารบบห้องประชุม 6 ห้องมาตรฐาน พมจ.กำแพงเพชร)
insert into public.meeting_rooms (id, name, building, capacity, equipment, status, notes)
values
  (
    'room_1',
    'ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)',
    'ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 2)',
    40,
    '["จอโปรเจกเตอร์ 4K", "ไมโครโฟนไร้สาย 4 ตัว", "เครื่องเสียงห้องประชุม", "กล้อง Hybrid PTZ (Zoom/Meet)", "WiFi ความเร็วสูง"]'::jsonb,
    'available',
    'ห้องประชุมใหญ่สำหรับประชุมข้าราชการประจำเดือนและคณะทำงานจังหวัด'
  ),
  (
    'room_2',
    'ห้องประชุม 2 (ศาลากลางจังหวัด ชั้น 4)',
    'ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 4)',
    25,
    '["Smart TV 75 นิ้ว", "Soundbar + ไมค์คอนเฟอเรนซ์", "กล้อง Web Conference", "ไวท์บอร์ด"]'::jsonb,
    'available',
    'ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมพิจารณาโครงการและติดตามงาน'
  ),
  (
    'room_3',
    'ห้องประชุมกลุ่มนโยบายและวิชาการ',
    'สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มนโยบาย)',
    12,
    '["Smart TV 55 นิ้ว", "ลำโพงบลูทูธพกพา", "สาย HDMI / Wireless Cast"]'::jsonb,
    'available',
    'การประชุมภายในกลุ่มงานและวิเคราะห์ข้อมูลสถิติ'
  ),
  (
    'room_4',
    'ห้องประชุมกลุ่มการพัฒนาสังคมและสวัสดิการ',
    'สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มสวัสดิการ)',
    15,
    '["จอ Monitor 65 นิ้ว", "ไมค์ห้องประชุม", "แท่นบรรยาย"]'::jsonb,
    'available',
    'ประชุมทีมช่วยเหลือผู้ประสบปัญหาทางสังคมและเครือข่าย พม.'
  ),
  (
    'room_5',
    'ห้องประชุมฝ่ายบริหารทั่วไป',
    'สำนักงาน พมจ. กำแพงเพชร (ห้องฝ่ายบริหาร)',
    10,
    '["จอ Monitor 43 นิ้ว", "สายเชื่อมต่อสารบรรณและบัญชี"]'::jsonb,
    'available',
    'ประชุมการเงิน พัสดุ และงานธุรการทั่วไป'
  ),
  (
    'room_6',
    'ห้องประชุม War Room ศูนย์ปฏิบัติการ พมจ.',
    'สำนักงาน พมจ. กำแพงเพชร (War Room 1300)',
    8,
    '["Multi-Screen Video Wall", "ระบบ Hotline 1300 บูรณาการ", "ไมค์ตั้งโต๊ะ", "บันทึกเสียงอัตโนมัติ"]'::jsonb,
    'available',
    'ศูนย์ประสานงานสถานการณ์ฉุกเฉินและช่วยเหลือรายกรณีเร่งด่วน'
  )
on conflict (id) do update set
  name = excluded.name,
  building = excluded.building,
  capacity = excluded.capacity,
  equipment = excluded.equipment,
  status = excluded.status,
  notes = excluded.notes;
