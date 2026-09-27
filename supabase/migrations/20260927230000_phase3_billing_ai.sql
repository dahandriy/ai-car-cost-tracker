-- AI Car Cost Tracker - Phase 3: AI usage and billing
alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz;

create unique index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_id_idx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Atomically checks and consumes one AI request for the authenticated user.
-- The Edge Function calls this through the user's JWT so auth.uid() is authoritative.
create or replace function public.claim_ai_request()
returns table (
  allowed boolean,
  plan text,
  ai_used integer,
  ai_limit integer,
  remaining integer,
  period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sub public.subscriptions%rowtype;
  now_ts timestamptz := now();
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into sub
  from public.subscriptions
  where user_id = uid
  for update;

  if not found then
    insert into public.subscriptions (user_id, plan, status, ai_limit, ai_used, period_start, period_end)
    values (uid, 'FREE', 'active', 5, 0, now_ts, now_ts + interval '1 month')
    returning * into sub;
  end if;

  if sub.period_end is null or sub.period_end <= now_ts then
    update public.subscriptions
    set ai_used = 0,
        period_start = now_ts,
        period_end = now_ts + interval '1 month',
        updated_at = now_ts
    where user_id = uid
    returning * into sub;
  end if;

  if sub.status not in ('active', 'trialing') and sub.plan = 'PRO' then
    update public.subscriptions
    set plan = 'FREE', ai_limit = 5, ai_used = least(ai_used, 5), updated_at = now_ts
    where user_id = uid
    returning * into sub;
  end if;

  if sub.ai_used >= sub.ai_limit then
    return query select false, sub.plan, sub.ai_used, sub.ai_limit,
      greatest(sub.ai_limit - sub.ai_used, 0), sub.period_end;
    return;
  end if;

  update public.subscriptions
  set ai_used = ai_used + 1,
      updated_at = now_ts
  where user_id = uid
  returning * into sub;

  return query select true, sub.plan, sub.ai_used, sub.ai_limit,
    greatest(sub.ai_limit - sub.ai_used, 0), sub.period_end;
end;
$$;

revoke all on function public.claim_ai_request() from public;
grant execute on function public.claim_ai_request() to authenticated;

-- If an AI provider call fails after quota was claimed, refund the request.
create or replace function public.refund_ai_request()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  update public.subscriptions
  set ai_used = greatest(ai_used - 1, 0), updated_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.refund_ai_request() from public;
grant execute on function public.refund_ai_request() to authenticated;
