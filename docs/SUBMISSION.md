# Submission text

Copy-ready text for the Tencent Cloud Hackathon Singapore 2026 submission form. Track: **Real Estate (Keppel) ·
AI HARVEST: Turning Expert Know-How into Reusable Intelligence**.

## Project title

Debrief to Duty

## Project link

https://debrief-to-duty.vercel.app · source: https://github.com/yorhagengyue/debrief-to-duty

## Short blurb (under 10 words)

Incident debriefs become cited, approved know-how for duty teams.

## Project description

### 1. Project overview: target scenario, users and value

**Scenario.** The first hour after a data hall loses cooling. Chillers trip after a power event, standby units do
not take over, temperatures climb, and the duty team has to decide what to check, what to restart first, when to
shed IT load and whom to call. The people who have lived through this before are usually somewhere else.

**Users.** The duty team and the Asset Operations Manager who supervises them; the facility engineers who own the
know-how; the approver who decides what becomes official practice.

**Value.** An *intelligence pill*: a versioned file of expert rules (when, then, why, escalate), guardrails and
open questions, captured from the operator's own incident reviews with a citation on every line. A version answers
nothing until a person approves it. During the next incident, a duty assistant recommends only what an approved
pill says, names the rule behind every action, says what is not covered and whom to escalate to. Each new review
becomes a proposed new version, regression-tested against every earlier incident before approval.

### 2. Real-world scenario insights: where the pain comes from, who has it, what we solve

We worked from six real, public incident reviews at four operators (Microsoft Azure, AWS, Google Cloud,
Alibaba Cloud) and one public account of a Singapore incident (Equinix), 2018–2023.

The pain is that the lesson does not travel. Microsoft lost a data hall in Texas in 2018 when lightning-induced
voltage swells shut down cooling. In Sydney in 2023 a voltage sag tripped chillers again; the team restarted them
one site after the next, and by the time it reached the last five, the chilled-water loop was too hot for them to
restart. Microsoft's own review says the staff on site would have been enough had they restarted in a load-based
order. In Hong Kong in 2022 the standby chillers could not take over because they shared the water loop that had
failed. In Singapore in 2023 a wrong signal during a planned upgrade closed the valves on chilled-water buffer tanks,
and two banks went down. Each was a novel problem to the team that faced it; each lesson was written down once and
filed.

Keppel's own brief names the same gap: experience leaves when people do, and documents hold only what was already
codified. What Keppel asked for at the sharing session was one end-to-end loop: capture the knowledge, capture the
new skill found while solving a new problem, approve it, put it back, and apply it to similar situations. That is
what this project builds and demonstrates.

### 3. Comprehensive solution design: business and technical architecture, and how prompts drive the AI

**Business process.** Capture after every incident → deterministic checks → proposed version → regression gate on
every earlier incident → approval by a different person (separation of duties) → release with an effective date →
use by duty teams and managers → outcome and review feed the next capture. Rollback is a revert: a new version with
the old content, so history is never rewritten. Every step is written to a hash-chained ledger.

**Technical architecture.** TypeScript engine with Zod schemas; every file format published as JSON Schema
(`spec/`). Pills, cases, proposals, runs and the ledger are plain YAML/JSON in git, with no model or vendor inside,
so the company keeps the knowledge and can move it. One model adapter serves two vendors: DeepSeek by default and
Tencent Cloud Hunyuan (`hy3` via TokenHub) as the second; the same pill run on both chose four of the same six rules
for the Singapore scenario. Every model call is recorded and replays byte-for-byte without a key, so tests, the
regression gate and the viewer are reproducible. A static viewer shows the replay, the pill, the scenario, the
manager's questions, the ledger and the sources.

**How prompts drive the AI, and how the AI is kept honest.** Four prompts, each with a narrow job:
- *Capture* turns numbered review sentences into proposed changes: add a rule, amend a rule, add a guardrail, or
  ask an expert. It must cite sentence ids for every claim, may not write a number that is not in a cited sentence,
  and must turn anything the review leaves open into a question rather than a guess.
- *Triage* sees only the first-hour signals and the approved pill. Every action must name a rule; anything else goes
  to "not covered" and escalation.
- *Evaluate* grades a triage against the findings of the review it never saw.
- *Ask* answers a manager using only the pill, and says plainly what the pill does not contain.

Deterministic code then checks every output before a person sees it: cited sentences must exist; numbers must
appear in the cited sentence; rule ids must exist in the version in force; anything that fails is removed and
listed, never repaired by guessing.

### 4. Business value: quantifiable metrics or clearly defined impact

- **The cost being addressed.** In Uptime Institute's 2024 outage analysis, 54% of operators said their most recent
  significant outage cost over US$100,000 and 16% over US$1 million. The 2023 Singapore cooling incident left
  810,000 failed access attempts and 2.5 million failed payment and ATM transactions, and MAS imposed measures on
  DBS including a 1.8× multiplier on its operational-risk capital.
- **Know-how that now travels.** 15 rules, 11 guardrails and 14 expert questions from six incidents, each traceable
  to the sentence it came from; on a new situation the released pill combines rules learned from four operators in
  different years.
- **Measured, not claimed.** Each version is graded blind on the next incident and regression-tested on all earlier
  ones; the gate flagged two versions that made earlier triage worse, and the approver saw it before deciding.
- **Owned by the company.** Plain files, published schemas, two interchangeable model vendors, a tamper-evident
  ledger: the knowledge outlives any tool or vendor contract.
- **For Keppel specifically.** Keppel DC REIT runs 25 data centres in 10 countries; the same engine applies to
  chiller plants in office towers, energy anomalies, lifts or leasing, wherever teams write reviews or debriefs.

Sources for the figures above: Uptime Institute outage findings as reported by DatacenterDynamics
(https://www.datacenterdynamics.com/en/news/uptime-institute-outages-in-2024-less-frequent-and-severe-but-more-expensive/);
the Singapore figures from the parliamentary reply as reported by TechSpot (source `EQX-SIN-2023`); the MAS measures
on DBS as reported by Fintech Futures
(https://www.fintechfutures.com/baas/mas-orders-dbs-bank-and-citibank-to-investigate-banking-services-disruption);
the Keppel DC REIT portfolio from its 1H 2026 results presentation
(https://www.keppeldcreit.com/en/file/investor-relations/financial-results/2026/kdcreit-1h-2026-results-presentation.pdf).

## What is real and what is replayed

The incidents and reviews are real and public. The replay treats them as if one operator had lived through all six
with the system installed from 2018. No person reviewed versions 1.0.0 to 1.4.0: the replay script approved each one automatically in the name of a role-played approver; version 1.5.0 is left for a person to decide. The Singapore scenario
is synthetic and labelled. One case rests on a news report because no public review was found.

## Built with CodeBuddy

CodeBuddy built task card T1 (`CODEBUDDY.md`): the reviewer-facing pill card and version diff (`src/card.ts`, the `card` and `diff` commands, `test/card.test.ts`). Three screenshots of the conversation, with what each shows, are in `docs/codebuddy/`.
