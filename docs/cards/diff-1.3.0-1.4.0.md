# Data hall cooling loss: first-hour judgement: 1.3.0 → 1.4.0

5 rule(s) added, 0 changed, 0 removed, 1 guardrail(s) added, 2 open question(s) added.

## Status and approvals

- Status: superseded → **released**
- Effective from: 2023-01-17T00:56:00.000Z → **2023-09-29T08:41:00.000Z**
- Approval of 1.3.0: **approve** by Head of Critical Facilities (role-played), Approver at 2023-01-17T00:56:00.000Z — Approved with 1 flagged regression(s) (AWS-NRT-2019 0.56→0.33): the new rules are judged worth it; owner to review the flagged incidents.
- Approval of 1.4.0: **approve** by Head of Critical Facilities (role-played), Approver at 2023-09-29T08:41:00.000Z — Regression gate passed on 5 incident(s) against v1.3.0.

## Rules added

### R-010. Restart chillers in a load-based sequence across data halls, not adjacent-first

**When**

- a utility voltage sag has tripped multiple chillers offline and some require manual restart
- more than one data hall is supported by the chillers that failed to restart

**Then**

- sequence manual chiller restarts by data hall load so that every impacted data hall gets partial cooling early, rather than finishing one data hall before starting the next
- do not work through chillers in an adjacent sequence that leaves later data halls with no cooling until the end
- keep the chilled-water loop temperature in mind as the clock: once loop water is too hot, chillers will refuse to restart

**Why**

The review states the emergency procedure was changed from an adjacent sequence to a data hall load-based sequence to ensure all impacted data halls have partial cooling and slow thermal runaway while full cooling is restored, and that the staffing at the time would have been sufficient to prevent impact if a load-based sequence had been followed.

**Escalate**

To facility operations lead, when multiple chillers require manual restart across more than one data hall.

**Evidence:** `AZ-AUE-2023:S115`, `AZ-AUE-2023:S117`

### R-011. Treat the chilled-water loop temperature as the deadline for chiller restart

**When**

- chillers have tripped offline and are being manually restarted
- the chilled-water loop serving those chillers has been sitting without cooling

**Then**

- recognize that once loop water reaches elevated temperatures the chiller self-protection mechanism will inhibit restart to prevent damage
- prioritize restarting the chillers that serve the most thermally exposed data halls before the loop heats past the restart limit
- if restart is inhibited, plan to reduce the thermal load so the loop can cool, rather than repeatedly attempting restart

**Why**

The review states that by the time the team reached the final five chillers the chilled-water loop had reached temperatures too high to allow restart, and that restart is inhibited by a self-protection mechanism to prevent chiller damage from processing water at elevated temperatures.

**Escalate**

To cooling plant engineer, when chiller restart is inhibited by the self-protection mechanism.

**Evidence:** `AZ-AUE-2023:S16`, `AZ-AUE-2023:S17`

### R-012. Confirm minimum chiller count per data hall before and during restart

**When**

- chillers supporting a data hall have tripped offline
- the data hall requires a minimum number of operational chillers to stay within thermal thresholds

**Then**

- count how many chillers each impacted data hall still has running against its minimum requirement
- treat any data hall below its minimum as being in thermal runaway risk and act on load before temperatures climb
- account for standby chillers separately from running chillers when judging margin

**Why**

The review states the two impacted data halls require at least four chillers to be operational, and that before the sag cooling consisted of seven chillers with five in operation and two in standby; the five chillers that could not be restarted supported those two halls.

**Escalate**

To incident commander, when an impacted data hall falls below its minimum operational chiller count.

**Evidence:** `AZ-AUE-2023:S18`, `AZ-AUE-2023:S19`, `AZ-AUE-2023:S20`

### R-013. Use infrastructure shutdown to cool the chilled-water loop when restart is blocked

**When**

- chillers cannot be restarted because the chilled-water loop is too hot
- data hall temperatures are continuing to increase

**Then**

- reduce the thermal load by shutting down networking, compute, and storage infrastructure in the impacted data halls
- treat this shutdown as the means to bring the chilled-water loop back to a safe temperature so chillers can be restarted
- accept the loss of service availability in the affected zone as the cost of protecting data durability and infrastructure health

**Why**

The review states that at 11:34 UTC the onsite team began a remote shutdown of remaining infrastructure to protect data durability, infrastructure health, and address thermal runaway, and that this shutdown allowed the chilled-water loop to return to a safe temperature which allowed the chillers to be restarted, at the cost of further reducing service availability.

**Escalate**

To incident commander, when chillers remain blocked from restart by high loop temperature.

**Evidence:** `AZ-AUE-2023:S22`, `AZ-AUE-2023:S23`, `AZ-AUE-2023:S24`

### R-014. Stage extra technicians before attempting manual chiller restarts

**When**

- a voltage event has tripped multiple chillers and manual restart is required
- the Chiller Management System has not yet been changed to prevent restart failures

**Then**

- increase technician staffing at the datacenter so manual restart procedures can be executed promptly
- assign teams so restarts can proceed in parallel across data halls rather than sequentially
- treat staffing as a temporary mitigation until the control timing logic change is in place

**Why**

The review states that as a temporary mitigation technician staffing levels were increased to be prepared to execute manual restart procedures prior to the change to the Chiller Management System, to prevent restart failures.

**Escalate**

To facility operations lead, when multiple chillers require manual restart and the control timing logic change is not yet in place.

**Evidence:** `AZ-AUE-2023:S116`

## Guardrails added

- **G-009.** Do not assume the Chiller Management System will restart chillers correctly after a voltage sag; the review records that incremental load increases over time produced a chiller operating configuration susceptible to a timing defect in the Chiller Management System, and that a control timing logic change was required to de-risk restart failure due to voltage fluctuations. (`AZ-AUE-2023:S113`, `AZ-AUE-2023:S114`)

## Open questions added

- **Q-011** (raised by AZ-AUE-2023). What chilled-water loop temperature is the threshold above which the chiller self-protection mechanism inhibits restart, and how quickly does the loop reach it under the current data hall load?
- **Q-012** (raised by AZ-AUE-2023). What is the maximum time a data hall can run below its minimum operational chiller count before infrastructure must be shut down to protect data durability and infrastructure health?
