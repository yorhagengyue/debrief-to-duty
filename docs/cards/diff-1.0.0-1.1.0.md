# Data hall cooling loss: first-hour judgement: 1.0.0 → 1.1.0

2 rule(s) added, 0 changed, 0 removed, 3 guardrail(s) added, 3 open question(s) added.

## Status and approvals

- Effective from: 2018-10-04T08:42:00.000Z → **2019-09-22T03:36:00.000Z**
- Approval of 1.0.0: **approve** by Head of Critical Facilities (role-played), Approver at 2018-10-04T08:42:00.000Z — Regression gate passed on 1 incident(s) against vnone.
- Approval of 1.1.0: **approve** by Head of Critical Facilities (role-played), Approver at 2019-09-22T03:36:00.000Z — Regression gate passed on 2 incident(s) against v1.0.0.

## Rules added

### R-003. Treat a control-system failover as a cooling-availability event, not a routine maintenance action

**When**

- the datacenter control system is in the process of failing away from one of its control hosts
- the control system is exchanging state information with other control systems and with cooling equipment and temperature sensors

**Then**

- treat the failover as a period of elevated risk to cooling availability and watch the cooling plant directly, not only the control system
- expect that a fault in the control system logic during this exchange can make the control system unresponsive
- verify that cooling systems have actually entered their designed maximum-cooling fallback rather than assuming the fallback engaged

**Why**

The control system was mid-failover when a bug in third-party control logic caused excessive interactions with datacenter devices and left the control system unresponsive; the designed fallback to maximum cooling did not engage everywhere.

**Escalate**

To facility operations lead and cooling plant engineer, when control system failover in progress or control system confirmed unresponsive.

**Evidence:** `AWS-NRT-2019:S22`, `AWS-NRT-2019:S23`, `AWS-NRT-2019:S24`, `AWS-NRT-2019:S25`, `AWS-NRT-2019:S26`

### R-004. When the control system is down, work the cooling chain by hand and reset the PLCs

**When**

- the datacenter control system is unavailable and operators have minimum visibility into cooling health and state
- cooling has not transitioned to maximum cooling or purge mode in part of the datacenter

**Then**

- do not wait for the control system to come back; manually investigate the affected cooling equipment
- check the Programmable Logic Controllers controlling the air handling units, since they can be unresponsive even when the control system is the visible failure
- reset the affected equipment and PLCs and place them into a maximum cooling configuration
- confirm cooling is restored and temperatures are falling before standing down

**Why**

The control system was unavailable, purge failed, and recovery required manually investigating and resetting all affected equipment into maximum cooling; the unresponsive PLCs controlling some air handling units were what prevented both default cooling and purge from working.

**Escalate**

To incident commander, when temperatures are rising and servers have begun powering off.

**Evidence:** `AWS-NRT-2019:S28`, `AWS-NRT-2019:S29`, `AWS-NRT-2019:S30`, `AWS-NRT-2019:S31`, `AWS-NRT-2019:S32`, `AWS-NRT-2019:S33`, `AWS-NRT-2019:S34`, `AWS-NRT-2019:S35`

## Guardrails added

- **G-003.** Do not treat purge mode as a guaranteed independent fallback while PLCs may be unresponsive; the review records that purge failed in the affected areas because the PLC controllers were unresponsive, and that purge is only being modified to bypass PLCs in newer designs. (`AWS-NRT-2019:S27`, `AWS-NRT-2019:S28`, `AWS-NRT-2019:S34`, `AWS-NRT-2019:S39`, `AWS-NRT-2019:S40`)
- **G-004.** Do not rely on the datacenter control system for visibility into cooling health during a control-system failure; the review records that the operations team had minimum visibility into cooling health and state while the control system was unavailable. (`AWS-NRT-2019:S30`)
- **G-005.** Do not assume the control-system failover mode that triggered this bug is available; the review records that this failover mode has been disabled in the interim to prevent recurrence. (`AWS-NRT-2019:S37`)

## Open questions added

- **Q-004** (raised by AWS-NRT-2019). What is the maximum time the site can run with cooling down before hardware damage or customer impact, and what temperature or time threshold should trigger escalation and manual PLC reset?
- **Q-005** (raised by AWS-NRT-2019). What is the approved procedure and authority for manually resetting PLCs and air handling units when the control system is unavailable, and who decides to do it?
- **Q-006** (raised by AWS-NRT-2019). How should operators identify and remediate this specific control-system failover bug, and what evidence confirms the situation has recurred?
