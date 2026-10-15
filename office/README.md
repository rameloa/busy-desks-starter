# The office page

One self-contained HTML file (`office/index.html`), built from `office/src/` and published as a claude.ai artifact. Read docs/office-floor-rules.md before changing how anyone moves or behaves.

## Hard constraints

- **One file out.** Artifact rules: scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net/npm or unpkg.com, pinned versions; stylesheets only from Google Fonts; everything else inline. No fetch to other hosts, no iframes, no alert/confirm/prompt.
- **No keys, no hosting.** The page talks to the owner's connectors through the artifact runtime (`mcp.callTool`): Supabase `execute_sql` (one snapshot query, polled every 30 s), the `save_setting` function for the owner's writes (goals, budgets, Done/Later/Ignore), and Claude Code Remote `fire_trigger` for "Call <Name> in".
- **Real events only.** start, work, found, handoff, report, deliver, done, fail. Errands between runs use icon emotes, never words; items move only along the chain; every desk, station and door stays reachable.
- **Phone first.** About 390 px wide; light and dark themes; reduced motion respected.
- **Writes:** only `save_setting` and `fire_trigger`. Holdings, prices and agent rows are never written from the page.

## Working on it

- `office/src/page.html` is the skeleton. Each `<!-- include: path -->` line is replaced by that file. The JS files are one script cut into parts that share one scope, so keep their order.
- `node scripts/build-office.mjs` writes `office/index.html`; `--check` fails if it's stale (pre-commit and CI).
- `node scripts/build-office.mjs --dev` also writes `office/dev/index.html`: the same page fed by `office/dev/snapshot.json` (example data) through a stand-in connector; writes go nowhere. Add `?demo` for the built-in demo, `?seed=N` for repeatable randomness.
- Checks (Playwright with Chromium): `node office/dev/check.mjs routes` (everything reachable), `shots <dir> [page]` (390 and 1280 px, light and dark), `same <a> <b>` (pixel comparison of two builds).
