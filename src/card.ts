import type { Pill, Rule } from "./schema.ts";

type Guardrail = Pill["guardrails"][number];
type Question = Pill["open_questions"][number];
type Approval = Pill["approvals"][number];

/** One line per quoted sentence, so a reviewer reads the words the rule rests on, not just the ids. */
function quote(id: string, idx: Map<string, string>): string {
  const text = idx.get(id);
  return text ? `- \`${id}\`\n  > ${text.replace(/\s*\n\s*/g, " ")}` : `- \`${id}\` (sentence text not available)`;
}

/** Mark a role-played person once, even when the name already says so. */
function rolePlayed(name: string, flag: boolean): string {
  return flag && !/role-played/i.test(name) ? `${name} (role-played)` : name;
}

function approvalLine(a: Approval): string {
  const who = `${rolePlayed(a.by, a.role_played)}, ${a.role}`;
  return `**${a.decision}** by ${who} at ${a.at}${a.note ? ` — ${a.note}` : ""}`;
}

/** A Markdown card for one pill version, readable without opening the YAML. */
export function renderCard(pill: Pill, idx: Map<string, string>): string {
  const out: string[] = [];
  out.push(`# ${pill.name}`, "");
  out.push("| | |", "|---|---|");
  out.push(`| Pill | \`${pill.id}\` |`);
  out.push(`| Version | ${pill.version}${pill.supersedes ? ` (supersedes ${pill.supersedes})` : ""} |`);
  out.push(`| Status | ${pill.status} |`);
  out.push(`| Owner | ${pill.owner.role}: ${rolePlayed(pill.owner.name, pill.owner.role_played)} |`);
  out.push(`| Effective from | ${pill.effective_from ?? "not set"} |`);
  out.push("");
  out.push(pill.context, "");
  out.push("## Scope", "", "Covers:", "", ...pill.scope.assets.map((a) => `- ${a}`), "", "Not for:", "", ...pill.scope.not_for.map((a) => `- ${a}`), "");

  out.push(`## Rules (${pill.rules.length})`, "");
  for (const r of pill.rules) {
    out.push(`### ${r.id}. ${r.title}`, "");
    out.push(`*Since ${r.since}; learned from ${r.learned_from.join(", ")}.*`, "");
    out.push("**When**", "", ...r.when.map((w) => `- ${w}`), "");
    out.push("**Then**", "", ...r.then.map((t) => `- ${t}`), "");
    out.push("**Why**", "", r.why, "");
    if (r.escalate) out.push("**Escalate**", "", `To ${r.escalate.to}, when ${r.escalate.trigger}.`, "");
    out.push("**Evidence**", "", ...r.evidence.map((e) => quote(e, idx)), "");
  }

  out.push(`## Guardrails (${pill.guardrails.length})`, "");
  for (const g of pill.guardrails) {
    out.push(`### ${g.id}`, "", `*Since ${g.since}.*`, "", g.text, "");
    if (g.evidence.length) out.push("**Evidence**", "", ...g.evidence.map((e) => quote(e, idx)), "");
  }

  out.push(`## Open questions (${pill.open_questions.length})`, "");
  for (const q of pill.open_questions) {
    out.push(`### ${q.id}`, "", `*Raised by ${q.raised_by}, since ${q.since}.*`, "", `**Question.** ${q.question}`, "", `**Why it matters.** ${q.why}`, "");
  }

  out.push("## Approvals", "");
  if (pill.approvals.length) out.push(...pill.approvals.map((a) => `- ${approvalLine(a)}`), "");
  else out.push("None yet. This version answers nothing until a person approves it.", "");

  out.push("## Changelog", "", ...pill.changelog.map((c) => `- ${c}`), "");
  return out.join("\n");
}

export interface FieldChange {
  field: "title" | "when" | "then" | "why" | "escalate" | "evidence";
  removed: string[];
  added: string[];
}

export interface PillDiff {
  from: string;
  to: string;
  rulesAdded: Rule[];
  rulesRemoved: Rule[];
  rulesChanged: { id: string; title: string; changes: FieldChange[] }[];
  guardrailsAdded: Guardrail[];
  guardrailsRemoved: Guardrail[];
  questionsAdded: Question[];
  questionsRemoved: Question[];
  status: { from: string; to: string } | null;
  effectiveFrom: { from: string | null; to: string | null } | null;
  /** Each version carries its own approvals; they are listed side by side, never as "removed". Null when identical. */
  approvals: { from: Approval[]; to: Approval[] } | null;
}

/** Lines only in `a` and lines only in `b`, keeping each side's order. */
function lineDiff(a: string[], b: string[]): { removed: string[]; added: string[] } {
  return { removed: a.filter((x) => !b.includes(x)), added: b.filter((x) => !a.includes(x)) };
}

function escalateLine(r: Rule): string[] {
  return r.escalate ? [`to ${r.escalate.to}, when ${r.escalate.trigger}`] : [];
}

function ruleChanges(a: Rule, b: Rule): FieldChange[] {
  const fields: [FieldChange["field"], string[], string[]][] = [
    ["title", [a.title], [b.title]],
    ["when", a.when, b.when],
    ["then", a.then, b.then],
    ["why", [a.why], [b.why]],
    ["escalate", escalateLine(a), escalateLine(b)],
    ["evidence", a.evidence, b.evidence],
  ];
  return fields
    .map(([field, x, y]) => ({ field, ...lineDiff(x, y) }))
    .filter((c) => c.removed.length || c.added.length);
}

const approvalKey = (a: Approval) => JSON.stringify(a);

/** What changed between two versions of the same pill. */
export function diffPills(a: Pill, b: Pill): PillDiff {
  const aRules = new Map(a.rules.map((r) => [r.id, r]));
  const bRules = new Map(b.rules.map((r) => [r.id, r]));
  const aG = new Set(a.guardrails.map((g) => g.id));
  const bG = new Set(b.guardrails.map((g) => g.id));
  const aQ = new Set(a.open_questions.map((q) => q.id));
  const bQ = new Set(b.open_questions.map((q) => q.id));
  return {
    from: a.version,
    to: b.version,
    rulesAdded: b.rules.filter((r) => !aRules.has(r.id)),
    rulesRemoved: a.rules.filter((r) => !bRules.has(r.id)),
    rulesChanged: b.rules
      .filter((r) => aRules.has(r.id))
      .map((r) => ({ id: r.id, title: r.title, changes: ruleChanges(aRules.get(r.id)!, r) }))
      .filter((r) => r.changes.length),
    guardrailsAdded: b.guardrails.filter((g) => !aG.has(g.id)),
    guardrailsRemoved: a.guardrails.filter((g) => !bG.has(g.id)),
    questionsAdded: b.open_questions.filter((q) => !aQ.has(q.id)),
    questionsRemoved: a.open_questions.filter((q) => !bQ.has(q.id)),
    status: a.status === b.status ? null : { from: a.status, to: b.status },
    effectiveFrom: a.effective_from === b.effective_from ? null : { from: a.effective_from ?? null, to: b.effective_from ?? null },
    approvals:
      JSON.stringify(a.approvals.map(approvalKey)) === JSON.stringify(b.approvals.map(approvalKey)) ? null : { from: a.approvals, to: b.approvals },
  };
}

export function isEmptyDiff(d: PillDiff): boolean {
  return (
    !d.rulesAdded.length && !d.rulesRemoved.length && !d.rulesChanged.length &&
    !d.guardrailsAdded.length && !d.guardrailsRemoved.length &&
    !d.questionsAdded.length && !d.questionsRemoved.length &&
    !d.status && !d.effectiveFrom && !d.approvals
  );
}

/** The diff as Markdown; the CLI prints this and, with --md, writes it to a file. */
export function renderDiff(pillName: string, d: PillDiff): string {
  const out: string[] = [`# ${pillName}: ${d.from} → ${d.to}`, ""];
  if (isEmptyDiff(d)) return [...out, "No changes.", ""].join("\n");

  const summary = [
    `${d.rulesAdded.length} rule(s) added`,
    `${d.rulesChanged.length} changed`,
    `${d.rulesRemoved.length} removed`,
    `${d.guardrailsAdded.length} guardrail(s) added`,
    `${d.questionsAdded.length} open question(s) added`,
  ];
  out.push(summary.join(", ") + ".", "");

  if (d.status || d.effectiveFrom || d.approvals) {
    out.push("## Status and approvals", "");
    if (d.status) out.push(`- Status: ${d.status.from} → **${d.status.to}**`);
    if (d.effectiveFrom) out.push(`- Effective from: ${d.effectiveFrom.from ?? "not set"} → **${d.effectiveFrom.to ?? "not set"}**`);
    if (d.approvals) {
      const list = (v: string, xs: Approval[]) => (xs.length ? xs.map((x) => `- Approval of ${v}: ${approvalLine(x)}`) : [`- Approval of ${v}: none yet`]);
      out.push(...list(d.from, d.approvals.from), ...list(d.to, d.approvals.to));
    }
    out.push("");
  }

  if (d.rulesAdded.length) {
    out.push("## Rules added", "");
    for (const r of d.rulesAdded) {
      out.push(`### ${r.id}. ${r.title}`, "");
      out.push("**When**", "", ...r.when.map((w) => `- ${w}`), "");
      out.push("**Then**", "", ...r.then.map((t) => `- ${t}`), "");
      out.push("**Why**", "", r.why, "");
      if (r.escalate) out.push("**Escalate**", "", `To ${r.escalate.to}, when ${r.escalate.trigger}.`, "");
      out.push(`**Evidence:** ${r.evidence.map((e) => `\`${e}\``).join(", ")}`, "");
    }
  }

  if (d.rulesChanged.length) {
    out.push("## Rules changed", "");
    for (const r of d.rulesChanged) {
      out.push(`### ${r.id}. ${r.title}`, "");
      for (const c of r.changes) {
        out.push(`**${c.field}**`, "", "```diff", ...c.removed.map((l) => `- ${l}`), ...c.added.map((l) => `+ ${l}`), "```", "");
      }
    }
  }

  if (d.rulesRemoved.length) {
    out.push("## Rules removed", "", ...d.rulesRemoved.map((r) => `- ${r.id}. ${r.title}`), "");
  }

  if (d.guardrailsAdded.length) {
    out.push("## Guardrails added", "");
    for (const g of d.guardrailsAdded) out.push(`- **${g.id}.** ${g.text} (${g.evidence.map((e) => `\`${e}\``).join(", ")})`);
    out.push("");
  }
  if (d.guardrailsRemoved.length) out.push("## Guardrails removed", "", ...d.guardrailsRemoved.map((g) => `- **${g.id}.** ${g.text}`), "");

  if (d.questionsAdded.length) {
    out.push("## Open questions added", "");
    for (const q of d.questionsAdded) out.push(`- **${q.id}** (raised by ${q.raised_by}). ${q.question}`);
    out.push("");
  }
  if (d.questionsRemoved.length) out.push("## Open questions removed", "", ...d.questionsRemoved.map((q) => `- **${q.id}.** ${q.question}`), "");

  return out.join("\n");
}
