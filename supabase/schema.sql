-- Cüdo Klub — verilənlər bazası.
-- Supabase → SQL Editor-də bir dəfə işə salın.

create extension if not exists pgcrypto;

-- Klub haqqında məlumat (ictimai saytda göstərilir, yalnız admin dəyişir)
create table if not exists public.club_settings (
  id int primary key default 1 check (id = 1),
  club_name text not null default 'Cüdo Klub',
  tagline text,
  phone text,
  whatsapp text,
  address text,
  schedule text,
  about text,
  updated_at timestamptz not null default now()
);
insert into public.club_settings (id) values (1) on conflict (id) do nothing;

-- Uşaqlar
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  father_name text,
  birth_date date not null,
  gender text check (gender in ('oğlan', 'qız')),
  id_series text,
  id_fin text,
  id_scan_path text,
  school text,
  grade smallint check (grade between 0 and 12),
  joined_at date not null default current_date,
  belt text,
  weight_kg numeric(5,1) check (weight_kg is null or weight_kg > 0),
  parent_name text,
  parent_phone text,
  monthly_fee numeric(8,2) not null default 0 check (monthly_fee >= 0),
  status text not null default 'aktiv' check (status in ('aktiv', 'passiv')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists children_name_idx on public.children (last_name, first_name);

-- Yarışlar və iştirakçılar
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  held_on date not null,
  location text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  category text,
  result text,
  created_at timestamptz not null default now(),
  unique (competition_id, child_id)
);
create index if not exists entries_child_idx on public.competition_entries (child_id);

-- Uşaq ödənişləri (period_month ayın 1-i ilə saxlanılır)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  period_month date not null,
  paid_on date not null default current_date,
  method text not null default 'nağd' check (method in ('nağd', 'kart', 'köçürmə')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payments_period_idx on public.payments (period_month);
create index if not exists payments_child_idx on public.payments (child_id, period_month);

-- Xərclər
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric(10,2) not null check (amount > 0),
  spent_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (spent_on);

-- Heyət və əmək haqqı
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null default 'Məşqçi',
  phone text,
  monthly_salary numeric(10,2) not null default 0 check (monthly_salary >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  period_month date not null,
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists salary_period_idx on public.salary_payments (period_month);

-- Təhlükəsizlik: bütün cədvəllərdə RLS aktivdir.
-- Qeydiyyat bağlıdır, istifadəçiləri yalnız siz Supabase-dən əlavə edirsiniz;
-- giriş etmiş hər istifadəçi admin sayılır.
alter table public.club_settings enable row level security;
alter table public.children enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_entries enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.staff enable row level security;
alter table public.salary_payments enable row level security;

drop policy if exists settings_public_read on public.club_settings;
create policy settings_public_read on public.club_settings
  for select to anon, authenticated using (true);
drop policy if exists settings_admin_write on public.club_settings;
create policy settings_admin_write on public.club_settings
  for update to authenticated using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['children', 'competitions', 'competition_entries', 'payments', 'expenses', 'staff', 'salary_payments']
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Şəxsiyyət vəsiqəsi skanları üçün bağlı (private) saxlama
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('id-scans', 'id-scans', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists id_scans_admin on storage.objects;
create policy id_scans_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'id-scans') with check (bucket_id = 'id-scans');
