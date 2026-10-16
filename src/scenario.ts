import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { authorize, loadPolicy } from "./access.ts";
import { Ledger } from "./audit.ts";
import { ask, triage } from "./engine.ts";
import { LLM } from "./llm.ts";
import { PILL_ID } from "./replay.ts";
import { ROOT, sha256 } from "./sources.ts";
import { loadPills, paths, writeJSONFile } from "./store.ts";

/** A new situation in the shape a live alarm feed would deliver: free-text observations with minutes since the first one. */
export const Scenario = z.object({
  id: z.string().regex(/^[A-Z0-9-]+$/),
  title: z.string(),
  synthetic: z.boolean(),
  at: z.iso.datetime(),
  site: z.string(),
  signals: z.array(z.object({ t_plus_min: z.number().int().min(0), text: z.string() })).min(1),
  asks: z.array(z.string()).default([]),
});

export function loadScenario(id: string) {
  return Scenario.parse(YAML.parse(readFileSync(join(ROOT, "scenarios", `${id}.yaml`), "utf8")));
}

/** Duty teams and managers get the released version. A proposed version can be previewed only by a role allowed to. */
function pick(version?: string, as?: string) {
  const all = loadPills(PILL_ID);
  const p = version ? all.find((x) => x.version === version) : all.filter((x) => x.status === "released").at(-1);
  if (!p) throw new Error(`no ${version ? `version ${version}` : "released version"} of ${PILL_ID}`);
  if (p.status === "proposed") authorize(loadPolicy(), as ?? "anonymous", "preview");
  else if (p.status !== "released" && p.status !== "superseded") throw new Error(`${PILL_ID}@${p.version} is ${p.status}`);
  return p;
}

export async function runScenario(id: string, version?: string, as?: string) {
  const s = loadScenario(id);
  const pill = pick(version, as);
  const idx = new Map(s.signals.map((x, i) => [`${s.id}:S${i + 1}`, x.text]));
  const observed = { id: s.id, site: s.site, early_signals: s.signals.map((x, i) => ({ t_plus_min: x.t_plus_min, sentence: `${s.id}:S${i + 1}` })) };
  const llm = new LLM();
  const t = await triage(llm, observed, idx, pill);
  const out = { scenario: s, signals: Object.fromEntries(idx), pill_version: pill.version, pill_status: pill.status, triage: t.result, removed_by_checks: t.removed, llm: t.llm };
  // The default model's run is the main result; a run on another vendor is kept beside it as a portability check.
  const suffix = llm.provider.name === "deepseek" ? "" : `.${llm.provider.name}`;
  writeJSONFile(join(paths.runs, "scenarios", `${s.id}@${pill.version}${suffix}.json`), out);
  new Ledger().append({ at: new Date().toISOString(), actor: "duty assistant", role: "Triage", action: "triage", subject: s.id, detail: { pill: `${PILL_ID}@${pill.version}`, synthetic: s.synthetic, classification: t.result.classification } });
  return out;
}

export async function runAsk(question: string, version?: string, as?: string) {
  const pill = pick(version, as);
  const r = await ask(new LLM(), pill, question);
  writeJSONFile(join(paths.runs, "asks", `${pill.version}-${sha256(question).slice(0, 10)}.json`), r);
  return r;
}
