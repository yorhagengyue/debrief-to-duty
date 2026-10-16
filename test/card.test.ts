import { describe, expect, it } from "vitest";
import { diffPills, isEmptyDiff, renderCard, renderDiff } from "../src/card.ts";
import { propose } from "../src/engine.ts";
import { TEMPLATE } from "../src/replay.ts";
import type { Change } from "../src/schema.ts";

const rule: Change = { op: "add_rule", title: "First rule", when: ["w1"], then: ["t1"], why: "y1", escalate: { to: "lead", trigger: "now" }, evidence: ["SRC:S1"] };
const v1 = { ...propose(null, TEMPLATE, [rule], "CASE-A"), status: "released" as const };
const idx = new Map([["SRC:S1", "The chiller stopped."], ["SRC:S2", "The loop got too hot."]]);

describe("card", () => {
  it("shows each rule with its quoted evidence", () => {
    const md = renderCard(v1, idx);
    expect(md).toContain("### R-001. First rule");
    expect(md).toContain("To lead, when now.");
    expect(md).toContain("> The chiller stopped.");
    expect(md).toContain("None yet.");
  });
});

describe("diff", () => {
  it("reports nothing when the versions match", () => {
    const d = diffPills(v1, v1);
    expect(isEmptyDiff(d)).toBe(true);
    expect(renderDiff(v1.name, d)).toContain("No changes.");
  });

  it("reports a rule added", () => {
    const v2 = propose(v1, TEMPLATE, [{ ...rule, title: "Second rule", evidence: ["SRC:S2"] }], "CASE-B");
    const d = diffPills(v1, v2);
    expect(d.rulesAdded.map((r) => r.id)).toEqual(["R-002"]);
    expect(d.rulesChanged).toEqual([]);
    expect(d.status).toEqual({ from: "released", to: "proposed" });
    expect(renderDiff(v2.name, d)).toContain("### R-002. Second rule");
  });

  it("reports a rule amended with old and new lines", () => {
    const v2 = propose(v1, TEMPLATE, [{ op: "amend_rule", rule_id: "R-001", add_when: [], add_then: ["t2"], why: "y2", evidence: ["SRC:S2"] }], "CASE-B");
    const d = diffPills(v1, v2);
    expect(d.rulesAdded).toEqual([]);
    expect(d.rulesChanged).toHaveLength(1);
    const byField = Object.fromEntries(d.rulesChanged[0].changes.map((c) => [c.field, c]));
    expect(byField.then).toEqual({ field: "then", removed: [], added: ["t2"] });
    expect(byField.evidence.added).toEqual(["SRC:S2"]);
    expect(byField.why.removed).toEqual(["y1"]);
    const md = renderDiff(v2.name, d);
    expect(md).toContain("+ t2");
    expect(md).toContain("- y1");
  });

  it("lists each version's own approvals instead of calling the older one removed", () => {
    const at = "2020-01-01T00:00:00.000Z";
    const a = { ...v1, approvals: [{ by: "Ana", role: "Approver", role_played: true, at, decision: "approve" as const, note: "first" }] };
    const b = { ...propose(a, TEMPLATE, [{ ...rule, title: "Second rule" }], "CASE-B"), status: "released" as const, approvals: [{ by: "Ben", role: "Approver", role_played: true, at, decision: "approve" as const, note: "second" }] };
    const md = renderDiff(b.name, diffPills(a, b));
    expect(md).toContain(`Approval of ${a.version}:`);
    expect(md).toContain(`Approval of ${b.version}:`);
    expect(md).not.toContain("removed:");
  });
});
