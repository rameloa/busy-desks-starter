# Run your own office

This sets up your own Busy Desks: three starter agents (Iris the Executive, Ollie the Inbox Organizer, Audrey the Auditor), your own database, and your own office page. It takes about an hour. Claude can do most of it for you: open this repo in Claude Code and say "Set up my office following SETUP.md".

## What you need

- A claude.ai plan with Claude Code, which runs the scheduled tasks
- These connectors, on claude.ai:
  - **Supabase:** every agent logs to it, and the office page reads it
  - **Gmail:** Ollie
  - **Google Calendar:** Iris
  - **Claude Code Remote:** Audrey checks the scheduled tasks; the page's "Call <name> in" button fires them
- A Supabase project. The free tier is enough.
- Node 22 or later, and a fork or clone of this repo

No API keys go anywhere. The agents and the office page reach Supabase through your own connector.

## 1. Clone and fill in your settings

```sh
git clone <your fork> && cd busy-desks
git config core.hooksPath .githooks
```

Edit `instance.json` (no quotes or backslashes in any value; the scripts check this):

| Key | What to put |
|---|---|
| `owner` | Your first name, as the agents will write it ("Sam") |
| `desk` | The id of your desk in the database: lowercase, no spaces ("sam") |
| `gmail` | The Gmail address Ollie sorts |
| `city`, `timezone` | Your city and its time zone ("Lisbon", "Europe/Lisbon") |
| `currency` | The three-letter code for amounts and goals ("EUR") |
| `supabase_project` | Your Supabase project id (the part before `.supabase.co`) |
| `claude_project` | The name of the claude.ai project that will hold the agent contract ("Busy Desks") |
| `office_url` | Leave as is for now. You get the link in step 6. |

## 2. Build your kit

```sh
node scripts/new-office.mjs
```

This writes `my-office/` (not committed). It holds the database schema and starter roster, the agent contract and three prompts, all with your settings filled in.

## 3. Set up the database

In your Supabase project, run `my-office/1-schema.sql`, then `my-office/2-seed.sql`. You can paste them into the SQL editor, or ask Claude to apply each as a migration through the Supabase connector. This creates the tables (row-level security on, no public access), the `save_setting` function the office page writes through, and three rooms with Iris, Ollie and Audrey, all "planned".

## 4. Agent contract and Gmail labels

1. On claude.ai, create a project with the name you put in `claude_project`, and add `my-office/agent-contract.md` to it. This is the rulebook every agent reads at the start of a run.
2. In Gmail, create these labels: `Office/Money`, `Office/Receipts`, `Office/Markets`, `Office/Travel`, `Office/Home`, `Office/Career`, `Office/Tools`, `Office/Promos`, `Office/Needs you` and `Office/Sorted`. Ollie only uses labels; he never creates them.

## 5. Scheduled tasks

Create one scheduled task per file in `my-office/prompts/`, in Claude Code on the web or by asking Claude. For each one:
- the name, schedule (cron) and connectors are in the file's header
- the prompt is the text inside the ```` ```text ```` block

Then save each task's id (`trig_…`) so the agents can be called in by name:

```sql
update agents set scheduled_task_id = 'trig_…' where id = 'executive';  -- and 'inbox', 'auditor'
```

## 6. The office page

```sh
node scripts/build-office.mjs
```

Publish `office/index.html` as a claude.ai artifact; Claude can do it with "publish office/index.html as an artifact". Open it, and allow the Supabase and Claude Code Remote connectors when it asks. Put its link in `instance.json` as `office_url`.

## 7. First runs

Call each agent in once, in this order: Audrey, then Ollie, then Iris. Use "Call <name> in" on the office page, or say "Ollie, run now" to Claude. You can watch them work on the floor. When a run finishes cleanly, make that agent live:

```sql
update agents set status = 'live' where id = 'inbox';  -- and the others, once each has a good run
```

From then on they run on their schedules. Iris's morning brief lands on your desk on weekdays at 7:41.

## Growing your office

To hire more agents, follow "Adding a new agent" in your agent contract, and use the starter prompts as patterns: the same opening (contract plus logging essentials), hard rules, numbered steps, and a done or fail at the end. Free rooms are slots 1, 2, 3, 6 and 7. The schema already has tables for a spending tracker (transactions), a portfolio analyst (holdings, price_history, market_universe) and goals. Good agents are worth sharing: see CONTRIBUTING.md.

If you keep your copy in git: run `node scripts/render.mjs` after editing `instance.json`. It rewrites `supabase/schema.sql` with your settings, and CI's template check fails until you do.
