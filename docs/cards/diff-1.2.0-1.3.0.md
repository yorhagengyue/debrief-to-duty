# Data hall cooling loss: first-hour judgement: 1.2.0 → 1.3.0

3 rule(s) added, 0 changed, 0 removed, 2 guardrail(s) added, 2 open question(s) added.

## Status and approvals

- Effective from: 2022-08-18T13:33:00.000Z → **2023-01-17T00:56:00.000Z**
- Approval of 1.2.0: **approve** by Head of Critical Facilities (role-played), Approver at 2022-08-18T13:33:00.000Z — Regression gate passed on 3 incident(s) against v1.1.0.
- Approval of 1.3.0: **approve** by Head of Critical Facilities (role-played), Approver at 2023-01-17T00:56:00.000Z — Approved with 1 flagged regression(s) (AWS-NRT-2019 0.56→0.33): the new rules are judged worth it; owner to review the flagged incidents.

## Rules added

### R-007. Verify standby cooling is on an independent water circuit before trusting failover

**When**

- a cooling failure has occurred and the contingency plan calls for switching to standby chillers
- the standby chillers share a water circulation system with the active chillers

**Then**

- do not assume standby chillers will take over; confirm the standby plant draws from an independent water circuit before relying on it
- if the standby shares the same water loop, treat the failover as likely to fail and move directly to auxiliary heat dissipation and ventilation measures
- notify the chiller manufacturer early rather than waiting for the failover to prove ineffective

**Why**

Air entered the cooling system due to lack of water and affected the active chillers, but the standby chillers used the same water circulation system, so the failover failed.

**Escalate**

To facility operations lead and chiller manufacturer, when standby chillers confirmed to share the same water circulation system as the failed active chillers.

**Evidence:** `ALI-HKG-2022:S72`, `ALI-HKG-2022:S73`

### R-008. Check whether chillers are bound into a cluster before attempting individual restart

**When**

- chillers have been recirculated and gas discharged but will not restart
- the site's chillers are configured as a bound cluster

**Then**

- recognize that individual chiller restart will not work while the chillers remain bound into a cluster
- plan to manually modify chiller configurations to unbind them from the cluster so each can be restarted individually
- expect that restarting chillers one after another will slow restoration of the whole cooling system

**Why**

After recirculating water and discharging gas, chillers could not be restarted individually because all chillers were bound into a cluster; engineers had to manually modify configurations to run them individually, and restarting one after another slowed restoration.

**Escalate**

To chiller manufacturer's engineers, when chillers will not restart individually and are confirmed bound into a cluster.

**Evidence:** `ALI-HKG-2022:S74`, `ALI-HKG-2022:S75`, `ALI-HKG-2022:S76`

### R-009. Reduce IT load early to prevent fire sprinkler activation during cooling loss

**When**

- cooling system has failed and server room temperatures are rising uncontrollably
- temperatures are approaching the level that could trigger the fire sprinkler system

**Then**

- begin reducing loads on computing, storage, network, database, and big data clusters to slow temperature rise
- shut down servers in rooms with high temperature
- treat sprinkler activation as a risk that can damage power supply cabinets and server racks and complicate restoration

**Why**

With cooling failure, temperatures rose uncontrollably, triggering the fire sprinkler system; water entered power supply cabinets and server racks, damaging hardware and complicating restoration.

**Escalate**

To incident commander, when temperatures continue to rise despite load reduction and sprinkler activation is possible.

**Evidence:** `ALI-HKG-2022:S82`, `ALI-HKG-2022:S83`, `ALI-HKG-2022:S13`

## Guardrails added

- **G-007.** Do not assume that automatic failover to standby cooling will work; the review records that standby chillers shared the same water circulation system as the active chillers, so failover failed. Verify both automatic and manual failover effectiveness before relying on them. (`ALI-HKG-2022:S73`, `ALI-HKG-2022:S80`)
- **G-008.** Do not rely on the fire sprinkler system as a safe thermal limit; the review records that sprinkler activation due to high temperature caused water damage to power supply cabinets and server racks, complicating restoration. (`ALI-HKG-2022:S18`, `ALI-HKG-2022:S83`)

## Open questions added

- **Q-009** (raised by ALI-HKG-2022). What are the specific temperature thresholds and time limits for deciding when to shut down servers and when to power off server rooms during a cooling failure?
- **Q-010** (raised by ALI-HKG-2022). What additional fine-grained metrics should be monitored to detect air ingress or water loss in the cooling system earlier, and what are their alarm thresholds?
