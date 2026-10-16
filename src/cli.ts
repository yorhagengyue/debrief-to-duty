import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Ledger } from "./audit.ts";
import { diffPills, renderCard, renderDiff } from "./card.ts";
import { ROOT, sentenceIndex } from "./sources.ts";
import { decide, rollback } from "./engine.ts";
import { loadPills } from "./store.ts";
import { PILL_ID, replay } from "./replay.ts";
import { verify } from "./verify.ts";
import { loadScenario, runAsk, runScenario } from "./scenario.ts";

const [cmd, ...args] = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  switch (cmd) {
    case "replay": {
      const runs = await replay({ until: opt("until"), fresh: flag("fresh"), approveLast: flag("approve-last") });
      console.table(runs);
      break;
    }
    case "verify": {
      const r = verify({ record: flag("record") });
      for (const l of r.lines) console.log(l);
      console.log(r.ok ? "OK" : "FAILED");
      if (!r.ok) process.exitCode = 1;
      break;
    }
    case "approve":
    case "reject": {
      const version = args[0];
      const p = loadPills(PILL_ID).find((x) => x.version === version);
      if (!p) throw new Error(`no version ${version}`);
      const by = opt("by");
      if (!by) throw new Error("--by <name> is required: a decision always has a person behind it");
      const at = opt("at") ?? new Date().toISOString();
      const out = decide(p, { by, role: opt("role") ?? "Approver", role_played: flag("role-played"), at, decision: cmd, note: opt("note") ?? "", effective_from: opt("effective") ?? at }, new Ledger());
      console.log(`${PILL_ID}@${out.version} is now ${out.status}`);
      break;
    }
    case "rollback": {
      const by = opt("by");
      if (!by) throw new Error("--by <name> is required");
      const at = opt("at") ?? new Date().toISOString();
      const out = rollback(PILL_ID, args[0], { by, role: opt("role") ?? "Approver", role_played: flag("role-played"), at, note: opt("note") ?? "" }, new Ledger());
      console.log(`${PILL_ID}@${out.version} released with the content of ${args[0]}`);
      break;
    }
    case "scenario": {
      const r = await runScenario(args[0], opt("version"), opt("as"));
      console.log(`${r.scenario.id} with v${r.pill_version} (${r.pill_status}): ${r.triage.classification}`);
      for (const a of r.triage.next_actions) console.log(`  ${a.rule_id}  ${a.action}`);
      console.log(`  escalate: ${r.triage.escalate.to} - ${r.triage.escalate.reason}`);
      break;
    }
    case "ask": {
      const questions = opt("scenario") ? loadScenario(opt("scenario")!).asks : [args[0]];
      const rs = await Promise.all(questions.map((q) => runAsk(q, opt("version"), opt("as"))));
      for (const r of rs) console.log(`
Q (v${r.pill_version}): ${r.question}
A: ${r.answer}
   relies on ${r.relies_on.join(", ") || "-"}${r.not_in_pill ? `
   not in pill: ${r.not_in_pill}` : ""}`);
      break;
    }
    case "ledger": {
      console.log(new Ledger().verify());
      break;
    }
    case "card": {
      const p = loadPills(PILL_ID).find((x) => x.version === args[0]);
      if (!p) throw new Error(`no version ${args[0]}`);
      const f = join(ROOT, "docs", "cards", `${PILL_ID}-${p.version}.md`);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, renderCard(p, sentenceIndex()), "utf8");
      console.log(`wrote ${relative(ROOT, f)}`);
      break;
    }
    case "diff": {
      const pills = loadPills(PILL_ID);
      const [a, b] = [args[0], args[1]].map((v) => {
        const p = pills.find((x) => x.version === v);
        if (!p) throw new Error(`no version ${v}`);
        return p;
      });
      const md = renderDiff(b.name, diffPills(a, b));
      console.log(md);
      if (flag("md")) {
        const f = join(ROOT, "docs", "cards", `diff-${a.version}-${b.version}.md`);
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(f, md, "utf8");
        console.log(`wrote ${relative(ROOT, f)}`);
      }
      break;
    }
    default:
      console.log(["usage:", "  pills replay [--fresh] [--until CASE] [--approve-last]", "  pills approve|reject <version> --by <name> [--role R] [--role-played] [--note text] [--at ISO] [--effective ISO]", "  pills rollback <to-version> --by <name> [--note text]", "  pills verify [--record]", "  pills ledger", "  pills card <version>", "  pills diff <from> <to> [--md]"].join("\n"));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
