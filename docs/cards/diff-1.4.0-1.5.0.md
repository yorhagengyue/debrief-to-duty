# Data hall cooling loss: first-hour judgement: 1.4.0 → 1.5.0

1 rule(s) added, 0 changed, 0 removed, 2 guardrail(s) added, 2 open question(s) added.

## Status and approvals

- Status: released → **proposed**
- Effective from: 2023-09-29T08:41:00.000Z → **not set**
- Approval of 1.4.0: **approve** by Head of Critical Facilities (role-played), Approver at 2023-09-29T08:41:00.000Z — Regression gate passed on 5 incident(s) against v1.3.0.
- Approval of 1.5.0: none yet

## Rules added

### R-015. Treat contractor control actions during upgrades as a cooling-availability threat

**When**

- a planned system upgrade is in progress and a contractor is sending control signals to cooling equipment
- the cooling plant includes chilled-water buffer tanks with valves that can be commanded closed

**Then**

- verify that contractor-issued signals cannot close valves on chilled-water buffer tanks or otherwise isolate the chilled-water loop
- confirm the actual valve position on the buffer tanks directly, not only from the control system indication
- if valves have been closed, treat the chilled-water loop as losing its buffer and act to restore flow before temperatures rise

**Why**

The review states the overheating was caused by a contractor sending an incorrect signal to close the valves from the chilled water buffer tanks during a planned system upgrade.

**Escalate**

To facility operations lead and cooling plant engineer, when contractor control action during an upgrade is confirmed to have changed the state of chilled-water buffer tank valves.

**Evidence:** `EQX-SIN-2023:S7`

## Guardrails added

- **G-010.** Do not assume that backup plans for a cooling failure will work; the review records that the backup plans prepared for this kind of situation turned out to be absolutely worthless. (`EQX-SIN-2023:S8`)
- **G-011.** Do not treat a backup data center as reachable without confirming the network path; the review records that one bank could not reach its backup data center because of a network misconfiguration and another had unspecified connectivity issues. (`EQX-SIN-2023:S9`)

## Open questions added

- **Q-013** (raised by EQX-SIN-2023). What is the maximum unscheduled downtime that the facility's cooling and power design can tolerate for critical banking systems, and how should the duty team measure and report against the MAS limit of four hours in a 12-month period?
- **Q-014** (raised by EQX-SIN-2023). What specific resilience requirements from the Monetary Authority of Singapore apply to the facility's cooling and power systems, and how should the duty team verify compliance during a cooling event?
