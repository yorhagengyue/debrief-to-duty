import { z } from "zod";
import { authorize, loadPolicy } from "./access.ts";
import { Ledger } from "./audit.ts";
import { missingIds, unsupportedNumbers } from "./checks.ts";
import { LLM } from "./llm.ts";
import { Case, Change, Evaluation, Pill, TriageResult } from "./schema.ts";
import { loadPills, savePill } from "./store.ts";

type Sentences = Map<string, string>;

const lines = (ids: string[], idx: Sentences) => ids.map((id) => ({ id, text: idx.get(id) ?? "" }));

/** The part of a pill a model may see. Approvals, ledger hashes and file paths are not its business. */
export function pillForModel(p: Pill) {
  return {
    pill: `${p.id}@${p.version}`,
    scope: p.scope,
    rules: p.rules.map((r) => ({ id: r.id, title: r.title, when: r.when, then: r.then, why: r.why, escalate: r.escalate })),
    guardrails: p.guardrails.map((g) => ({ id: g.id, text: g.text })),
  };
}

// ---------------------------------------------------------------- capture

const CAPTURE_SYSTEM = `You turn an incident review, written by a data-centre operator's own engineers after they solved a problem, into proposed changes to an "intelligence pill": a governed card of know-how that a facility team applies during the first hour of a cooling or power event.

You work only from the numbered sentences you are given. You add nothing from general knowledge.

Each change is one of:
- add_rule: a new piece of judgement. "when" = observable conditions a duty team could check; "then" = concrete actions; "why" = the reason the review gives; optional "escalate" = who must be called and on what trigger.
- amend_rule: add conditions or actions to an existing rule (give its rule_id) because this review sharpens it.
- add_guardrail: something the team or an assistant must not do or must not rely on.
- ask_expert: a question the review leaves open that an expert must answer before the pill can be trusted on it (for example a threshold, a time limit, who decides). Use this instead of guessing.

Hard rules:
1. Every add_rule, amend_rule and add_guardrail lists "evidence": the ids of the sentences that support it, copied exactly as they appear in review_sentences (for example "AZ-SCUS-2018:S9", with no prefix). No evidence, no change.
2. Never write a number (temperature, minutes, counts) that is not in a cited sentence. If a number matters but is missing, use ask_expert.
3. Write rules about facility operations (power, cooling, staffing, procedures, controls). Ignore cloud-software recovery details.
4. Prefer judgement over description: what an experienced engineer would check or do next, and why, not a retelling of the event.
5. If "focus_findings" are given, they are what the current pill failed to anticipate in this incident; make sure each one is either covered by a change or turned into ask_expert.

Reply with JSON only: {"changes": [ ... ]}. Shapes:
{"op":"add_rule","title":"...","when":["..."],"then":["..."],"why":"...","escalate":{"to":"...","trigger":"..."},"evidence":["<id copied from review_sentences>"]}
{"op":"amend_rule","rule_id":"R-001","add_when":["..."],"add_then":["..."],"why":"...","evidence":["<id copied from review_sentences>"]}
{"op":"add_guardrail","text":"...","evidence":["<id copied from review_sentences>"]}
{"op":"ask_expert","question":"...","why":"..."}`;

export interface CaptureResult {
  accepted: Change[];
  rejected: { change: unknown; reasons: string[] }[];
  llm: { provider: string; model: string; key: string; replayed: boolean };
}

export async function capture(llm: LLM, kase: Case, idx: Sentences, pill: Pill | null, focus: string[]): Promise<CaptureResult> {
  const debrief = lines(kase.debrief, idx);
  const findings = kase.findings.filter((f) => focus.includes(f.id)).map((f) => ({ id: f.id, kind: f.kind, text: idx.get(f.sentence) }));
  const user = JSON.stringify({
    incident: { id: kase.id, title: kase.title, operator: kase.operator, site: kase.site },
    review_sentences: debrief,
    current_pill: pill ? pillForModel(pill) : null,
    focus_findings: findings,
  });
  const { data, key, replayed } = await llm.json<{ changes: unknown[] }>({ system: CAPTURE_SYSTEM, user }, `capture:${kase.id}`, (d) => Array.isArray(d?.changes));
  const allowed = new Set(kase.debrief);
  const ruleIds = new Set(pill?.rules.map((r) => r.id) ?? []);
  const accepted: Change[] = [];
  const rejected: CaptureResult["rejected"] = [];
  for (const raw of data.changes ?? []) {
    const parsed = Change.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ change: raw, reasons: [`shape: ${z.prettifyError(parsed.error).slice(0, 200)}`] });
      continue;
    }
    const c = parsed.data;
    const reasons: string[] = [];
    if (c.op !== "ask_expert") {
      const bad = missingIds(c.evidence, allowed);
      if (bad.length) reasons.push(`cites sentences that are not in this review: ${bad.join(", ")}`);
      const text = JSON.stringify({ ...c, evidence: undefined });
      const nums = unsupportedNumbers(text, c.evidence.map((e) => idx.get(e) ?? ""));
      if (nums.length) reasons.push(`numbers not stated in the cited sentences: ${nums.join(", ")}`);
    }
    if (c.op === "amend_rule" && !ruleIds.has(c.rule_id)) reasons.push(`amends ${c.rule_id}, which is not in the current pill`);
    (reasons.length ? rejected.push({ change: c, reasons }) : accepted.push(c));
  }
  return { accepted, rejected, llm: { provider: llm.provider.name, model: llm.provider.model, key, replayed } };
}

// ---------------------------------------------------------------- proposals and approval

export function bump(version: string | null, changes: Change[]): string {
  if (!version) return "1.0.0";
  const [M, m, p] = version.split(".").map(Number);
  const structural = changes.some((c) => c.op === "add_rule" || c.op === "add_guardrail");
  return structural ? `${M}.${m + 1}.0` : `${M}.${m}.${p + 1}`;
}

const pad = (n: number) => String(n).padStart(3, "0");

/** Build the next version as a *proposed* pill. Nothing answers triage until a person approves it. */
export function propose(base: Pill | null, template: Omit<Pill, "version" | "status" | "rules" | "guardrails" | "open_questions" | "approvals" | "changelog" | "regression_cases">, changes: Change[], fromCase: string): Pill {
  const version = bump(base?.version ?? null, changes);
  const rules = structuredClone(base?.rules ?? []);
  const guardrails = structuredClone(base?.guardrails ?? []);
  const questions = structuredClone(base?.open_questions ?? []);
  const log: string[] = [];
  for (const c of changes) {
    if (c.op === "add_rule") {
      const id = `R-${pad(rules.length + 1)}`;
      rules.push({ id, title: c.title, when: c.when, then: c.then, why: c.why, escalate: c.escalate, evidence: c.evidence, learned_from: [fromCase], since: version });
      log.push(`${id} added from ${fromCase}: ${c.title}`);
    } else if (c.op === "amend_rule") {
      const r = rules.find((x) => x.id === c.rule_id)!;
      r.when.push(...c.add_when);
      r.then.push(...c.add_then);
      r.why = `${r.why} ${c.why}`.trim();
      if (c.escalate) r.escalate = c.escalate;
      r.evidence = [...new Set([...r.evidence, ...c.evidence])];
      r.learned_from = [...new Set([...r.learned_from, fromCase])];
      log.push(`${r.id} amended from ${fromCase}`);
    } else if (c.op === "add_guardrail") {
      const id = `G-${pad(guardrails.length + 1)}`;
      guardrails.push({ id, text: c.text, evidence: c.evidence, since: version });
      log.push(`${id} added from ${fromCase}`);
    } else {
      const id = `Q-${pad(questions.length + 1)}`;
      questions.push({ id, question: c.question, why: c.why, raised_by: fromCase, since: version });
      log.push(`${id} raised by ${fromCase}`);
    }
  }
  return Pill.parse({
    ...template,
    version,
    status: "proposed",
    rules,
    guardrails,
    open_questions: questions,
    regression_cases: [...new Set([...(base?.regression_cases ?? []), fromCase])],
    approvals: [],
    supersedes: base?.version,
    changelog: [...(base?.changelog ?? []), `${version}: ${log.join("; ")}`],
  });
}

export function decide(p: Pill, d: { by: string; role: string; role_played: boolean; at: string; decision: "approve" | "reject"; note: string; effective_from?: string }, ledger: Ledger): Pill {
  if (p.status !== "proposed") throw new Error(`${p.id}@${p.version} is ${p.status}, not proposed`);
  authorize(loadPolicy(), d.by, d.decision, `${p.id}@${p.version}`, ledger);
  const next: Pill = {
    ...p,
    status: d.decision === "approve" ? "released" : "rejected",
    effective_from: d.decision === "approve" ? (d.effective_from ?? d.at) : undefined,
    approvals: [...p.approvals, { by: d.by, role: d.role, role_played: d.role_played, at: d.at, decision: d.decision, note: d.note }],
  };
  if (d.decision === "approve") {
    for (const old of loadPills(p.id).filter((x) => x.status === "released")) savePill({ ...old, status: "superseded" });
  }
  savePill(next);
  ledger.append({ at: d.at, actor: d.by, role: d.role, action: d.decision === "approve" ? "release" : "reject", subject: `${p.id}@${p.version}`, detail: { note: d.note, effective_from: next.effective_from, role_played: d.role_played, rules: p.rules.length } });
  return next;
}

// ---------------------------------------------------------------- triage

const TRIAGE_SYSTEM = `You are the duty assistant of a data-centre facility team during the first hour of an event. You apply one approved intelligence pill and nothing else.

You see only what the team knew in the first hour ("signals"). You do not know how the event ended.

Rules:
1. Every action you recommend must come from a rule in the pill; give that rule's id. Do not invent actions or numbers.
2. Classify: "recurring" if the signals clearly meet the "when" conditions of one or more rules; "partly_recurring" if some rules apply but the signals also show something no rule addresses; "novel" if no rule applies.
3. Anything that matters but no rule covers goes into "not_covered", and then escalate.
4. Follow the guardrails.
5. Order next_actions by urgency.

Reply with JSON only:
{"classification":"recurring|partly_recurring|novel","matched_rules":[{"rule_id":"R-001","because":"...","signals":["<id copied from signals>"]}],"next_actions":[{"action":"...","rule_id":"R-001"}],"escalate":{"now":true,"to":"...","reason":"..."},"not_covered":["..."]}`;

/** Triage needs only what was observable: an id, the site, and the signals. A live alarm feed fits the same shape. */
export type Observed = Pick<Case, "id" | "site" | "early_signals">;

export async function triage(llm: LLM, kase: Observed, idx: Sentences, pill: Pill | null): Promise<{ result: TriageResult; removed: string[]; llm?: CaptureResult["llm"] }> {
  if (!pill) {
    return {
      result: {
        case_id: kase.id,
        pill: "dc-cooling-loss",
        pill_version: null,
        classification: "novel",
        matched_rules: [],
        next_actions: [],
        escalate: { now: true, to: "Facility duty manager and the subject expert", reason: "No released pill covers this situation yet." },
        not_covered: ["No approved know-how exists for this situation; this incident becomes the first source for one."],
      },
      removed: [],
    };
  }
  const signals = kase.early_signals.map((s) => ({ id: s.sentence, t_plus_min: s.t_plus_min, text: s.excerpt ?? idx.get(s.sentence) }));
  const user = JSON.stringify({ site: kase.site, signals, pill: pillForModel(pill) });
  const { data, key, replayed } = await llm.json<Record<string, unknown>>({ system: TRIAGE_SYSTEM, user }, `triage:${kase.id}@${pill.version}`, (d) => ["recurring", "partly_recurring", "novel"].includes(String(d?.classification)) && typeof d?.escalate === "object");
  const ruleIds = new Set(pill.rules.map((r) => r.id));
  const sigIds = new Set(kase.early_signals.map((s) => s.sentence));
  const removed: string[] = [];
  const raw = data as { matched_rules?: { rule_id: string; because: string; signals?: string[] }[]; next_actions?: { action: string; rule_id: string }[]; not_covered?: string[] };
  const matched = (raw.matched_rules ?? []).filter((m) => {
    if (ruleIds.has(m.rule_id)) return true;
    removed.push(`matched unknown rule ${m.rule_id}`);
    return false;
  }).map((m) => ({ ...m, signals: (m.signals ?? []).filter((s) => sigIds.has(s)) }));
  const notCovered = [...(raw.not_covered ?? [])];
  const actions = (raw.next_actions ?? []).filter((a) => {
    if (!ruleIds.has(a.rule_id)) {
      removed.push(`action without a pill rule: "${a.action}"`);
      notCovered.push(a.action);
      return false;
    }
    const rule = pill.rules.find((r) => r.id === a.rule_id)!;
    const nums = unsupportedNumbers(a.action, [JSON.stringify(rule)]);
    if (nums.length) {
      removed.push(`action states numbers its rule does not: "${a.action}"`);
      return false;
    }
    return true;
  });
  const result = TriageResult.parse({
    case_id: kase.id,
    pill: pill.id,
    pill_version: pill.version,
    classification: (data as { classification?: string }).classification,
    matched_rules: matched,
    next_actions: actions,
    escalate: (data as { escalate?: unknown }).escalate,
    not_covered: notCovered,
  });
  return { result, removed, llm: { provider: llm.provider.name, model: llm.provider.model, key, replayed } };
}

// ---------------------------------------------------------------- evaluation

const EVAL_SYSTEM = `You grade a first-hour triage against what the operator's own incident review later concluded.

For each finding, decide whether a duty team following the triage (its matched rules, next actions and escalation) would have been pointed at the substance of that finding during the incident:
- "yes": the triage names it or directs the action it describes.
- "partly": the triage points in the right direction but misses the key specific (the mechanism, the order, the threshold, the person).
- "no": nothing in the triage leads there.
For remediation findings (longer-term fixes), "yes" means the triage already applies that practice.

"by" lists the rule ids that earned the credit (empty for "no"). "note" is one short sentence. Judge only from the triage given; do not reward actions the triage did not state.

Reply with JSON only: {"per_finding":[{"finding":"F1","anticipated":"yes|partly|no","by":["R-001"],"note":"..."}]}`;

export async function evaluate(llm: LLM, kase: Case, idx: Sentences, t: TriageResult): Promise<{ result: Evaluation; llm?: CaptureResult["llm"] }> {
  if (!t.pill_version) {
    return {
      result: {
        case_id: kase.id,
        pill_version: null,
        per_finding: kase.findings.map((f) => ({ finding: f.id, anticipated: "no" as const, by: [], note: "No pill existed yet." })),
      },
    };
  }
  const findings = kase.findings.map((f) => ({ id: f.id, kind: f.kind, text: idx.get(f.sentence) }));
  const user = JSON.stringify({ triage: { classification: t.classification, matched_rules: t.matched_rules, next_actions: t.next_actions, escalate: t.escalate, not_covered: t.not_covered }, findings });
  const { data, key, replayed } = await llm.json<{ per_finding?: { finding: string; anticipated: string; by?: string[]; note: string }[] }>({ system: EVAL_SYSTEM, user }, `evaluate:${kase.id}@${t.pill_version}`, (d) => Array.isArray(d?.per_finding));
  const fids = new Set(kase.findings.map((f) => f.id));
  const per = (data.per_finding ?? []).filter((p) => fids.has(p.finding));
  for (const f of kase.findings) if (!per.some((p) => p.finding === f.id)) per.push({ finding: f.id, anticipated: "no", by: [], note: "Not graded by the model; counted as not anticipated." });
  const result = Evaluation.parse({ case_id: kase.id, pill_version: t.pill_version, per_finding: per.map((p) => ({ ...p, by: p.by ?? [] })) });
  return { result, llm: { provider: llm.provider.name, model: llm.provider.model, key, replayed } };
}

export function score(e: Evaluation): number {
  const v = { yes: 1, partly: 0.5, no: 0 } as const;
  return e.per_finding.reduce((s, p) => s + v[p.anticipated], 0) / Math.max(1, e.per_finding.length);
}

/**
 * Roll back like `git revert`: history is never rewritten. A new patch version is released whose content is the
 * chosen earlier version, and the ledger records who did it and why.
 */
export function rollback(pillId: string, to: string, d: { by: string; role: string; role_played: boolean; at: string; note: string }, ledger: Ledger): Pill {
  const all = loadPills(pillId);
  const target = all.find((p) => p.version === to);
  if (!target) throw new Error(`${pillId}@${to} not found`);
  authorize(loadPolicy(), d.by, "rollback");
  const head = all.at(-1)!;
  const [M, m, pt] = head.version.split(".").map(Number);
  const version = `${M}.${m}.${pt + 1}`;
  const next: Pill = Pill.parse({
    ...structuredClone(target),
    version,
    status: "proposed",
    effective_from: undefined,
    approvals: [],
    supersedes: head.version,
    changelog: [...head.changelog, `${version}: rollback to the content of ${to} (${d.note})`],
  });
  savePill(next);
  ledger.append({ at: d.at, actor: d.by, role: d.role, action: "rollback", subject: `${pillId}@${version}`, detail: { to, from: head.version, note: d.note } });
  ledger.append({ at: d.at, actor: "capture", role: "Capture", action: "propose", subject: `${pillId}@${version}`, detail: { revert_of: head.version, content_of: to } });
  return decide(next, { ...d, decision: "approve", note: `Rollback to ${to}: ${d.note}`, effective_from: d.at }, ledger);
}

// ---------------------------------------------------------------- asking the pill (the manager's conversation)

const ASK_SYSTEM = `You answer a manager's question on behalf of the experts whose know-how is in this intelligence pill, as if the facility's most experienced engineer were in the room.

You may use only the pill: its rules, guardrails and open questions. Cite the ids you rely on. Do not add facts, numbers or practices from general knowledge.
If the pill does not answer the question, say so plainly, name any open question that matches, and say who should decide (the pill owner).
Keep it to what a manager needs: the answer, why, and what would change it.

Reply with JSON only: {"answer":"...","relies_on":["R-001","G-002"],"not_in_pill":"... or empty","decide_with":"..."}`;

export interface AskResult {
  question: string;
  pill_version: string;
  answer: string;
  relies_on: string[];
  not_in_pill: string;
  decide_with: string;
  removed_by_checks: string[];
}

export async function ask(llm: LLM, pill: Pill, question: string): Promise<AskResult> {
  const user = JSON.stringify({ question, pill: { ...pillForModel(pill), open_questions: pill.open_questions.map((q) => ({ id: q.id, question: q.question })) } });
  const { data } = await llm.json<{ answer?: string; relies_on?: string[]; not_in_pill?: string; decide_with?: string }>({ system: ASK_SYSTEM, user }, `ask@${pill.version}`, (d) => typeof d?.answer === "string" && Array.isArray(d?.relies_on));
  const known = new Set([...pill.rules.map((r) => r.id), ...pill.guardrails.map((g) => g.id), ...pill.open_questions.map((q) => q.id)]);
  const removed: string[] = [];
  const relies = (data.relies_on ?? []).filter((id) => (known.has(id) ? true : (removed.push(`cited unknown id ${id}`), false)));
  const pool = [JSON.stringify(pillForModel(pill)), JSON.stringify(pill.open_questions)];
  const nums = unsupportedNumbers(data.answer ?? "", pool);
  if (nums.length) removed.push(`answer states numbers the pill does not: ${nums.join(", ")}`);
  return {
    question,
    pill_version: pill.version,
    answer: nums.length ? "Withheld: the draft answer stated numbers that are not in the pill. Ask the pill owner." : (data.answer ?? ""),
    relies_on: relies,
    not_in_pill: data.not_in_pill ?? "",
    decide_with: data.decide_with ?? pill.owner.role,
    removed_by_checks: removed,
  };
}
