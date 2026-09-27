-- AI Car Cost Tracker - Phase 2 schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Пользователь',
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','CHF','PLN')),
  distance_unit text not null default 'км' check (distance_unit in ('км','мили')),
  fuel_unit text not null default 'л/100 км' check (fuel_unit in ('л/100 км','MPG')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null check (char_length(trim(brand)) > 0),
  model text not null check (char_length(trim(model)) > 0),
  year integer not null check (year between 1950 and 2100),
  fuel_type text not null,
  transmission text not null,
  current_mileage numeric(12,2) not null default 0 check (current_mileage >= 0),
  fuel_consumption numeric(8,3) not null default 0 check (fuel_consumption >= 0),
  monthly_distance numeric(12,2) not null default 0 check (monthly_distance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicles_user_id_idx on public.vehicles(user_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  mileage numeric(12,2) check (mileage is null or mileage >= 0),
  description text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_vehicle_date_idx on public.expenses(vehicle_id, date desc);
create index if not exists expenses_user_date_idx on public.expenses(user_id, date desc);

create table if not exists public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  expense_id uuid unique references public.expenses(id) on delete cascade,
  liters numeric(10,3) check (liters is null or liters >= 0),
  price_per_liter numeric(10,4) check (price_per_liter is null or price_per_liter >= 0),
  total numeric(12,2) check (total is null or total >= 0),
  mileage numeric(12,2) check (mileage is null or mileage >= 0),
  full_tank boolean not null default false,
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists fuel_entries_user_id_idx on public.fuel_entries(user_id);
create index if not exists fuel_entries_vehicle_date_idx on public.fuel_entries(vehicle_id, date desc);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  monthly_limit numeric(12,2) not null default 0 check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists budgets_user_global_unique on public.budgets(user_id) where vehicle_id is null;
create unique index if not exists budgets_user_vehicle_unique on public.budgets(user_id, vehicle_id) where vehicle_id is not null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'FREE' check (plan in ('FREE','PRO')),
  status text not null default 'active',
  ai_limit integer not null default 5 check (ai_limit >= 0),
  ai_used integer not null default 0 check (ai_used >= 0),
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  title text not null default 'Новый диалог',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations(user_id, created_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_messages_user_idx on public.ai_messages(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email,''), '@', 1), 'Пользователь'))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, ai_limit, ai_used)
  values (new.id, 'FREE', 'active', 5, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.expenses enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "vehicles_select_own" on public.vehicles for select using (user_id = auth.uid());
create policy "vehicles_insert_own" on public.vehicles for insert with check (user_id = auth.uid());
create policy "vehicles_update_own" on public.vehicles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vehicles_delete_own" on public.vehicles for delete using (user_id = auth.uid());

create policy "expenses_select_own" on public.expenses for select using (user_id = auth.uid());
create policy "expenses_insert_own" on public.expenses for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()
  )
);
create policy "expenses_update_own" on public.expenses for update using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()
  )
);
create policy "expenses_delete_own" on public.expenses for delete using (user_id = auth.uid());

create policy "fuel_select_own" on public.fuel_entries for select using (user_id = auth.uid());
create policy "fuel_insert_own" on public.fuel_entries for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()
  )
);
create policy "fuel_update_own" on public.fuel_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fuel_delete_own" on public.fuel_entries for delete using (user_id = auth.uid());

create policy "budgets_select_own" on public.budgets for select using (user_id = auth.uid());
create policy "budgets_insert_own" on public.budgets for insert with check (
  user_id = auth.uid() and (vehicle_id is null or exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()
  ))
);
create policy "budgets_update_own" on public.budgets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_delete_own" on public.budgets for delete using (user_id = auth.uid());

create policy "subscriptions_select_own" on public.subscriptions for select using (user_id = auth.uid());
-- No browser insert/update/delete policies for subscriptions. Future Edge Functions/service role own these changes.

create policy "ai_conversations_select_own" on public.ai_conversations for select using (user_id = auth.uid());
create policy "ai_conversations_insert_own" on public.ai_conversations for insert with check (
  user_id = auth.uid() and (vehicle_id is null or exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()
  ))
);
create policy "ai_conversations_update_own" on public.ai_conversations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_conversations_delete_own" on public.ai_conversations for delete using (user_id = auth.uid());

create policy "ai_messages_select_own" on public.ai_messages for select using (user_id = auth.uid());
create policy "ai_messages_insert_own" on public.ai_messages for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
  )
);
create policy "ai_messages_delete_own" on public.ai_messages for delete using (user_id = auth.uid());

-- Server-side Free-plan vehicle limit. PRO subscriptions are unrestricted here.
create or replace function public.enforce_vehicle_plan_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  current_plan text;
  vehicle_count integer;
begin
  select coalesce(plan, 'FREE') into current_plan
  from public.subscriptions
  where user_id = new.user_id;

  if coalesce(current_plan, 'FREE') <> 'PRO' then
    select count(*) into vehicle_count from public.vehicles where user_id = new.user_id;
    if vehicle_count >= 1 then
      raise exception 'FREE_PLAN_VEHICLE_LIMIT';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_vehicle_plan_limit_trigger on public.vehicles;
create trigger enforce_vehicle_plan_limit_trigger
before insert on public.vehicles
for each row execute procedure public.enforce_vehicle_plan_limit();
