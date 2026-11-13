-- Nangoma Safari Lodge — booking schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  type text,
  rate numeric not null default 0,
  state text not null default 'Available',
  created_at timestamptz not null default now(),
  unique (location_id, name)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  room_id uuid not null references rooms(id),
  guest_name text not null,
  phone text,
  invoice text,                -- shared across a group booking (one guest, many rooms)
  check_in date not null,
  nights int not null default 1 check (nights >= 1),
  amount numeric not null default 0,
  method text,                 -- Mobile money | Cash | Bank transfer
  reference text,
  status text not null default 'booked'
    check (status in ('booked','awaiting','checked_in','hold','overdue','completed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_check_in_idx on bookings (check_in);
create index if not exists bookings_invoice_idx on bookings (invoice);
create index if not exists bookings_room_idx on bookings (room_id);

create table if not exists event_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  event text not null,         -- e.g. 'Tembo checked in · Room 6'
  tone text not null default 'info' check (tone in ('in','out','money','info')),
  created_at timestamptz not null default now()
);

-- Seed the two locations
insert into locations (name) values ('Dam Lodge'), ('Farm House')
on conflict (name) do nothing;

-- Permissive policies for the MVP (proper auth comes later)
alter table locations enable row level security;
alter table rooms enable row level security;
alter table bookings enable row level security;
alter table event_logs enable row level security;

create policy "public read locations" on locations for select using (true);
create policy "public write locations" on locations for insert with check (true);

create policy "public read rooms" on rooms for select using (true);
create policy "public write rooms" on rooms for insert with check (true);
create policy "public update rooms" on rooms for update using (true);

create policy "public read bookings" on bookings for select using (true);
create policy "public insert bookings" on bookings for insert with check (true);
create policy "public update bookings" on bookings for update using (true);

create policy "public read logs" on event_logs for select using (true);
create policy "public insert logs" on event_logs for insert with check (true);
