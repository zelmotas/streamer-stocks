
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  cash numeric not null default 10000,
  net_worth numeric not null default 10000,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- holdings
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  streamer_login text not null,
  qty numeric not null default 0,
  avg_cost numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, streamer_login)
);
alter table public.holdings enable row level security;

create policy "users can view own holdings"
  on public.holdings for select using (auth.uid() = user_id);
create policy "users can insert own holdings"
  on public.holdings for insert with check (auth.uid() = user_id);
create policy "users can update own holdings"
  on public.holdings for update using (auth.uid() = user_id);
create policy "users can delete own holdings"
  on public.holdings for delete using (auth.uid() = user_id);

-- handle new user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  -- ensure unique
  while exists (select 1 from public.profiles where username = uname) loop
    uname := uname || floor(random()*1000)::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
