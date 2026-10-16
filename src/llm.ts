import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, sha256 } from "./sources.ts";

/**
 * The only door to a language model. Pills, cases and the ledger never depend on which vendor sits behind it.
 * Every call is recorded under fixtures/llm/, keyed by the exact request, so tests, regression runs and the
 * static viewer replay without a key; a live run re-uses a recording only when the request is byte-identical.
 */
export interface ChatRequest {
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}

interface Provider {
  name: string;
  model: string;
  base: string;
  keyEnv: string;
  extra?: Record<string, unknown>;
}

export const PROVIDERS: Record<string, Provider> = {
  // Tencent Cloud Hunyuan through TokenHub (international endpoint).
  hunyuan: { name: "hunyuan", model: "hy3", base: "https://tokenhub-intl.tencentcloudmaas.com/v1", keyEnv: "HUNYUAN_API_KEY", extra: { thinking: { type: "disabled" } } },
  // Second vendor, to show a pill is not tied to one model.
  deepseek: { name: "deepseek", model: "deepseek-chat", base: "https://api.deepseek.com/v1", keyEnv: "DEEPSEEK_API_KEY" },
};

export type Mode = "auto" | "replay" | "live";

function env(): Record<string, string> {
  const p = join(ROOT, ".env");
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (existsSync(p)) {
    for (const l of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

export class LLM {
  readonly provider: Provider;
  constructor(providerName = process.env.PILLS_PROVIDER ?? "deepseek", readonly mode: Mode = (process.env.PILLS_LLM_MODE as Mode) ?? "auto") {
    const p = PROVIDERS[providerName];
    if (!p) throw new Error(`unknown provider ${providerName}`);
    this.provider = p;
  }

  private fixturePath(key: string): string {
    return join(ROOT, "fixtures", "llm", this.provider.name, `${key}.json`);
  }

  async json<T = unknown>(req: ChatRequest, tag: string, valid: (d: T) => boolean = () => true): Promise<{ data: T; key: string; replayed: boolean }> {
    const body = {
      model: this.provider.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      temperature: req.temperature ?? 0,
      max_tokens: req.max_tokens ?? 4000,
      response_format: { type: "json_object" },
      ...(this.provider.extra ?? {}),
    };
    const key = sha256(JSON.stringify(body)).slice(0, 24);
    const fx = this.fixturePath(key);
    if (this.mode !== "live" && existsSync(fx)) {
      const rec = JSON.parse(readFileSync(fx, "utf8"));
      return { data: JSON.parse(rec.response) as T, key, replayed: true };
    }
    if (this.mode === "replay") throw new Error(`no recording for ${tag} (${key}); run with PILLS_LLM_MODE=auto and a key`);
    const apiKey = env()[this.provider.keyEnv];
    if (!apiKey) throw new Error(`${this.provider.keyEnv} missing in .env`);
    let lastErr = "";
    for (let attempt = 1; attempt <= 4; attempt++) {
      // A retry is asked at a slightly higher temperature: some models fail the same way every time at 0.
      const sent = attempt === 1 ? body : { ...body, temperature: Math.min(1, body.temperature + 0.3 * (attempt - 1)) };
      const r = await fetch(`${this.provider.base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(sent),
      });
      if (!r.ok) {
        lastErr = `HTTP ${r.status} ${(await r.text()).slice(0, 200)}`;
        continue;
      }
      const d = (await r.json()) as { choices?: { message?: { content?: string } }[]; usage?: unknown };
      const content = d.choices?.[0]?.message?.content ?? "";
      try {
        if (content.includes("</think")) throw new Error("reasoning text leaked into the answer");
        const data = JSON.parse(content) as T;
        if (!valid(data)) throw new Error("answer is JSON but not in the requested shape");
        mkdirSync(join(ROOT, "fixtures", "llm", this.provider.name), { recursive: true });
        writeFileSync(
          fx,
          JSON.stringify({ tag, provider: this.provider.name, model: this.provider.model, at: new Date().toISOString(), attempt, request: sent, response: content, usage: d.usage }, null, 2),
          "utf8",
        );
        return { data, key, replayed: false };
      } catch (err) {
        lastErr = `unusable answer (${(err as Error).message}): ${content.slice(0, 120)}`;
      }
    }
    throw new Error(`${tag}: ${lastErr}`);
  }
}
