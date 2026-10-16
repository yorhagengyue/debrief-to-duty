import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";
import { Case, Pill } from "./schema.ts";
import { ROOT } from "./sources.ts";

export const paths = {
  cases: join(ROOT, "cases"),
  pills: join(ROOT, "pills"),
  proposals: join(ROOT, "proposals"),
  runs: join(ROOT, "runs"),
};

export function loadCase(id: string): Case {
  return Case.parse(YAML.parse(readFileSync(join(paths.cases, `${id}.yaml`), "utf8")));
}

export function loadCases(): Case[] {
  return readdirSync(paths.cases)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => loadCase(f.replace(/\.yaml$/, "")))
    .sort((a, b) => a.t0.localeCompare(b.t0));
}

export function pillPath(id: string, version: string): string {
  return join(paths.pills, id, `${version}.yaml`);
}

export function savePill(p: Pill): void {
  const f = pillPath(p.id, p.version);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, YAML.stringify(Pill.parse(p), { lineWidth: 0 }), "utf8");
}

export function loadPills(id: string): Pill[] {
  const dir = join(paths.pills, id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => Pill.parse(YAML.parse(readFileSync(join(dir, f), "utf8"))))
    .sort((a, b) => cmpSemver(a.version, b.version));
}

/** The version that was answering triage requests at time `at`: the newest released one whose effective_from has passed. */
export function pillInForce(id: string, at: string): Pill | null {
  const live = loadPills(id).filter((p) => (p.status === "released" || p.status === "superseded") && p.effective_from && p.effective_from <= at);
  return live.at(-1) ?? null;
}

export function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

export function writeYAML(path: string, v: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, YAML.stringify(v, { lineWidth: 0 }), "utf8");
}

export function writeJSONFile(path: string, v: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(v, null, 2) + "\n", "utf8");
}
