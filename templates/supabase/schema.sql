-- Busy Desks schema, Supabase project {{supabase_project}}.
-- Reference copy of the live database: change the live project with a migration first, then this file.
-- RLS is on for every table with no public policies; the office page reads through {{owner}}'s own connector.

create table public.departments (
  id text primary key,
  name text not null,
  slot smallint unique check (slot >= 0 and slot <= 11),   -- room on the floor; 4, 9, 10, 11 are fixed rooms
  status text not null default 'planned' check (status in ('live','planned')),
  color text not null default '#8A9AA4',
  description text,
  sort smallint not null default 100,
  created_at timestamptz not null default now()
);

create table public.agents (
  id text primary key,
  name text not null,
  nickname text,
  department_id text references public.departments(id),
  role text not null default 'worker' check (role in ('worker','lead','executive')),
  reports_to text references public.agents(id),
  status text not null default 'planned' check (status in ('live','planned','paused')),
  schedule text,
  scheduled_task text,
  scheduled_task_id text,
  station text not null default 'mail' check (station in ('mail','bins','desk','exec','research','library','gym','kitchen')),
  seat smallint not null default 0 check (seat >= 0 and seat <= 2),
  color text not null default '#8A5BD6',
  description text,
  sort smallint not null default 100,
  created_at timestamptz not null default now(),
  monthly_budget_usd numeric
);

-- Agents' first names are unique (case-insensitive): "Ollie, run now" must point to one agent.
create unique index agents_nickname_key on public.agents (lower(nickname));

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','done','failed')),
  agent text,
  model text,
  tool_calls integer,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric,
  cost_source text check (cost_source in ('measured','estimated'))
);

create table public.events (
  id bigserial primary key,
  run_id uuid references public.runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  agent text not null,
  team text,
  kind text not null check (kind in ('start','work','found','fail','handoff','report','deliver','done')),
  message text not null,
  data jsonb not null default '{}'::jsonb
);
create index events_run_time_idx on public.events (run_id, created_at);

create table public.desk_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete set null,
  created_at timestamptz not null default now(),
  source_agent text not null,
  tray text not null check (tray in ('act','review','fyi')),
  title text not null,
  detail text,
  amount_cents integer,
  currency text default '{{currency}}',
  due_date date,
  status text not null default 'open' check (status in ('open','done','dismissed')),
  dedupe_key text unique,
  for_agent text not null default 'executive',
  briefed_run_id uuid references public.runs(id) on delete set null,
  snoozed_until timestamptz,   -- {{owner}} tapped Later: hidden until then
  decided_at timestamptz       -- when {{owner}} tapped Done / Later / Ignore
);
create index desk_items_for_open_idx on public.desk_items (for_agent, status) where briefed_run_id is null;

create view public.agent_costs_month as
select a.id as agent, a.name, a.department_id, a.monthly_budget_usd,
  date_trunc('month', (coalesce(r.started_at, now()) at time zone '{{timezone}}')) as month,
  count(r.id) as runs,
  count(r.id) filter (where r.status = 'failed') as failed_runs,
  round(avg(extract(epoch from (r.finished_at - r.started_at))), 1) as avg_seconds,
  sum(r.tool_calls) as tool_calls,
  sum(r.input_tokens) as input_tokens,
  sum(r.output_tokens) as output_tokens,
  round(sum(r.cost_usd), 4) as cost_usd,
  bool_or(r.cost_source = 'estimated') as includes_estimates
from public.agents a
left join public.runs r on r.agent = a.id
group by a.id, a.name, a.department_id, a.monthly_budget_usd,
  date_trunc('month', (coalesce(r.started_at, now()) at time zone '{{timezone}}'));

alter table public.departments enable row level security;
alter table public.agents enable row level security;
alter table public.runs enable row level security;
alter table public.events enable row level security;
alter table public.desk_items enable row level security;

alter publication supabase_realtime add table public.events, public.desk_items;

-- Raw purchase feed: one row per card tap, for example from a phone shortcut
-- through an edge function. Not an agent: writes no events.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  merchant text,
  amount_cents integer,
  currency text not null default '{{currency}}',
  card text,
  amount_raw text,
  source text not null default 'apple-pay-shortcut',
  raw jsonb not null default '{}'::jsonb,
  processed_run_id uuid references public.runs(id),
  note text,
  category text,      -- set by the spending agent
  flag_reason text    -- set by the spending agent when a purchase looks unusual
);
create index transactions_received_at_idx on public.transactions (received_at desc);
create index transactions_unprocessed_idx on public.transactions (received_at) where processed_run_id is null;
alter table public.transactions enable row level security;

-- ---------------------------------------------------------------
-- Goals and settings (migration 20261013214040_goals_and_settings)
-- Goals: {{owner}}'s targets, set from the office page's Settings panel.
-- Only {{owner}} creates, edits or archives goals (through save_setting below).
-- The Executive only writes the rating columns (status, status_note, rated_at, rated_run_id).
create table if not exists public.goals (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('spending','saving','portfolio','bills','other')),
  title         text not null check (length(title) between 1 and 120),
  amount_cents  bigint check (amount_cents is null or amount_cents >= 0),
  currency      text not null default '{{currency}}',
  pct           numeric(5,2) check (pct is null or (pct >= 0 and pct <= 100)),
  period        text not null default 'month' check (period in ('month','quarter','year','by_date','ongoing')),
  target_date   date,
  category      text check (category is null or length(category) <= 60),
  note          text check (note is null or length(note) <= 300),
  watcher       text references public.agents(id),
  status        text not null default 'not_rated' check (status in ('not_rated','on_track','at_risk','off_track','waiting','met')),
  status_note   text,
  rated_at      timestamptz,
  rated_run_id  uuid references public.runs(id),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.goals is '{{owner}}''s goals and targets (spending caps, saving, portfolio, bills). Set on the office page; agents only read them. The Executive rates them weekly (status columns only).';
alter table public.goals enable row level security;
create index if not exists goals_active_idx on public.goals (active, kind);

-- {{owner}}'s taps on their desk items (migration 20261014144142_desk_decisions_and_feedback).
-- Written only by save_setting({op:'decide'}); the Executive reads it to skip what they ignore.
create table if not exists public.feedback (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  desk_item_id uuid references public.desk_items(id) on delete set null,
  choice text not null check (choice in ('done','later','ignore')),
  source_agent text,
  title text,
  detail text,
  note text,
  snooze_until timestamptz
);
alter table public.feedback enable row level security;
create index if not exists feedback_choice_created on public.feedback (choice, created_at desc);

-- The one write path the office page uses. It can only add, edit or archive goals,
-- set an agent's monthly budget, or record Done / Later / Ignore on an item on {{owner}}'s desk.
create or replace function public.save_setting(p jsonb)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
declare
  op text := p->>'op';
  gid bigint;
  w text;
  it desk_items%rowtype;
  ch text;
  until_ts timestamptz;
begin
  if op = 'goal' then
    w := coalesce(nullif(p->>'watcher',''), case p->>'kind'
           when 'spending' then 'spend' when 'saving' then 'bills-lead' when 'bills' then 'bills-lead'
           when 'portfolio' then 'portfolio-analyst' else 'executive' end);
    if not exists (select 1 from agents where id = w) then w := 'executive'; end if;
    if nullif(p->>'id','') is null then
      insert into goals (kind, title, amount_cents, currency, pct, period, target_date, category, note, watcher)
      values (p->>'kind', trim(p->>'title'), nullif(p->>'amount_cents','')::bigint, coalesce(nullif(p->>'currency',''),'{{currency}}'),
              nullif(p->>'pct','')::numeric, coalesce(nullif(p->>'period',''),'month'), nullif(p->>'target_date','')::date,
              nullif(trim(p->>'category'),''), nullif(trim(p->>'note'),''), w)
      returning id into gid;
    else
      gid := (p->>'id')::bigint;
      update goals set kind = p->>'kind', title = trim(p->>'title'), amount_cents = nullif(p->>'amount_cents','')::bigint,
             currency = coalesce(nullif(p->>'currency',''),'{{currency}}'), pct = nullif(p->>'pct','')::numeric,
             period = coalesce(nullif(p->>'period',''),'month'), target_date = nullif(p->>'target_date','')::date,
             category = nullif(trim(p->>'category'),''), note = nullif(trim(p->>'note'),''), watcher = w,
             status = 'not_rated', status_note = null, updated_at = now()
       where id = gid and active;
      if not found then raise exception 'Goal % not found', gid; end if;
    end if;
    return jsonb_build_object('ok', true, 'id', gid);
  elsif op = 'archive' then
    update goals set active = false, updated_at = now() where id = (p->>'id')::bigint;
    if not found then raise exception 'Goal not found'; end if;
    return jsonb_build_object('ok', true);
  elsif op = 'budget' then
    update agents set monthly_budget_usd = nullif(p->>'usd','')::numeric
     where id = p->>'agent'
       and (nullif(p->>'usd','') is null or (nullif(p->>'usd','')::numeric between 0 and 500));
    if not found then raise exception 'Budget not saved (unknown agent or out of range)'; end if;
    return jsonb_build_object('ok', true);
  elsif op = 'decide' then
    -- {{owner}}'s tap on one of his desk items: done, later, or ignore.
    ch := p->>'choice';
    if ch not in ('done','later','ignore') then raise exception 'Unknown choice %', ch; end if;
    select * into it from desk_items where id = (p->>'id')::uuid and for_agent = '{{desk}}';
    if not found then raise exception 'Item not on your desk'; end if;
    if ch = 'later' then
      -- default: tomorrow 7:00 AM {{city}}, so it's back before Iris's 7:41 brief
      until_ts := coalesce(nullif(p->>'until','')::timestamptz,
        ((date_trunc('day', now() at time zone '{{timezone}}') + interval '1 day 7 hours') at time zone '{{timezone}}'));
      update desk_items set snoozed_until = until_ts, decided_at = now() where id = it.id;
    else
      update desk_items set status = case ch when 'done' then 'done' else 'dismissed' end,
             snoozed_until = null, decided_at = now()
       where id = it.id;
    end if;
    insert into feedback (desk_item_id, choice, source_agent, title, detail, note, snooze_until)
    values (it.id, ch, it.source_agent, it.title, it.detail, nullif(trim(p->>'note'),''), until_ts);
    return jsonb_build_object('ok', true, 'choice', ch, 'snoozed_until', until_ts);
  else
    raise exception 'Unknown setting %', op;
  end if;
end;
$function$;
revoke all on function public.save_setting(jsonb) from public, anon, authenticated;
revoke all on public.goals from anon, authenticated;

create table public.holdings (
  id bigserial primary key,
  symbol text not null,
  name text,
  account text not null,
  currency text not null,
  quantity numeric not null,
  book_value numeric,
  last_price numeric,
  market_value numeric,
  as_of date not null,
  source text default 'manual',
  note text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (symbol, account)
);
comment on table public.holdings is '{{owner}}''s holdings, entered by {{owner}} (or Claude on their request). The portfolio agent reads them; no agent writes them.';
alter table public.holdings enable row level security;

create table public.market_universe (
  symbol text primary key,
  name text,
  rank int,
  weight_pct numeric,
  as_of date not null,
  in_universe boolean not null default true,
  updated_run_id uuid,
  updated_at timestamptz not null default now()
);
comment on table public.market_universe is 'Stocks the portfolio agent scans for setups (for example the S&P 500 top 10 by index weight). The portfolio agent refreshes it.';
alter table public.market_universe enable row level security;

create table public.price_history (
  id bigserial primary key,
  symbol text not null,
  price_date date not null,
  close numeric not null,
  currency text not null,
  source text not null,
  source_url text,
  created_at timestamptz not null default now(),
  unique (symbol, price_date)
);
comment on table public.price_history is 'Closing prices for holdings: a backfill, then the portfolio agent adds the latest close each weekday. Feeds the Portfolio panel on the office page.';
alter table public.price_history enable row level security;
