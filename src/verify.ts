import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { loadPolicy } from "./access.ts";
import { Ledger } from "./audit.ts";
import { unsupportedNumbers } from "./checks.ts";
import { extractSection, hasCache, loadSources, ROOT, sentenceIndex, sha256 } from "./sources.ts";
import { writeJSONFile } from "./store.ts";
import { loadCases, loadPills } from "./store.ts";

/**
 * Everything a reviewer would want checked before trusting the repository, in one command:
 * sources unchanged, every case and pill citation real, every excerpt verbatim, every number sourced, ledger intact.
 */
export function verify(opts: { record?: boolean } = {}): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  const fail = (m: string) => {
    ok = false;
    lines.push(`FAIL ${m}`);
  };

  const srcFile = join(ROOT, "sources", "sources.yaml");
  const raw = YAML.parse(readFileSync(srcFile, "utf8")) as Record<string, unknown>[];
  for (const s of loadSources()) {
    if (!hasCache(s)) {
      lines.push(`${s.id}: page not cached here; using the committed excerpts`);
      continue;
    }
    const text = extractSection(readFileSync(join(ROOT, "sources", "cache", `${s.id}.txt`), "utf8"), s);
    const h = sha256(text);
    if (!s.sha256 && opts.record) {
      const r = raw.find((x) => x.id === s.id)!;
      r.sha256 = h;
      lines.push(`recorded sha256 for ${s.id}`);
    } else if (s.sha256 && s.sha256 !== h) fail(`${s.id}: source text differs from the recorded sha256`);
  }
  if (opts.record) writeFileSync(srcFile, YAML.stringify(raw, { lineWidth: 0 }), "utf8");

  const idx = sentenceIndex();
  const cases = loadCases();
  const used = new Set(cases.flatMap((k) => [...k.early_signals.map((s) => s.sentence), ...k.debrief, ...k.findings.map((f) => f.sentence)]));
  const excerptsPath = join(ROOT, "sources", "excerpts.json");
  if (opts.record) {
    writeJSONFile(excerptsPath, Object.fromEntries([...used].sort().map((id) => [id, idx.get(id)])));
    lines.push(`wrote sources/excerpts.json (${used.size} sentences used by the cases)`);
  } else {
    try {
      const ex = JSON.parse(readFileSync(excerptsPath, "utf8")) as Record<string, string>;
      for (const id of used) if (ex[id] !== idx.get(id)) fail(`excerpts.json disagrees with the source text for ${id}`);
    } catch {
      fail("sources/excerpts.json missing; run `pills verify --record` with the page cache present");
    }
  }
  for (const k of cases) {
    const ids = [...k.early_signals.map((s) => s.sentence), ...k.debrief, ...k.findings.map((f) => f.sentence)];
    for (const id of ids) if (!idx.has(id)) fail(`${k.id}: cites ${id}, which does not exist`);
    for (const s of k.early_signals) if (s.excerpt && !(idx.get(s.sentence) ?? "").includes(s.excerpt)) fail(`${k.id}: excerpt is not verbatim from ${s.sentence}`);
    const debrief = new Set(k.debrief);
    for (const f of k.findings) if (!debrief.has(f.sentence) && !k.early_signals.some((s) => s.sentence === f.sentence)) lines.push(`note ${k.id}: finding ${f.id} sentence is outside the debrief (graded but not shown to capture)`);
  }
  lines.push(`cases: ${cases.length} checked`);

  const policy = loadPolicy();
  const secondary = new Set(loadSources().filter((s) => s.kind === "secondary").map((s) => s.id));
  const versions = loadPills("dc-cooling-loss");
  for (const p of versions) {
    for (const r of p.rules) {
      if (policy.policy.flag_secondary_evidence && r.evidence.every((e) => secondary.has(e.split(":")[0])) && p.version === versions.at(-1)?.version) {
        lines.push(`flag ${p.version} ${r.id}: rests only on a secondary source (${[...new Set(r.evidence.map((e) => e.split(":")[0]))].join(", ")}); the approver should know`);
      }
      for (const e of r.evidence) if (!idx.has(e)) fail(`${p.version} ${r.id}: evidence ${e} does not exist`);
      const nums = unsupportedNumbers(JSON.stringify({ when: r.when, then: r.then, why: r.why, escalate: r.escalate }), r.evidence.map((e) => idx.get(e) ?? ""));
      if (nums.length) fail(`${p.version} ${r.id}: numbers not in its evidence: ${nums.join(", ")}`);
    }
    for (const g of p.guardrails) for (const e of g.evidence) if (!idx.has(e)) fail(`${p.version} ${g.id}: evidence ${e} does not exist`);
    lines.push(`pill ${p.version} (${p.status}): ${p.rules.length} rules, ${p.guardrails.length} guardrails, ${p.open_questions.length} open questions`);
  }

  const l = new Ledger().verify();
  if (l.ok) lines.push(`ledger: ${l.events} events, hash chain intact`);
  else fail(`ledger broken at event ${l.broken_at}: ${l.reason}`);
  return { ok, lines };
}
