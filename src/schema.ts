import { z } from "zod";

/** "AZ-AUE-2023:S41" = sentence 41 of source AZ-AUE-2023. Every claim in a pill points at one or more of these. */
export const SentenceId = z.string().regex(/^[A-Z0-9-]+:S\d+$/, "sentence id like SRC-ID:S12");

export const Source = z.object({
  id: z.string().regex(/^[A-Z0-9-]+$/),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  /** Where we actually read it (e.g. a Wayback snapshot) when the original is gone or moved. */
  read_from: z.url().optional(),
  kind: z.enum(["primary", "secondary"]),
  retrieved: z.string(),
  /** Text between these two markers (inclusive of start) is the section we split into sentences. */
  section: z.object({ start: z.string(), end: z.string().optional() }),
  /** sha256 of the extracted section text, so anyone re-fetching can prove they read the same words. */
  sha256: z.string().optional(),
  note: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const Sentence = z.object({ id: SentenceId, text: z.string() });
export type Sentence = z.infer<typeof Sentence>;

export const EarlySignal = z.object({
  /** Minutes after the trigger, as the review reports it. */
  t_plus_min: z.number().int().min(0),
  sentence: SentenceId,
  /** Optional: only this part of the sentence is shown, e.g. the situation without the later explanation. Must be an exact substring. */
  excerpt: z.string().optional(),
});

export const Finding = z.object({
  id: z.string().regex(/^F\d+$/),
  kind: z.enum(["root_cause", "contributing_factor", "response", "remediation", "impact"]),
  sentence: SentenceId,
});

export const Case = z.object({
  id: z.string().regex(/^[A-Z0-9-]+$/),
  title: z.string(),
  /** Trigger time, ISO 8601 UTC. Replay uses it to pick the pill version that was in force. */
  t0: z.iso.datetime(),
  operator: z.string(),
  site: z.string(),
  sources: z.array(z.string()).min(1),
  /** What the on-site team could know in the first hour. Triage sees only these. */
  early_signals: z.array(EarlySignal).min(1),
  /** The after-action review as written by the operator's engineers. Capture reads these. */
  debrief: z.array(SentenceId).min(1),
  /** What the review concluded. Evaluation compares triage against these; triage never sees them. */
  findings: z.array(Finding).min(1),
  curation_note: z.string(),
});
export type Case = z.infer<typeof Case>;

export const Rule = z.object({
  id: z.string().regex(/^R-\d{3}$/),
  title: z.string(),
  when: z.array(z.string()).min(1),
  then: z.array(z.string()).min(1),
  why: z.string(),
  escalate: z.object({ to: z.string(), trigger: z.string() }).optional(),
  evidence: z.array(SentenceId).min(1),
  learned_from: z.array(z.string()).min(1),
  since: z.string(),
});
export type Rule = z.infer<typeof Rule>;

export const Guardrail = z.object({
  id: z.string().regex(/^G-\d{3}$/),
  text: z.string(),
  evidence: z.array(SentenceId),
  since: z.string(),
});

export const OpenQuestion = z.object({
  id: z.string().regex(/^Q-\d{3}$/),
  question: z.string(),
  why: z.string(),
  raised_by: z.string(),
  since: z.string(),
});

export const Approval = z.object({
  by: z.string(),
  role: z.string(),
  role_played: z.boolean(),
  at: z.iso.datetime(),
  decision: z.enum(["approve", "reject"]),
  note: z.string(),
});

export const PillStatus = z.enum(["proposed", "released", "superseded", "rejected", "withdrawn"]);

export const Pill = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: PillStatus,
  /** Replay clock: the date this version starts answering triage requests. */
  effective_from: z.iso.datetime().optional(),
  owner: z.object({ role: z.string(), name: z.string(), role_played: z.boolean() }),
  scope: z.object({ assets: z.array(z.string()), not_for: z.array(z.string()) }),
  context: z.string(),
  rules: z.array(Rule),
  guardrails: z.array(Guardrail),
  open_questions: z.array(OpenQuestion),
  regression_cases: z.array(z.string()),
  approvals: z.array(Approval),
  supersedes: z.string().optional(),
  changelog: z.array(z.string()),
});
export type Pill = z.infer<typeof Pill>;

/** One proposed change from capture. A proposal is a list of these, checked before any human sees it. */
export const Change = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_rule"),
    title: z.string(),
    when: z.array(z.string()).min(1),
    then: z.array(z.string()).min(1),
    why: z.string(),
    escalate: z.object({ to: z.string(), trigger: z.string() }).optional(),
    evidence: z.array(SentenceId).min(1),
  }),
  z.object({
    op: z.literal("amend_rule"),
    rule_id: z.string().regex(/^R-\d{3}$/),
    add_when: z.array(z.string()).default([]),
    add_then: z.array(z.string()).default([]),
    why: z.string(),
    escalate: z.object({ to: z.string(), trigger: z.string() }).optional(),
    evidence: z.array(SentenceId).min(1),
  }),
  z.object({ op: z.literal("add_guardrail"), text: z.string(), evidence: z.array(SentenceId).min(1) }),
  z.object({ op: z.literal("ask_expert"), question: z.string(), why: z.string() }),
]);
export type Change = z.infer<typeof Change>;

export const TriageResult = z.object({
  case_id: z.string(),
  pill: z.string(),
  pill_version: z.string().nullable(),
  classification: z.enum(["recurring", "partly_recurring", "novel"]),
  matched_rules: z.array(z.object({ rule_id: z.string(), because: z.string(), signals: z.array(SentenceId) })),
  next_actions: z.array(z.object({ action: z.string(), rule_id: z.string() })),
  escalate: z.object({ now: z.boolean(), to: z.string(), reason: z.string() }),
  not_covered: z.array(z.string()),
});
export type TriageResult = z.infer<typeof TriageResult>;

export const Evaluation = z.object({
  case_id: z.string(),
  pill_version: z.string().nullable(),
  per_finding: z.array(
    z.object({ finding: z.string(), anticipated: z.enum(["yes", "partly", "no"]), by: z.array(z.string()), note: z.string() }),
  ),
});
export type Evaluation = z.infer<typeof Evaluation>;

export const AuditEvent = z.object({
  seq: z.number().int().min(1),
  at: z.iso.datetime(),
  actor: z.string(),
  role: z.string(),
  action: z.string(),
  subject: z.string(),
  detail: z.record(z.string(), z.unknown()),
  prev: z.string(),
  hash: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEvent>;
