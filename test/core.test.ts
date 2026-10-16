import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ledger } from "../src/audit.ts";
import { unsupportedNumbers } from "../src/checks.ts";
import { bump, propose } from "../src/engine.ts";
import { TEMPLATE } from "../src/replay.ts";
import type { Change } from "../src/schema.ts";
import { splitSentences } from "../src/sources.ts";

describe("sentences", () => {
  it("keeps timeline lines whole and glues list numbers to their item", () => {
    const s = splitSentences("SRC", "30 August 2023 @ 08:43 UTC – 13 chillers failed to restart automatically\nThese include the following themes which we understand to be the biggest contributing factors to this incident: 1. A detailed forensic analysis of the impacted datacenter hardware and systems. 2. A review with every internal service.");
    expect(s[0].text).toBe("30 August 2023 @ 08:43 UTC – 13 chillers failed to restart automatically");
    expect(s.some((x) => x.text === "1.")).toBe(false);
    expect(s.map((x) => x.id)).toEqual(s.map((_, i) => `SRC:S${i + 1}`));
  });
});

describe("number check", () => {
  it("flags a threshold the source never states", () => {
    expect(unsupportedNumbers("Shed load when supply water exceeds 18 degrees", ["The chilled water loop had reached temperatures that were too high."])).toEqual(["18"]);
  });
  it("accepts numbers that appear in the cited sentence and ignores rule and sentence ids", () => {
    expect(unsupportedNumbers("Per R-003, at least four chillers; 13 failed (AZ-AUE-2023:S79)", ["13 chillers failed to restart automatically"])).toEqual([]);
  });
});

describe("ledger", () => {
  it("detects an edited past event", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-"));
    const l = new Ledger(join(dir, "audit.jsonl"));
    const base = { at: "2018-10-04T08:42:00.000Z", actor: "a", role: "Approver", subject: "dc-cooling-loss@1.0.0", detail: {} };
    l.append({ ...base, action: "propose" });
    l.append({ ...base, action: "release" });
    l.append({ ...base, action: "triage" });
    expect(l.verify()).toEqual({ ok: true, events: 3 });
    const lines = readFileSync(l.path, "utf8").split("\n");
    lines[1] = lines[1].replace('"release"', '"reject"');
    writeFileSync(l.path, lines.join("\n"));
    expect(l.verify()).toMatchObject({ ok: false, broken_at: 2 });
  });
});

describe("versions", () => {
  const rule: Change = { op: "add_rule", title: "t", when: ["w"], then: ["x"], why: "y", evidence: ["SRC:S1"] };
  it("starts at 1.0.0, adds a minor for new rules and a patch for questions only", () => {
    expect(bump(null, [rule])).toBe("1.0.0");
    expect(bump("1.2.0", [rule])).toBe("1.3.0");
    expect(bump("1.2.0", [{ op: "ask_expert", question: "q", why: "w" }])).toBe("1.2.1");
  });
  it("keeps every earlier rule and records where each new one came from", () => {
    const v1 = propose(null, TEMPLATE, [rule], "CASE-A");
    const v2 = propose({ ...v1, status: "released" }, TEMPLATE, [{ ...rule, title: "second" }, { op: "amend_rule", rule_id: "R-001", add_when: [], add_then: ["more"], why: "z", evidence: ["SRC:S2"] }], "CASE-B");
    expect(v2.version).toBe("1.1.0");
    expect(v2.status).toBe("proposed");
    expect(v2.rules.map((r) => r.id)).toEqual(["R-001", "R-002"]);
    expect(v2.rules[0].learned_from).toEqual(["CASE-A", "CASE-B"]);
    expect(v2.rules[0].evidence).toEqual(["SRC:S1", "SRC:S2"]);
    expect(v2.regression_cases).toEqual(["CASE-A", "CASE-B"]);
    expect(v2.supersedes).toBe("1.0.0");
  });
});

describe("access", () => {
  const policy = {
    roles: { Capture: ["propose"], Approver: ["approve", "reject", "rollback", "preview"], Duty: ["triage"] },
    people: [
      { name: "capture", roles: ["Capture"] },
      { name: "Ana", roles: ["Approver"] },
      { name: "Duty", roles: ["Duty"] },
    ],
    policy: { separation_of_duties: true, flag_secondary_evidence: true },
  } as const;
  it("lets an approver approve and refuses everyone else", async () => {
    const { authorize, AccessDenied } = await import("../src/access.ts");
    expect(authorize(policy as never, "Ana", "approve")).toEqual(["Approver"]);
    expect(() => authorize(policy as never, "Duty", "approve")).toThrow(AccessDenied);
    expect(() => authorize(policy as never, "Mallory", "approve")).toThrow(/not in governance/);
  });
  it("refuses a decision by the person who proposed the version", async () => {
    const { authorize } = await import("../src/access.ts");
    const dir = mkdtempSync(join(tmpdir(), "ledger-"));
    const l = new Ledger(join(dir, "audit.jsonl"));
    l.append({ at: "2020-01-01T00:00:00.000Z", actor: "Ana", role: "Approver", action: "propose", subject: "p@1.1.0", detail: {} });
    expect(() => authorize(policy as never, "Ana", "approve", "p@1.1.0", l)).toThrow(/may not also decide/);
    expect(authorize(policy as never, "Ana", "approve", "p@1.2.0", l)).toEqual(["Approver"]);
  });
});
