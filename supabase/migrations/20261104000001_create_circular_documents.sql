-- =========================================================================
-- Smart MSO Migration: Create Circular Documents Table & Enable Realtime
-- Date: 2026-11-04
-- Target: Supabase PostgreSQL (Public Schema)
-- =========================================================================

-- 1. Create table circular_documents
create table if not exists public.circular_documents (
  id text primary key,
  doc_number text not null,
  title text not null,
  issued_date text not null,
  sender_org text not null,
  doc_type text default 'memo',
  reference_doc text,
  attachment_list text,
  urgency text default 'normal',
  secret_level text default 'normal',
  summary text,
  file_url text,
  file_name text,
  file_size bigint default 0,
  total_pages integer,
  scanned_pages jsonb default '[]'::jsonb,
  created_by text,
  created_by_name text,
  created_at timestamptz default now(),
  deadline text,
  target_criteria jsonb default '{"scope":"all"}'::jsonb,
  recipients jsonb default '[]'::jsonb,
  total_count integer default 0,
  acknowledged_count integer default 0,
  status text default 'active'
);

-- 2. Enable Row Level Security (RLS)
alter table public.circular_documents enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow all read circular_documents" on public.circular_documents;
drop policy if exists "Allow all write circular_documents" on public.circular_documents;

-- Policies for public / authenticated access
create policy "Allow all read circular_documents" 
  on public.circular_documents 
  for select 
  using (true);

create policy "Allow all write circular_documents" 
  on public.circular_documents 
  for all 
  using (true);

-- 3. Add to Supabase Realtime Publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.circular_documents;
  end if;
exception
  when others then null;
end $$;

