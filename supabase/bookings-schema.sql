-- Run this in your Supabase SQL Editor

-- Booking requests from students
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  student_name text not null,
  student_email text not null,
  university text not null,
  note text,
  advisor_id text not null,
  advisor_name text not null,
  advisor_email text not null,
  advisor_role text not null,
  booking_date date not null,
  booking_time text not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz default now()
);

-- Block entire dates (no bookings allowed)
create table if not exists blocked_dates (
  id uuid default gen_random_uuid() primary key,
  blocked_date date not null unique,
  reason text,
  created_at timestamptz default now()
);

-- Block specific time slots globally
create table if not exists blocked_slots (
  id uuid default gen_random_uuid() primary key,
  time_slot text not null unique,
  created_at timestamptz default now()
);

-- RLS
alter table bookings enable row level security;
alter table blocked_dates enable row level security;
alter table blocked_slots enable row level security;

-- Public: read blocked dates & slots (booking form needs this), insert bookings
create policy "public read blocked_dates" on blocked_dates for select using (true);
create policy "public read blocked_slots" on blocked_slots for select using (true);
create policy "public insert bookings" on bookings for insert with check (true);

-- Authenticated admins: full access
create policy "auth all bookings" on bookings for all to authenticated using (true);
create policy "auth all blocked_dates" on blocked_dates for all to authenticated using (true);
create policy "auth all blocked_slots" on blocked_slots for all to authenticated using (true);
