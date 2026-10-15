-- Starter registry for a new Busy Desks office: three rooms and three agents. Run after supabase/schema.sql.
-- Agents start as 'planned'; SETUP.md sets each one 'live' after its first good run.
-- Free slots for more rooms later: 1, 2, 3, 6, 7 (4, 9, 10 and 11 are fixed rooms).

insert into public.departments (id, name, slot, status, color, description, sort) values
('exec', 'Executive', 0, 'live', '#B0569F', 'Chief of Staff: morning brief, priorities and goals.', 1),
('operations', 'Operations', 5, 'live', '#2F64E0', 'Inbox, calendar and home admin.', 2),
('it-audit', 'Back Office', 8, 'live', '#5B6B78', 'Checks every agent ran and followed the rules.', 3);

insert into public.agents (id, name, nickname, department_id, role, status, schedule, scheduled_task, station, seat, color, description, sort, monthly_budget_usd) values
('executive', 'Executive', 'Iris', 'exec', 'executive', 'planned', 'Weekdays 7:41 AM', 'Executive: morning brief', 'desk', 0, '#B0569F', 'Chief of Staff. Reviews what the others filed, adds today''s calendar, and files one morning brief on your desk.', 1, null),
('inbox', 'Inbox Organizer', 'Ollie', 'operations', 'worker', 'planned', '7:12 AM and 6:12 PM', 'Inbox Organizer', 'bins', 0, '#2F64E0', 'Labels new mail under Office/*, archives store promos only, sends Needs-you items up.', 2, null),
('auditor', 'Auditor', 'Audrey', 'it-audit', 'worker', 'planned', 'Daily 7:31 AM', 'Auditor', 'desk', 0, '#5B6B78', 'Checks runs and events: who ran, who failed, who missed a schedule.', 3, null);

update public.agents set reports_to = 'executive' where id in ('inbox', 'auditor');
