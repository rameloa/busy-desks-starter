# Working on Busy Desks

Read README.md, then CONTRIBUTING.md (where each kind of change goes, and the rules a change can't break). Setting up someone's own office: follow SETUP.md step by step, and ask before each step that creates something in their accounts.

- Never commit secrets: no API keys, tokens, service-role keys or OAuth credentials. The office page reads Supabase through the owner's connector, not a key. Run `git config core.hooksPath .githooks` after cloning.
- Office page: edit office/src/, never office/index.html; rebuild with `node scripts/build-office.mjs`. Read office/README.md and docs/office-floor-rules.md first.
- Schema: edit templates/supabase/schema.sql, then `node scripts/render.mjs`. Starter staff: starter/. Per-copy names and ids come from instance.json as `{{placeholders}}`; never write them out.
- Event kinds are fixed (start, work, found, handoff, report, deliver, done, fail); the office page animates exactly these.
- Commit messages: short, plain, present tense. Changes users would notice get a line in CHANGELOG.md.
