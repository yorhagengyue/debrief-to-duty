import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AuditEvent } from "./schema.ts";
import { ROOT, sha256 } from "./sources.ts";

/**
 * Append-only ledger. Each line carries the hash of the line before it, so editing or deleting any past event
 * breaks every hash after it and `verify()` says where.
 */
export class Ledger {
  constructor(readonly path = join(ROOT, "ledger", "audit.jsonl")) {}

  all(): AuditEvent[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => AuditEvent.parse(JSON.parse(l)));
  }

  append(e: Omit<AuditEvent, "seq" | "prev" | "hash">): AuditEvent {
    const events = this.all();
    const prev = events.at(-1)?.hash ?? "GENESIS";
    const seq = events.length + 1;
    const body = { seq, at: e.at, actor: e.actor, role: e.role, action: e.action, subject: e.subject, detail: e.detail, prev };
    const full = AuditEvent.parse({ ...body, hash: sha256(JSON.stringify(body)) });
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, JSON.stringify(full) + "\n", "utf8");
    return full;
  }

  verify(): { ok: true; events: number } | { ok: false; broken_at: number; reason: string } {
    let prev = "GENESIS";
    for (const e of this.all()) {
      const { hash, ...body } = e;
      if (body.prev !== prev) return { ok: false, broken_at: e.seq, reason: "prev hash does not match the event before" };
      if (sha256(JSON.stringify(body)) !== hash) return { ok: false, broken_at: e.seq, reason: "event content was changed" };
      prev = hash;
    }
    return { ok: true, events: this.all().length };
  }
}
