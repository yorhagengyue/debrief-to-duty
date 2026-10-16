# Data hall cooling loss: first-hour judgement

| | |
|---|---|
| Pill | `dc-cooling-loss` |
| Version | 1.0.0 |
| Status | superseded |
| Owner | Critical Facilities Engineering Lead: Pill owner (role-played in this replay) |
| Effective from | 2018-10-04T08:42:00.000Z |

Know-how for the first hour after cooling capacity is lost or at risk in a data hall: what to check, what to do next, and when a person must decide. Every rule cites the incident review sentences it comes from.

## Scope

Covers:

- data halls cooled by chilled-water plant (chillers, pumps, chilled-water loop)
- utility and generator power feeding that plant

Not for:

- IT service recovery and failover
- fire suppression and life safety (follow the site emergency plan)

## Rules (2)

### R-001. Treat utility voltage swells as a cooling-plant threat, not just a power-transfer event

*Since 1.0.0; learned from AZ-SCUS-2018.*

**When**

- storms are active in the area and the utility feed shows voltage sags or swells
- a portion of the datacenter has transferred from utility power to generator power

**Then**

- immediately verify that mechanical cooling systems are still running, rather than assuming surge suppressors protected them
- if mechanical cooling has shut down, treat the datacenter as being on a load-dependent thermal buffer and start planning for its depletion
- transfer the rest of the datacenter to generators to stabilize the power supply while storms are still active

**Why**

Voltage swells triggered a transfer to generator power and also shut down the mechanical cooling systems despite surge suppressors being in place; the site initially survived only on a load-dependent thermal buffer.

**Escalate**

To facility operations lead and cooling plant engineer, when mechanical cooling confirmed shut down while storms remain active in the area.

**Evidence**

- `AZ-SCUS-2018:S6`
  > Multiple Azure datacenters in the region saw voltage sags and swells across the utility feeds.
- `AZ-SCUS-2018:S7`
  > At 08:42 UTC, lightning caused electrical activity on the utility supply, which caused significant voltage swells.
- `AZ-SCUS-2018:S8`
  > These swells triggered a portion of one Azure datacenter to transfer from utility power to generator power.
- `AZ-SCUS-2018:S9`
  > Additionally, these power swells shutdown the datacenter’s mechanical cooling systems despite having surge suppressors in place.
- `AZ-SCUS-2018:S10`
  > Initially, the datacenter was able to maintain its operational temperatures through a load dependent thermal buffer that was designed within the cooling system.
- `AZ-SCUS-2018:S14`
  > While storms were still active in the area, onsite teams took a series of actions to prevent further damage – including transferring the rest of the datacenter to generators thereby stabilizing the power supply.

### R-002. Act on thermal buffer depletion before automated shutdowns begin

*Since 1.0.0; learned from AZ-SCUS-2018.*

**When**

- mechanical cooling is down and the datacenter is running on its load-dependent thermal buffer
- datacenter temperature is approaching safe operational thresholds

**Then**

- treat the thermal buffer as a finite resource and act before it is depleted
- expect that once the buffer is gone, temperature will exceed safe operational thresholds and automated device shutdown will begin
- recognize that in parts of the datacenter temperature can rise so quickly that hardware is damaged before it can shut down

**Why**

Once the thermal buffer was depleted the datacenter exceeded safe operational thresholds and automated shutdown began, but temperatures rose so quickly in places that some hardware was damaged before it could shut down.

**Escalate**

To incident commander, when thermal buffer depletion is imminent or automated shutdowns have started.

**Evidence**

- `AZ-SCUS-2018:S10`
  > Initially, the datacenter was able to maintain its operational temperatures through a load dependent thermal buffer that was designed within the cooling system.
- `AZ-SCUS-2018:S11`
  > However, once this thermal buffer was depleted the datacenter temperature exceeded safe operational thresholds, and an automated shutdown of devices was initiated.
- `AZ-SCUS-2018:S12`
  > This shutdown mechanism is intended to preserve infrastructure and data integrity, but in this instance, temperatures increased so quickly in parts of the datacenter that some hardware was damaged before it could shut down.

## Guardrails (2)

### G-001

*Since 1.0.0.*

Do not rely on surge suppressors alone to keep mechanical cooling available during utility voltage swells; the review records that cooling shut down despite surge suppressors being in place.

**Evidence**

- `AZ-SCUS-2018:S9`
  > Additionally, these power swells shutdown the datacenter’s mechanical cooling systems despite having surge suppressors in place.

### G-002

*Since 1.0.0.*

Do not assume onsite redundancies make customer workloads safe from a datacenter cooling failure; the review states there are scenarios in which a cooling failure can impact customer workloads in the affected datacenter.

**Evidence**

- `AZ-SCUS-2018:S21`
  > Despite onsite redundancies, there are scenarios in which a datacenter cooling failure can impact customer workloads in the affected datacenter.

## Open questions (3)

### Q-001

*Raised by AZ-SCUS-2018, since 1.0.0.*

**Question.** What is the safe operational temperature threshold for this datacenter, and what is the expected time from thermal buffer depletion to that threshold under the site's load-dependent thermal buffer design?

**Why it matters.** The review refers to safe operational thresholds and a load-dependent thermal buffer but gives no numbers, so a duty team cannot judge how much time it has before automated shutdowns and hardware damage begin.

### Q-002

*Raised by AZ-SCUS-2018, since 1.0.0.*

**Question.** What specific recovery procedures must be followed after a cooling failure that damaged storage servers, network devices and power units, and who decides when the datacenter is safe to return to normal operation?

**Why it matters.** The review calls for a thorough review of the datacenter recovery procedures but does not state what those procedures are or who owns the decision.

### Q-003

*Raised by AZ-SCUS-2018, since 1.0.0.*

**Question.** What hardware design changes to storage scale units are required to increase resiliency to environmental factors such as rapid temperature rise?

**Why it matters.** The review identifies an evaluation of future hardware design of storage scale units as a remediation theme but does not specify the design requirements.

## Approvals

- **approve** by Head of Critical Facilities (role-played), Approver at 2018-10-04T08:42:00.000Z — Regression gate passed on 1 incident(s) against vnone.

## Changelog

- 1.0.0: R-001 added from AZ-SCUS-2018: Treat utility voltage swells as a cooling-plant threat, not just a power-transfer event; R-002 added from AZ-SCUS-2018: Act on thermal buffer depletion before automated shutdowns begin; G-001 added from AZ-SCUS-2018; G-002 added from AZ-SCUS-2018; Q-001 raised by AZ-SCUS-2018; Q-002 raised by AZ-SCUS-2018; Q-003 raised by AZ-SCUS-2018
