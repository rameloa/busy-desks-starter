const PROJECT = '{{supabase_project}}';
const SERVER = 'Supabase', TOOL = 'execute_sql';
const POLL_MS = 30000;
const QUERY = `select json_build_object(
 'events',(select coalesce(json_agg(e order by e.created_at, e.id),'[]'::json) from (select id,run_id,created_at,agent,team,kind,message,data->>'why' as why from events order by created_at desc, id desc limit 60) e),
 'desk',(select coalesce(json_agg(d order by d.created_at desc),'[]'::json) from (select id,run_id,created_at,source_agent,for_agent,briefed_run_id,tray,title,detail,amount_cents,currency,due_date,status,snoozed_until from desk_items where coalesce(status,'open')='open') d),
 'departments',(select coalesce(json_agg(x order by x.sort),'[]'::json) from (select id,name,slot,status,color,description,sort from departments) x),
 'agents',(select coalesce(json_agg(x order by x.sort),'[]'::json) from (select id,name,nickname,scheduled_task_id,department_id,role,reports_to,status,schedule,station,seat,color,description,sort,monthly_budget_usd from agents) x),
 'goals',(select coalesce(json_agg(g order by g.kind, g.id),'[]'::json) from (select id,kind,title,amount_cents,currency,pct,period,target_date,category,note,watcher,status,status_note,rated_at from goals where active) g),
 'runs',(select coalesce(json_agg(r),'[]'::json) from (select distinct on (agent) id,agent,status,started_at,finished_at,tool_calls from runs order by agent, started_at desc) r),
 'holdings',(select coalesce(json_agg(h order by h.account, h.symbol),'[]'::json) from (select symbol,name,account,currency,quantity,book_value,last_price,market_value,as_of from holdings where active) h),
 'prices',(select coalesce(json_agg(p order by p.symbol, p.price_date),'[]'::json) from (select symbol,price_date,close,currency,source from price_history where price_date >= date_trunc('year', now())::date - 7) p),
 'timeline',(select coalesce(json_agg(t order by t.created_at, t.id),'[]'::json) from (select e.id,e.run_id,e.created_at,e.agent,e.kind,e.message,e.data from events e join (select distinct on (agent) id from runs order by agent, started_at desc) lr on lr.id = e.run_id) t)
) as snapshot;`;
// Calling on an agent: the page asks your Claude Code Remote connector to fire that agent's scheduled task now.
const RUN_SERVER = 'Claude Code Remote', RUN_TOOL = 'fire_trigger';

