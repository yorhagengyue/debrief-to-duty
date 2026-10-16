# CODEBUDDY.md

Context for CodeBuddy when it works in this repository.

## What this project is

A system that turns operators' incident reviews into an **intelligence pill**: a versioned YAML file of rules
(when / then / why / escalate), guardrails and open questions, where every rule cites the review sentences it came
from. A pill version answers nothing until a person approves it. The replay in `src/replay.ts` runs six public
data-centre cooling incidents in date order: triage blind with the version in force, grade against the review,
capture what was missed as a proposed version, regression-test, approve.

Read first: `README.md`, `src/schema.ts` (all file formats), `pills/dc-cooling-loss/*.yaml` (real pill versions).

## Rules

1. Keys live only in `.env` at the repository root. Never print, log or copy them.
2. Never edit files under `pills/`, `proposals/`, `runs/`, `ledger/` or `fixtures/` by hand. They are produced by the
   CLI and the ledger is hash-chained; a hand edit breaks `npm run pills -- verify`.
3. Never add a fact, number or practice to a pill that is not in a cited review sentence.
4. Every change ends with `npm test` and `npx tsc --noEmit` passing.

## Task cards

### T1. Pill card and version diff (`pills card`, `pills diff`)

Goal: a reviewer who does not read YAML can review a pill version and see exactly what changed.

- `npm run pills -- card <version>` writes `docs/cards/dc-cooling-loss-<version>.md`: name, version, status, owner,
  effective date, scope; then each rule as a short section (when / then / why / escalate) with its evidence ids and the
  quoted sentence for each id (use `sentenceIndex()` from `src/sources.ts`); then guardrails, open questions,
  approvals and changelog.
- `npm run pills -- diff <from> <to>` prints, and with `--md` writes `docs/cards/diff-<from>-<to>.md`: rules added,
  rules whose when/then/why/escalate/evidence changed (show old and new lines), guardrails added, questions added,
  status and approval changes.
- Put the logic in a new `src/card.ts` with pure functions `renderCard(pill, idx)` and `diffPills(a, b)`; wire them in
  `src/cli.ts`. Add `test/card.test.ts` covering: a rule added, a rule amended, nothing changed.
- Do not change any existing behaviour or file format.

Done when: the two commands work on the real versions 1.3.0 → 1.4.0, the tests pass, and the generated Markdown reads
cleanly on GitHub.
