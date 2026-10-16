import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { Case, Change, Evaluation, Pill, TriageResult } from "./schema.ts";
import { ROOT } from "./sources.ts";

// The file formats are the product. Publishing them as JSON Schema lets any system, in any language, read and
// validate a pill without this code.
const out = join(ROOT, "spec");
mkdirSync(out, { recursive: true });
for (const [name, schema] of Object.entries({ pill: Pill, case: Case, change: Change, triage: TriageResult, evaluation: Evaluation })) {
  const js = z.toJSONSchema(schema, { io: "input" });
  writeFileSync(join(out, `${name}.schema.json`), JSON.stringify({ $id: `https://github.com/yorhagengyue/debrief-to-duty/blob/main/spec/${name}.schema.json`, ...js }, null, 2) + "\n");
  console.log(`spec/${name}.schema.json`);
}
