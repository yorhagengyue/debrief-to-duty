/* Static viewer for the replay. Reads window.PILL_DATA (web/data.js, written by `npm run site`). No build step. */
(function () {
  const D = window.PILL_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const srcById = Object.fromEntries(D.sources.map((s) => [s.id, s]));
  const pct = (x) => `${Math.round((x ?? 0) * 100)}%`;
  const day = (iso) => iso.slice(0, 10);
  const pillByVersion = Object.fromEntries(D.pills.map((p) => [p.version, p]));

  // ---------------------------------------------------------- citations: hover shows the sentence and where it is from
  const cite = (id) => `<span class="cite" data-cite="${esc(id)}">${esc(id.split(":")[1])}</span>`;
  const cites = (ids) => (ids ?? []).map(cite).join(" ");
  const tip = $("#tip");
  document.addEventListener("mouseover", (e) => {
    const c = e.target.closest("[data-cite]");
    if (!c) return;
    const id = c.dataset.cite;
    const src = srcById[id.split(":")[0]];
    tip.innerHTML = `${esc(D.sentences[id] ?? "(sentence not exported)")}<small>${esc(id)} · ${esc(src?.publisher ?? "")}${src?.kind === "secondary" ? " · secondary source" : ""}</small>`;
    tip.hidden = false;
    const r = c.getBoundingClientRect();
    tip.style.left = `${Math.min(r.left, window.innerWidth - 480)}px`;
    tip.style.top = `${r.bottom + 6}px`;
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("[data-cite]")) tip.hidden = true;
  });
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cite]");
    if (!c) return;
    const src = srcById[c.dataset.cite.split(":")[0]];
    if (src) window.open(src.read_from ?? src.url, "_blank", "noopener");
  });

  // ---------------------------------------------------------- tabs
  const tabs = ["replay", "apply", "pill", "ledger", "sources"];
  function show(tab) {
    if (!tabs.includes(tab)) tab = "replay";
    for (const t of tabs) {
      $(`#tab-${t}`).hidden = t !== tab;
      document.querySelector(`[data-tab="${t}"]`).classList.toggle("on", t === tab);
    }
  }
  window.addEventListener("hashchange", () => show(location.hash.slice(1).split("/")[0]));

  // ---------------------------------------------------------- replay
  const T = D.timeline;
  const released = D.pills.filter((p) => p.status !== "proposed" && p.status !== "rejected");
  const latest = D.pills.at(-1);

  function kpis() {
    const blind = T.filter((t) => t.pill_in_force).map((t) => t.evaluation.score);
    const learned = latest.rules.length;
    return `<div class="kpis">
      <div class="panel kpi"><b>${T.length}</b><span>public incident reviews, ${T[0].case.t0.slice(0, 4)}–${T.at(-1).case.t0.slice(0, 4)}, four operators</span></div>
      <div class="panel kpi"><b>${learned} rules</b><span>${latest.guardrails.length} guardrails · ${latest.open_questions.length} questions left for an expert</span></div>
      <div class="panel kpi"><b>${D.pills.length} versions</b><span>each released only after an approval step; in the replay these were automatic, v1.5.0 awaits a person</span></div>
      <div class="panel kpi"><b>${Object.keys(D.sentences).length} sentences</b><span>every rule points at the review sentence it came from</span></div>
    </div>`;
  }

  function row(t, i) {
    const k = t.case;
    const e = t.evaluation;
    const added = t.proposal ? t.proposal.accepted.filter((c) => c.op === "add_rule").length : 0;
    return `<button class="tl-row" data-i="${i}">
      <span class="date">${day(k.t0)}</span>
      <span><span class="ttl">${esc(k.title)}</span><br><span class="op">${esc(k.operator)}</span></span>
      <span class="ver">${t.pill_in_force ? "v" + t.pill_in_force : "none yet"}</span>
      <span><span class="chip ${t.triage.classification}">${t.triage.classification.replace("_", " ")}</span></span>
      <span><div class="bar"><i style="width:${pct(e.score)}"></i></div><span class="small">${pct(e.score)} of the review's findings</span></span>
      <span class="small">${t.proposal ? `→ <b class="ver">v${t.proposal.version}</b> ${t.proposal.status === "proposed" ? "<span class='chip partly'>awaiting approval</span>" : ""}<br>+${added} rules, ${t.proposal.rejected_by_checks.length} blocked by checks` : ""}</span>
    </button>`;
  }

  function detail(t) {
    const k = t.case;
    const tr = t.triage;
    const ev = Object.fromEntries(t.evaluation.per_finding.map((p) => [p.finding, p]));
    const signals = k.early_signals
      .map((s) => `<li><span class="tplus">t+${s.t_plus_min}m</span>${esc(s.text)} ${cite(s.sentence)}${s.excerpt ? ` <span class="chip ghost" title="Only this part of the sentence was shown to triage">excerpt</span>` : ""}</li>`)
      .join("");
    const matched = tr.matched_rules.map((m) => `<li><span class="rid">${m.rule_id}</span> ${esc(m.because)}</li>`).join("") || "<li class='note'>No rule applied.</li>";
    const actions = tr.next_actions.map((a) => `<li><span class="rid">${a.rule_id}</span> ${esc(a.action)}</li>`).join("") || "<li class='note'>No actions: nothing in the pill covers this yet.</li>";
    const notCovered = tr.not_covered.length ? `<h3 style="margin-top:12px">Not covered by the pill</h3><ul class="clean">${tr.not_covered.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : "";
    const removed = (tr.removed_by_checks ?? []).length ? `<div class="removed">Removed by checks: ${tr.removed_by_checks.map(esc).join("; ")}</div>` : "";
    const findings = k.findings
      .map((f) => {
        const g = ev[f.id] ?? { anticipated: "no", by: [], note: "" };
        return `<li class="${g.anticipated}"><span class="kind">${f.kind.replace("_", " ")}</span> <span class="chip ${g.anticipated}">${g.anticipated}</span>${g.by.length ? " " + g.by.map((b) => `<span class="rid">${esc(b)}</span>`).join(" ") : ""}<br>${esc(f.text)} ${cite(f.sentence)}<div class="note">${esc(g.note)}</div></li>`;
      })
      .join("");

    let learned = "";
    if (t.proposal) {
      const P = t.proposal;
      const ch = P.accepted
        .map((c) => {
          if (c.op === "add_rule") return `<li><span class="chip">new rule</span> <b>${esc(c.title)}</b> ${cites(c.evidence)}</li>`;
          if (c.op === "amend_rule") return `<li><span class="chip">amends ${esc(c.rule_id)}</span> ${esc(c.why)} ${cites(c.evidence)}</li>`;
          if (c.op === "add_guardrail") return `<li><span class="chip">guardrail</span> ${esc(c.text)} ${cites(c.evidence)}</li>`;
          return `<li><span class="chip ghost">question for an expert</span> ${esc(c.question)}</li>`;
        })
        .join("");
      const rej = P.rejected_by_checks.length
        ? `<h3 style="margin-top:14px">Blocked before review</h3><ul class="clean">${P.rejected_by_checks.map((r) => `<li class="no">${esc(r.change.title ?? r.change.text ?? r.change.question ?? r.change.op)}<div class="note">${r.reasons.map(esc).join("; ")}</div></li>`).join("")}</ul>`
        : `<p class="note" style="margin-top:12px">No proposed change was blocked by the checks (citation must exist, numbers must be in the cited sentence, amended rule must exist).</p>`;
      const gate = (t.gate ?? [])
        .map((g) => `<tr><td class="mono">${esc(g.case_id)}</td><td>${pct(g.blind)} <span class="small mono">${g.blind_version ? "v" + g.blind_version : "none"}</span></td><td>${pct(g.base)} <span class="small mono">${g.base_version ? "v" + g.base_version : "none"}</span></td><td>${pct(g.candidate)}</td><td>${g.regressed ? "<span class='bad'>flagged</span>" : "<span class='ok'>held</span>"}</td></tr>`)
        .join("");
      const pv = pillByVersion[P.version];
      const appr = pv?.approvals?.length
        ? pv.approvals.map((a) => `${esc(a.decision)} by ${esc(a.by)} on ${day(a.at)}${a.role_played ? " (role-played)" : ""}: ${esc(a.note)}`).join("<br>")
        : `<span class="chip partly">awaiting a person's decision</span> Run <code>npm run pills -- approve ${esc(P.version)}</code> or reject it.`;
      learned = `<h2>What this incident taught the pill → v${esc(P.version)}</h2>
      <div class="cols2">
        <div class="panel"><h3>Proposed changes (each cites the review)</h3><ul class="clean">${ch}</ul>${rej}</div>
        <div class="panel"><h3>Regression gate before approval</h3>
          <p class="note">Every earlier incident is triaged again with the proposed version and compared with the version released now. A drop of more than one finding's worth is flagged to the approver, who decides with it in view.</p>
          <table><thead><tr><th>Incident</th><th>Blind, at the time</th><th>Released now</th><th>Proposed v${esc(P.version)}</th><th></th></tr></thead><tbody>${gate}</tbody></table>
          <h3 style="margin-top:14px">Decision</h3><p class="small">${appr}</p>
        </div>
      </div>`;
    }

    return `<h2>${esc(k.title)}</h2>
    <p class="lead">${esc(k.site)} · ${esc(k.operator)} · source: ${k.sources.map((s) => `<a href="${esc(srcById[s].url)}" target="_blank" rel="noopener">${esc(srcById[s].publisher)}${srcById[s].kind === "secondary" ? " (secondary)" : ""}</a>`).join(", ")}</p>
    <div class="grid3">
      <div class="panel"><h3>1 · What the team knew in the first hour</h3><ul class="clean">${signals}</ul><p class="note" style="margin-top:10px">${esc(k.curation_note)}</p></div>
      <div class="panel"><h3>2 · What the pill said, blind (${t.pill_in_force ? "v" + t.pill_in_force : "no pill yet"})</h3>
        <p><span class="chip ${tr.classification}">${tr.classification.replace("_", " ")}</span></p>
        <h3>Rules that applied</h3><ul class="clean">${matched}</ul>
        <h3 style="margin-top:12px">Next actions, each from a rule</h3><ul class="clean">${actions}</ul>
        ${notCovered}
        <div class="esc"><b>Escalate ${tr.escalate.now ? "now" : "later"}</b> to ${esc(tr.escalate.to)}. ${esc(tr.escalate.reason)}</div>
        ${removed}
      </div>
      <div class="panel"><h3>3 · What the review later concluded</h3><p class="note">Graded: would a team following column 2 have been pointed at this?</p><ul class="clean">${findings}</ul></div>
    </div>
    ${learned}`;
  }

  function renderReplay(sel) {
    const el = $("#tab-replay");
    el.innerHTML = `${kpis()}
      <p class="lead">Each row is a real incident, in date order. The pill in force on that date sees only the first hour, then is graded against the operator's own review. What it missed is captured as a proposed new version, checked, regression-tested and approved before the next incident.</p>
      <div class="tl">
        <div class="tl-row tl-head"><span>Date</span><span>Incident</span><span>Pill</span><span>Blind call</span><span>Anticipated</span><span>Learned</span></div>
        ${T.map(row).join("")}
      </div>
      <div id="detail"></div>`;
    const select = (b, fromUser) => {
      el.querySelectorAll(".tl-row").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
      $("#detail").innerHTML = detail(T[+b.dataset.i]);
      if (fromUser) history.replaceState(null, "", `#replay/${T[+b.dataset.i].case.id}`);
    };
    const rows = [...el.querySelectorAll(".tl-row[data-i]")];
    rows.forEach((b) => b.addEventListener("click", () => select(b, true)));
    // Open on the incident that tells the story best unless the address names another one.
    const want = sel ?? (location.hash.startsWith("#replay/") ? location.hash.split("/")[1] : "AZ-AUE-2023");
    const i = T.findIndex((t) => t.case.id === want);
    select(rows[i >= 0 ? i : 0], false);
  }

  // ---------------------------------------------------------- pill
  function renderPill(version) {
    const el = $("#tab-pill");
    const p = pillByVersion[version] ?? latest;
    const prev = p.supersedes ? pillByVersion[p.supersedes] : null;
    const prevIds = new Set(prev ? prev.rules.map((r) => r.id) : []);
    const opts = D.pills.map((x) => `<option value="${x.version}" ${x.version === p.version ? "selected" : ""}>v${x.version} · ${x.status}</option>`).join("");
    const rules = p.rules
      .map(
        (r) => `<div class="rule ${prevIds.has(r.id) ? "" : "new"}">
        <h4><span class="rid">${r.id}</span> ${esc(r.title)} ${prevIds.has(r.id) ? "" : `<span class="chip">new in v${esc(p.version)}</span>`} ${r.evidence.every((e) => srcById[e.split(":")[0]]?.kind === "secondary") ? `<span class="chip partly" title="Every sentence behind this rule comes from a secondary source (a news report), not the operator's own review">secondary source only</span>` : ""}</h4>
        <dl>
          <dt>When</dt><dd><ul>${r.when.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></dd>
          <dt>Then</dt><dd><ul>${r.then.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></dd>
          <dt>Why</dt><dd>${esc(r.why)}</dd>
          ${r.escalate ? `<dt>Escalate</dt><dd>to <b>${esc(r.escalate.to)}</b> when ${esc(r.escalate.trigger)}</dd>` : ""}
        </dl>
        <div class="meta"><span>evidence ${cites(r.evidence)}</span><span>learned from ${r.learned_from.map(esc).join(", ")}</span><span>since v${esc(r.since)}</span></div>
      </div>`,
      )
      .join("");
    const guard = p.guardrails.map((g) => `<li><span class="rid">${g.id}</span> ${esc(g.text)} ${cites(g.evidence)}</li>`).join("");
    const qs = p.open_questions.map((q) => `<li><span class="rid">${q.id}</span> ${esc(q.question)}<div class="note">${esc(q.why)} · raised by ${esc(q.raised_by)}</div></li>`).join("");
    const appr = p.approvals.map((a) => `<li>${esc(a.decision)} by <b>${esc(a.by)}</b> (${esc(a.role)}${a.role_played ? ", role-played" : ""}) on ${day(a.at)} · ${esc(a.note)}</li>`).join("") || "<li><span class='chip partly'>not approved yet</span></li>";
    el.innerHTML = `<div class="pill-head">
        <h2 style="margin:0">${esc(p.name)}</h2>
        <select id="ver">${opts}</select>
        <span class="small">status <b>${esc(p.status)}</b>${p.effective_from ? ` · answering from ${day(p.effective_from)}` : ""} · owner: ${esc(p.owner.role)}</span>
      </div>
      <p class="lead">${esc(p.context)} Scope: ${p.scope.assets.map(esc).join("; ")}. Not for: ${p.scope.not_for.map(esc).join("; ")}.</p>
      <p class="small">File: <code>pills/${esc(p.id)}/${esc(p.version)}.yaml</code> · schema: <code>spec/pill.schema.json</code> · plain YAML, no vendor or model inside, so it can be exported and audited anywhere.</p>
      <h2>Rules (${p.rules.length})</h2><div class="rules">${rules}</div>
      <div class="cols2" style="margin-top:14px">
        <div class="panel"><h3>Guardrails (${p.guardrails.length})</h3><ul class="clean">${guard}</ul></div>
        <div class="panel"><h3>Open questions for an expert (${p.open_questions.length})</h3><p class="note">Where the reviews are silent (a threshold, a time limit, who decides), the pill asks instead of guessing.</p><ul class="clean">${qs}</ul></div>
      </div>
      <div class="cols2" style="margin-top:14px">
        <div class="panel"><h3>Approvals</h3><ul class="clean">${appr}</ul></div>
        <div class="panel"><h3>Changelog</h3><ul class="clean">${p.changelog.map((c) => `<li class="small">${esc(c)}</li>`).join("")}</ul></div>
      </div>`;
    $("#ver").addEventListener("change", (e) => renderPill(e.target.value));
  }


  // ---------------------------------------------------------- applying the pill to a new situation, and the manager's questions
  function renderApply() {
    const el = $("#tab-apply");
    const runs = (D.scenarios ?? []).filter(Boolean);
    if (!runs.length) {
      el.innerHTML = "<p class='lead'>No scenario has been run yet.</p>";
      return;
    }
    const s = runs[0].scenario;
    const col = (r) => {
      const t = r.triage;
      const p = pillByVersion[r.pill_version];
      const prev = p?.supersedes ? pillByVersion[p.supersedes] : null;
      const newIds = new Set(prev ? p.rules.filter((x) => !prev.rules.some((y) => y.id === x.id)).map((x) => x.id) : []);
      const ruleOf = (id) => p?.rules.find((x) => x.id === id);
      const acts = t.next_actions
        .map((a) => {
          const r0 = ruleOf(a.rule_id);
          return `<li><span class="rid">${a.rule_id}</span> ${newIds.has(a.rule_id) ? `<span class="chip">new in v${esc(r.pill_version)}</span> ` : ""}${esc(a.action)}<div class="note">learned from ${esc((r0?.learned_from ?? []).join(", "))}</div></li>`;
        })
        .join("");
      return `<div class="panel"><h3>Pill v${esc(r.pill_version)} <span class="chip ${r.pill_status === "proposed" ? "partly" : "yes"}">${esc(r.pill_status === "proposed" ? "proposed: preview before approval" : "released")}</span></h3>
        <p><span class="chip ${t.classification}">${t.classification.replace("_", " ")}</span></p>
        <ul class="clean">${acts}</ul>
        <div class="esc"><b>Escalate ${t.escalate.now ? "now" : "later"}</b> to ${esc(t.escalate.to)}. ${esc(t.escalate.reason)}</div>
        ${t.not_covered.length ? `<h3 style="margin-top:12px">Not covered</h3><ul class="clean">${t.not_covered.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>`;
    };
    const byVersion = {};
    for (const q of D.asks ?? []) (byVersion[q.question] ??= {})[q.pill_version] = q;
    const versions = [...new Set((D.asks ?? []).map((q) => q.pill_version))].sort();
    const askRows = Object.entries(byVersion)
      .map(([q, vs]) => `<div class="panel" style="margin-bottom:12px"><h3>${esc(q)}</h3><div class="cols2">${versions
        .map((v) => {
          const a = vs[v];
          if (!a) return "<div></div>";
          return `<div><p class="small"><b>v${esc(v)}</b> · relies on ${a.relies_on.map((r) => `<span class="rid">${esc(r)}</span>`).join(" ") || "nothing"}</p><p>${esc(a.answer)}</p>${a.not_in_pill ? `<p class="note"><b>Not in the pill:</b> ${esc(a.not_in_pill)}</p>` : ""}${a.removed_by_checks?.length ? `<p class="removed">Removed by checks: ${a.removed_by_checks.map(esc).join("; ")}</p>` : ""}</div>`;
        })
        .join("")}</div></div>`)
      .join("");
    el.innerHTML = `<h2>${esc(s.title)}</h2>
      <p class="lead"><span class="chip no">synthetic</span> Written by the project team to test the pill on a situation none of the six operators faced. ${esc(s.site)}.</p>
      <div class="cols2">
        <div class="panel"><h3>What the duty team sees</h3><ul class="clean">${s.signals.map((x) => `<li><span class="tplus">t+${x.t_plus_min}m</span>${esc(x.text)}</li>`).join("")}</ul>
          <p class="note" style="margin-top:10px">Same input shape as a live alarm feed: free-text observations with minutes since the first one.</p></div>
        <div class="panel"><h3>Why this is the point</h3><p class="small">No single incident contained all of this. The pill answers by combining rules learned from different operators in different years, and every action names the rule, and every rule names the review sentence it came from. The right-hand column previews the version awaiting approval, so the approver sees what would change before saying yes.</p></div>
      </div>
      <h2>Triage</h2><div class="cols2">${runs.map(col).join("")}</div>
      ${portability(runs)}
      <h2>Ask the pill, as a manager would ask the most experienced engineer</h2>
      <p class="lead">Answers may use only the pill. Where it is silent, it says so and names who decides, instead of inventing a number.</p>
      ${askRows}`;
  }


  function portability(runs) {
    const other = (D.portability ?? []).filter(Boolean);
    if (!other.length) return "";
    return other
      .map((o) => {
        const base = runs.find((r) => r.pill_version === o.pill_version);
        if (!base) return "";
        const a = new Set(base.triage.next_actions.map((x) => x.rule_id));
        const b = new Set(o.triage.next_actions.map((x) => x.rule_id));
        const all = [...new Set([...a, ...b])].sort();
        const both = all.filter((r) => a.has(r) && b.has(r));
        const cell = (set, r) => (set.has(r) ? "<span class='ok'>✓</span>" : "<span class='small'>–</span>");
        return `<h2>Same pill, another vendor</h2>
        <p class="lead">The pill file holds no model or vendor. The same v${esc(o.pill_version)} was run on ${esc(base.llm?.model ?? "the default model")} (${esc(base.llm?.provider ?? "")}) and on ${esc(o.llm?.model ?? "")} (${esc(o.llm?.provider === "hunyuan" ? "Tencent Cloud Hunyuan" : o.llm?.provider ?? "")}). Both classified it <b>${esc(base.triage.classification.replace("_", " "))}</b>${o.triage.classification !== base.triage.classification ? ` / <b>${esc(o.triage.classification.replace("_", " "))}</b>` : ""}; ${both.length} of ${all.length} rules were chosen by both.</p>
        <div class="panel"><table><thead><tr><th>Rule</th><th>Title</th><th>${esc(base.llm?.provider ?? "default")}</th><th>${esc(o.llm?.provider ?? "other")}</th></tr></thead><tbody>${all
          .map((r) => `<tr><td class="rid">${r}</td><td>${esc(pillByVersion[o.pill_version]?.rules.find((x) => x.id === r)?.title ?? "")}</td><td>${cell(a, r)}</td><td>${cell(b, r)}</td></tr>`)
          .join("")}</tbody></table></div>`;
      })
      .join("");
  }

  // ---------------------------------------------------------- ledger and sources
  function renderLedger() {
    const v = D.ledger.verify;
    const rows = D.ledger.events
      .map((e) => `<tr><td class="mono">${e.seq}</td><td class="mono">${day(e.at)}</td><td>${esc(e.action)}</td><td class="mono">${esc(e.subject)}</td><td>${esc(e.actor)}</td><td class="mono" title="${esc(e.hash)}">${esc(e.hash.slice(0, 12))}…</td><td class="mono">${esc(e.prev.slice(0, 12))}…</td></tr>`)
      .join("");
    $("#tab-ledger").innerHTML = `<h2>Audit ledger</h2>
      <p class="lead">Append-only. Each event carries the hash of the one before, so changing or deleting any past event breaks every hash after it. <code>npm run pills -- verify</code> checks the chain. Replay events carry the replay clock (incident dates); scenario and question runs carry the real time they were run.</p>
      <p>${v.ok ? `<span class="ok">Chain intact</span> · ${v.events} events` : `<span class="bad">Chain broken at event ${v.broken_at}</span>`}</p>
      <div class="panel"><table><thead><tr><th>#</th><th>Date</th><th>Action</th><th>Subject</th><th>Actor</th><th>Hash</th><th>Previous</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderSources() {
    const rows = D.sources
      .map((s) => `<tr><td class="mono">${esc(s.id)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.read_from ? `<div class="note">read from <a href="${esc(s.read_from)}" target="_blank" rel="noopener">archived copy</a></div>` : ""}${s.note ? `<div class="note">${esc(s.note)}</div>` : ""}</td><td>${esc(s.publisher)}</td><td><span class="chip ${s.kind === "primary" ? "yes" : "partly"}">${esc(s.kind)}</span></td></tr>`)
      .join("");
    $("#tab-sources").innerHTML = `<h2>Sources</h2>
      <p class="lead">The repository keeps sentence ids and the quoted sentences only. <code>npm run pills -- verify</code> re-checks each source against a recorded sha256.</p>
      <div class="panel"><table><thead><tr><th>Id</th><th>Review</th><th>Publisher</th><th>Kind</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h2>What is real and what is replayed</h2><div class="panel"><ul class="clean">${D.honesty.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>`;
  }

  $("#honesty").textContent = D.honesty[0] + " " + D.honesty[1];
  renderReplay();
  renderApply();
  renderPill(latest.version);
  renderLedger();
  renderSources();
  show(location.hash.slice(1).split("/")[0] || "replay");
})();
