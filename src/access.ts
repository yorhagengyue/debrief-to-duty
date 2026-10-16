import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { Ledger } from "./audit.ts";
import { ROOT } from "./sources.ts";

export const Action = z.enum(["propose", "approve", "reject", "rollback", "preview", "triage", "ask"]);
export type Action = z.infer<typeof Action>;

export const AccessPolicy = z.object({
  roles: z.record(z.string(), z.array(Action)),
  people: z.array(z.object({ name: z.string(), roles: z.array(z.string()) })),
  policy: z.object({ separation_of_duties: z.boolean(), flag_secondary_evidence: z.boolean() }),
});
export type AccessPolicy = z.infer<typeof AccessPolicy>;

export function loadPolicy(path = join(ROOT, "governance", "access.yaml")): AccessPolicy {
  return AccessPolicy.parse(YAML.parse(readFileSync(path, "utf8")));
}

export class AccessDenied extends Error {}

/** Throws unless `person` holds a role that allows `action`, and (for decisions) is not the proposer of `subject`. */
export function authorize(policy: AccessPolicy, person: string, action: Action, subject?: string, ledger?: Ledger): string[] {
  const who = policy.people.find((p) => p.name === person);
  if (!who) throw new AccessDenied(`${person} is not in governance/access.yaml`);
  const allowed = who.roles.filter((r) => policy.roles[r]?.includes(action));
  if (!allowed.length) throw new AccessDenied(`${person} (${who.roles.join(", ")}) may not ${action}`);
  if (policy.policy.separation_of_duties && subject && ledger && (action === "approve" || action === "reject")) {
    const proposer = ledger.all().find((e) => e.action === "propose" && e.subject === subject)?.actor;
    if (proposer === person) throw new AccessDenied(`${person} proposed ${subject} and may not also decide it`);
  }
  return allowed;
}
