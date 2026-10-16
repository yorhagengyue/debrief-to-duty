import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { Ledger } from "./audit.ts";
import { PILL_ID } from "./replay.ts";
import { loadSources, ROOT, sentenceIndex } from "./sources.ts";
import { loadCases, loadPills, paths, pillInForce, writeJSONFile } from "./store.ts";

/**
 * One JSON file for the static viewer. Only sentences that something cites are included, so the site quotes the
 * reviews sentence by sentence with links instead of republishing them.
 */
const readJSON = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

const idx = sentenceIndex();
const cited = new Set<string>();
const cases = loadCases();
const pills = loadPills(PILL_ID);
const ledger = new Ledger();
const propDir = join(paths.proposals, PILL_ID);
const proposals = (existsSync(propDir) ? readdirSync(propDir) : [])
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => YAML.parse(readFileSync(join(propDir, f), "utf8")) as { pill: string; from_case: string; focus_findings: string[]; accepted: unknown[]; rejected_by_checks: { change: unknown; reasons: string[] }[]; llm: unknown });

const timeline = cases.map((k) => {
  for (const s of k.early_signals) cited.add(s.sentence);
  for (const f of k.findings) cited.add(f.sentence);
  const dir = join(paths.runs, k.id);
  const triage = readJSON(join(dir, "triage.json"));
  const evaluation = readJSON(join(dir, "evaluation.json"));
  const proposal = proposals.find((x) => x.from_case === k.id) ?? null;
  const proposed = proposal ? pills.find((p) => `${p.id}@${p.version}` === proposal.pill) : undefined;
  const gate = proposed ? readJSON(join(dir, `gate@${proposed.version}.json`)) : null;
  return {
    case: {
      ...k,
      early_signals: k.early_signals.map((s) => ({ ...s, text: s.excerpt ?? idx.get(s.sentence), full: idx.get(s.sentence) })),
      findings: k.findings.map((f) => ({ ...f, text: idx.get(f.sentence) })),
    },
    pill_in_force: pillInForce(PILL_ID, k.t0)?.version ?? null,
    triage,
    evaluation,
    proposal: proposal && { version: proposed!.version, status: proposed!.status, focus_findings: proposal.focus_findings, accepted: proposal.accepted, rejected_by_checks: proposal.rejected_by_checks, llm: proposal.llm },
    gate,
  };
});

for (const p of pills) {
  for (const r of p.rules) r.evidence.forEach((e) => cited.add(e));
  for (const g of p.guardrails) g.evidence.forEach((e) => cited.add(e));
}
for (const t of timeline) for (const c of t.proposal?.rejected_by_checks ?? []) for (const e of (c.change as { evidence?: string[] }).evidence ?? []) cited.add(e);

const scenDir = join(paths.runs, "scenarios");
const scenFiles = (existsSync(scenDir) ? readdirSync(scenDir) : []).filter((f) => f.endsWith(".json")).sort();
const scenarios = scenFiles.filter((f) => !/\.[a-z]+\.json$/.test(f.replace(/@\d+\.\d+\.\d+/, ""))).map((f) => readJSON(join(scenDir, f)));
const portability = scenFiles.filter((f) => /\.[a-z]+\.json$/.test(f.replace(/@\d+\.\d+\.\d+/, ""))).map((f) => readJSON(join(scenDir, f)));
const askDir = join(paths.runs, "asks");
const asks = (existsSync(askDir) ? readdirSync(askDir) : []).filter((f) => f.endsWith(".json")).map((f) => readJSON(join(askDir, f)));

const sentences = Object.fromEntries([...cited].filter((id) => idx.has(id)).sort().map((id) => [id, idx.get(id)]));
const verify = ledger.verify();

const site = {
  generated_at: new Date().toISOString(),
  pill_id: PILL_ID,
  honesty: [
    "Replay: the six incidents happened to four different operators. The replay treats them as if one operator had lived through all of them with this system installed from 2018.",
    "No person reviewed versions 1.0.0 to 1.4.0: the replay script approved each one automatically in the name of a role-played approver (role_played: true), including one the regression gate flagged. Version 1.5.0 is left for a person to decide.",
    "Every rule cites sentences from the operators' public incident reviews. One case (Singapore 2023) rests on a news report because no public review was found.",
    "Blind score: triage sees only the first hour. It is graded by a language model against what the review concluded; the grades are in runs/ for anyone to check.",
  ],
  sources: loadSources().map(({ section, sha256, ...s }) => s),
  sentences,
  timeline,
  pills,
  scenarios,
  portability,
  asks,
  ledger: { events: ledger.all(), verify },
};
writeJSONFile(join(ROOT, "web", "data.json"), site);
// Also as a script, so web/index.html works when opened straight from disk (file:// cannot fetch JSON).
writeFileSync(join(ROOT, "web", "data.js"), `window.PILL_DATA = ${JSON.stringify(site)};
`, "utf8");
console.log(`web/data.json: ${timeline.length} incidents, ${pills.length} pill versions, ${Object.keys(sentences).length} quoted sentences`);
