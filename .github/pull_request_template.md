## What changed

<!-- One or two sentences. Screenshots (390 and 1280 px, light and dark) for office page changes. -->

## Why

## Existing offices

<!-- What an existing office would need to do to pick this up: re-create a scheduled task, run some SQL, republish the page, update the contract in the claude.ai project. "None" is fine. -->

## Checks

- [ ] `bash scripts/check-secrets.sh --all`, `node scripts/build-office.mjs --check` and `node scripts/render.mjs --check` pass
- [ ] Office page changes: `node office/dev/check.mjs routes` passes
- [ ] Edited sources (`office/src/`, `templates/`, `starter/`), not built or rendered files
- [ ] No secrets and no personal data; any example data is made up and marked as example
- [ ] The rules in CONTRIBUTING.md still hold: no agent pays, sends or deletes; event kinds unchanged; only the Executive files to the owner's desk
- [ ] CHANGELOG.md line, if a user of the office would notice
