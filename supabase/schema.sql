-- ===============================
-- OmniOffice — Database Schema (Supabase / PostgreSQL)
-- ===============================

-- ===============================
-- 1. Organizations
-- ===============================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

-- ===============================
-- 2. Users
-- ===============================
create table users (
  id uuid primary key default gen_random_uuid(),
  prefix text default 'นาย',
  first_name text not null,
  last_name text not null,
  nickname text, -- ชื่อเล่น (เช่น เสก, บอย, เจมส์, ขวัญ)
  name text not null,
  position text not null,
  division text not null, -- กลุ่ม/ฝ่าย (เช่น กลุ่มเทคโนโลยีดิจิทัลและสารสนเทศ)
  email text unique not null,
  phone text,
  line_id text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'manager', 'member', 'guest')),
  created_at timestamptz default now()
);

alter table users enable row level security;

-- ===============================
-- 3. Organization Members
-- ===============================
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member', 'guest')),
  joined_at timestamptz default now(),
  unique (organization_id, user_id)
);

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

-- ===============================
-- 5. Messages
-- ===============================
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  attachment_url text,
  created_at timestamptz default now()
);

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
  assignee_id uuid references users(id) on delete set null,
  due_date date,
  created_at timestamptz default now()
);

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

-- ===============================
-- 8. Files
-- ===============================
create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);

-- ===============================
-- 9. Enable Realtime
-- ===============================
alter publication supabase_realtime add table organizations;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table organization_members;
alter publication supabase_realtime add table chat_channels;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table meetings;

-- ===============================
-- 10. RLS Policies
-- ===============================

-- Organizations
alter table organizations enable row level security;
create policy "Users can view own organization"
on organizations for select
to authenticated
using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = organizations.id
    and organization_members.user_id = auth.uid()
  )
);

-- Users
create policy "Users can view own profile"
on users for select
to authenticated
using (id = auth.uid());

-- Organization Members
create policy "Users can view own organization members"
on organization_members for select
to authenticated
using (
  exists (
    select 1 from organization_members om2
    where om2.organization_id = organization_members.organization_id
    and om2.user_id = auth.uid()
  )
);

-- Chat Channels
alter table chat_channels enable row level security;
create policy "Users can view channels in own organization"
on chat_channels for select
to authenticated
using (
  exists (
    select 1 from organization_members om
    where om.organization_id = chat_channels.organization_id
    and om.user_id = auth.uid()
  )
);

-- Messages
alter table messages enable row level security;
create policy "Messages in same organization"
on messages for all
to authenticated
using (
  exists (
    select 1 from chat_channels ch
    where ch.id = messages.channel_id
    and ch.organization_id = (
      select organization_id from chat_channels ch2
      where ch2.id = messages.channel_id
      limit 1
    )
  )
);

-- Tasks
alter table tasks enable row level security;
create policy "Tasks in same organization"
on tasks for all
to authenticated
using (
  exists (
    select 1 from organization_members om
    where om.organization_id = tasks.organization_id
    and om.user_id = auth.uid()
  )
);

-- Meetings
alter table meetings enable row level security;
create policy "Meetings in same organization"
on meetings for all
to authenticated
using (
  exists (
    select 1 from organization_members om
    where om.organization_id = meetings.organization_id
    and om.user_id = auth.uid()
  )
);

-- Files
alter table files enable row level security;
create policy "Files in same organization"
on files for all
to authenticated
using (
  exists (
    select 1 from organization_members om
    where om.organization_id = files.organization_id
    and om.user_id = auth.uid()
  )
);