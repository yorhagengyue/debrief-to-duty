import { rmSync } from "node:fs";
import { join } from "node:path";
import { Ledger } from "./audit.ts";
import { capture, decide, evaluate, propose, score, triage } from "./engine.ts";
import { LLM } from "./llm.ts";
import { Case, Evaluation, Pill } from "./schema.ts";
import { sentenceIndex } from "./sources.ts";
import { loadCases, loadPills, paths, pillInForce, savePill, writeJSONFile, writeYAML } from "./store.ts";

export const PILL_ID = "dc-cooling-loss";

export const TEMPLATE = {
  id: PILL_ID,
  name: "Data hall cooling loss: first-hour judgement",
  owner: { role: "Critical Facilities Engineering Lead", name: "Pill owner (role-played in this replay)", role_played: true },
  scope: {
    assets: ["data halls cooled by chilled-water plant (chillers, pumps, chilled-water loop)", "utility and generator power feeding that plant"],
    not_for: ["IT service recovery and failover", "fire suppression and life safety (follow the site emergency plan)"],
  },
  context:
    "Know-how for the first hour after cooling capacity is lost or at risk in a data hall: what to check, what to do next, and when a person must decide. Every rule cites the incident review sentences it comes from.",
};

/** Replay clock: a reviewed lesson goes live this many days after the incident (time to publish the review and approve). */
const APPROVAL_LAG_DAYS = 30;
const APPROVER = { by: "Head of Critical Facilities (role-played)", role: "Approver", role_played: true };

const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400_000).toISOString();

export interface CaseRun {
  case_id: string;
  pill_version: string | null;
  classification: string;
  score: number;
  proposed: string;
  accepted_changes: number;
  rejected_changes: number;
}

/** A drop bigger than one finding's worth on any earlier incident is flagged to the approver. */
export const REGRESSION_TOLERANCE = 0.1;

export interface GateRow {
  case_id: string;
  blind_version: string | null;
  blind: number;
  base_version: string | null;
  base: number;
  candidate: number;
  regressed: boolean;
}

/** Re-triage every earlier incident with the candidate and compare it with the version currently released. */
async function regression(llm: LLM, idx: Map<string, string>, base: Pill | null, candidate: Pill, cases: Case[]): Promise<GateRow[]> {
  return Promise.all(
    cases.map(async (k) => {
      const blindPill = pillInForce(PILL_ID, k.t0);
      const scoreWith = async (p: Pill | null) => score((await evaluate(llm, k, idx, (await triage(llm, k, idx, p)).result)).result);
      const blind = await scoreWith(blindPill);
      const baseScore = base ? await scoreWith(base) : blind;
      const t = await triage(llm, k, idx, candidate);
      const e = await evaluate(llm, k, idx, t.result);
      const cand = score(e.result);
      writeJSONFile(join(paths.runs, k.id, `regression@${candidate.version}.json`), { triage: t.result, removed: t.removed, evaluation: e.result, score: cand });
      return { case_id: k.id, blind_version: blindPill?.version ?? null, blind, base_version: base?.version ?? null, base: baseScore, candidate: cand, regressed: cand < baseScore - REGRESSION_TOLERANCE };
    }),
  );
}

export async function replay(opts: { until?: string; fresh?: boolean; approveLast?: boolean } = {}): Promise<CaseRun[]> {
  if (opts.fresh) for (const d of [paths.pills, paths.proposals, paths.runs, join(paths.runs, "..", "ledger")]) rmSync(d, { recursive: true, force: true });
  const llm = new LLM();
  const ledger = new Ledger();
  const idx = sentenceIndex();
  const cases = loadCases();
  const runs: CaseRun[] = [];
  const done: Case[] = [];
  for (const k of cases) {
    const inForce = pillInForce(PILL_ID, k.t0);
    const t = await triage(llm, k, idx, inForce);
    const e = await evaluate(llm, k, idx, t.result);
    const s = score(e.result);
    writeJSONFile(join(paths.runs, k.id, "triage.json"), { ...t.result, removed_by_checks: t.removed, llm: t.llm });
    writeJSONFile(join(paths.runs, k.id, "evaluation.json"), { ...e.result, score: s, llm: e.llm });
    ledger.append({ at: k.t0, actor: "duty assistant", role: "Triage", action: "triage", subject: k.id, detail: { pill: inForce ? `${PILL_ID}@${inForce.version}` : null, classification: t.result.classification, score: s } });

    const focus = e.result.per_finding.filter((p) => p.anticipated !== "yes").map((p) => p.finding);
    const latest = loadPills(PILL_ID).filter((p) => p.status === "released").at(-1) ?? null;
    const c = await capture(llm, k, idx, latest, focus);
    const candidate = propose(latest, TEMPLATE, c.accepted, k.id);
    savePill(candidate);
    const reviewAt = addDays(k.t0, APPROVAL_LAG_DAYS - 1);
    writeYAML(join(paths.proposals, PILL_ID, `${candidate.version}.yaml`), {
      pill: `${PILL_ID}@${candidate.version}`,
      base: latest?.version ?? null,
      from_case: k.id,
      focus_findings: focus,
      accepted: c.accepted,
      rejected_by_checks: c.rejected,
      llm: c.llm,
    });
    ledger.append({ at: reviewAt, actor: "capture", role: "Capture", action: "propose", subject: `${PILL_ID}@${candidate.version}`, detail: { from_case: k.id, accepted: c.accepted.length, rejected: c.rejected.length } });

    const reg = await regression(llm, idx, latest, candidate, [...done, k]);
    writeJSONFile(join(paths.runs, k.id, `gate@${candidate.version}.json`), reg);
    const worse = reg.filter((r) => r.regressed);
    const isLast = opts.until === k.id || k === cases.at(-1);
    if (!isLast || opts.approveLast) {
      const note = worse.length
        ? `Approved with ${worse.length} flagged regression(s) (${worse.map((w) => `${w.case_id} ${w.base.toFixed(2)}→${w.candidate.toFixed(2)}`).join(", ")}): the new rules are judged worth it; owner to review the flagged incidents.`
        : `Regression gate passed on ${reg.length} incident(s) against v${latest?.version ?? "none"}.`;
      decide(candidate, { ...APPROVER, at: addDays(k.t0, APPROVAL_LAG_DAYS), decision: "approve", note, effective_from: addDays(k.t0, APPROVAL_LAG_DAYS) }, ledger);
    }
    runs.push({ case_id: k.id, pill_version: inForce?.version ?? null, classification: t.result.classification, score: s, proposed: candidate.version, accepted_changes: c.accepted.length, rejected_changes: c.rejected.length });
    done.push(k);
    if (opts.until === k.id) break;
  }
  writeJSONFile(join(paths.runs, "summary.json"), runs);
  return runs;
}

export type { Evaluation };
