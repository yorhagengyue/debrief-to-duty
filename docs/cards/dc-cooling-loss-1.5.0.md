# Data hall cooling loss: first-hour judgement

| | |
|---|---|
| Pill | `dc-cooling-loss` |
| Version | 1.5.0 (supersedes 1.4.0) |
| Status | proposed |
| Owner | Critical Facilities Engineering Lead: Pill owner (role-played in this replay) |
| Effective from | not set |

Know-how for the first hour after cooling capacity is lost or at risk in a data hall: what to check, what to do next, and when a person must decide. Every rule cites the incident review sentences it comes from.

## Scope

Covers:

- data halls cooled by chilled-water plant (chillers, pumps, chilled-water loop)
- utility and generator power feeding that plant

Not for:

- IT service recovery and failover
- fire suppression and life safety (follow the site emergency plan)

## Rules (15)

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

### R-003. Treat a control-system failover as a cooling-availability event, not a routine maintenance action

*Since 1.1.0; learned from AWS-NRT-2019.*

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

**Evidence**

- `AWS-NRT-2019:S22`
  > Just prior to the event, the datacenter control system was in the process of failing away from one of the control hosts.
- `AWS-NRT-2019:S23`
  > During this kind of failover, the control system has to exchange information with other control systems and the datacenter equipment it controls (e.g., the cooling equipment and temperature sensors throughout the datacenter) to ensure that the new control host has the most up-to-date information about the state of the datacenter.
- `AWS-NRT-2019:S24`
  > Due to a bug in the third-party control system logic, this exchange resulted in excessive interactions between the control system and the devices in the datacenter which ultimately resulted in the control system becoming unresponsive.
- `AWS-NRT-2019:S25`
  > Our datacenters are designed such that if the datacenter control system fails, the cooling systems go into maximum cooling mode until the control system functionality is restored.
- `AWS-NRT-2019:S26`
  > While this worked correctly in most of the datacenter, in a small portion of the datacenter, the cooling system did not correctly transition to this safe cooling configuration and instead shut down.

### R-004. When the control system is down, work the cooling chain by hand and reset the PLCs

*Since 1.1.0; learned from AWS-NRT-2019.*

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

**Evidence**

- `AWS-NRT-2019:S28`
  > The team attempted to activate purge in the affected areas of the datacenter, but this also failed.
- `AWS-NRT-2019:S29`
  > At this point, temperatures began to rise in the affected part of the datacenter and servers began to power off when they became too hot.
- `AWS-NRT-2019:S30`
  > Because the datacenter control system was unavailable, the operations team had minimum visibility into the health and state of the datacenter cooling systems.
- `AWS-NRT-2019:S31`
  > To recover, the team had to manually investigate and reset all of the affected pieces of equipment and put them into a maximum cooling configuration.
- `AWS-NRT-2019:S32`
  > During this process, it was discovered that the PLCs controlling some of the air handling units were also unresponsive.
- `AWS-NRT-2019:S33`
  > These controllers needed to be reset.
- `AWS-NRT-2019:S34`
  > It was the failure of these PLC controllers which prevented the default cooling and “purge” mode from correctly working.
- `AWS-NRT-2019:S35`
  > After these controllers were reset, cooling was restored to the affected area of the datacenter and temperatures began to decrease.

### R-005. Treat simultaneous failure of redundant cooling systems as a single-point-of-failure event

*Since 1.2.0; learned from GCP-LDN-2022.*

**When**

- multiple cooling systems that are supposed to be redundant have failed at the same time
- outside temperatures are extraordinarily high

**Then**

- do not assume that remaining cooling capacity is sufficient; treat the data center as unable to maintain a safe operating temperature
- immediately assess whether the data center can maintain a safe operating temperature
- if not, plan to power down servers to prevent an even longer outage or damage to machines

**Why**

The review states that one data center could not maintain a safe operating temperature due to a simultaneous failure of multiple, redundant cooling systems combined with extraordinarily high outside temperatures, and that powering down was done to prevent an even longer outage or damage.

**Escalate**

To incident commander, when simultaneous failure of redundant cooling systems and rising temperatures.

**Evidence**

- `GCP-LDN-2022:S30`
  > One of the data centers that hosts zone europe-west2-a could not maintain a safe operating temperature due to a simultaneous failure of multiple, redundant cooling systems combined with the extraordinarily high outside temperatures.
- `GCP-LDN-2022:S31`
  > We powered down this part of the zone to prevent an even longer outage or damage to machines.

### R-006. Use progressive thermal load reduction before full shutdown

*Since 1.2.0; learned from GCP-LDN-2022.*

**When**

- data center temperatures are increasing and cooling capacity is insufficient
- the data center is at risk of exceeding safe operating temperatures

**Then**

- progressively decrease the thermal load within the data center space
- consider terminating non-critical workloads such as Preemptible VMs to reduce thermal load and ensure space for zonal failover activities
- if thermal load reduction is insufficient, power down servers to prevent an even longer outage and further impact to infrastructure

**Why**

The review describes terminating 42% of Preemptible VMs to reduce thermal load and ensure space for zonal failover, and later powering down servers to prevent a longer outage; it also commits to investigating more advanced methods to progressively decrease thermal load to reduce the probability of full shutdown.

**Escalate**

To incident commander, when temperatures continue to rise despite initial load reduction.

**Evidence**

- `GCP-LDN-2022:S52`
  > As data center temperatures started to increase, on Tuesday, 19 July 2022 at 08:06 US/Pacific Compute Engine terminated 42% of the Preemptible VMs (PVMs) across the europe-west2 region to reduce thermal load in zone europe-west2-a and ensure space for zonal failover activities in zones europe-west2-b and europe-west2-c.
- `GCP-LDN-2022:S36`
  > At 10:05, our engineers decided to power down servers in the impacted data center within europe-west2-a to prevent an even longer outage and further impact to infrastructure in the zone.
- `GCP-LDN-2022:S42`
  > We will investigate and develop more advanced methods to progressively decrease the thermal load within a single data center space, reducing the probability that a full shutdown is required.

### R-007. Verify standby cooling is on an independent water circuit before trusting failover

*Since 1.3.0; learned from ALI-HKG-2022.*

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

**Evidence**

- `ALI-HKG-2022:S72`
  > Issue analysis: Air entered the cooling system of the data center due to lack of water, which affected the water circulation of the four active chillers.
- `ALI-HKG-2022:S73`
  > However, the four standby chillers used the same water circulation system as the four active chillers, so the failover failed.

### R-008. Check whether chillers are bound into a cluster before attempting individual restart

*Since 1.3.0; learned from ALI-HKG-2022.*

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

**Evidence**

- `ALI-HKG-2022:S74`
  > After recirculating the water and discharging gas, chillers could not be restarted individually because all chillers of the data center were bound into a cluster.
- `ALI-HKG-2022:S75`
  > In this case, engineers had to manually modify the configurations of the chillers to allow them to run individually.
- `ALI-HKG-2022:S76`
  > Then, the chillers were restarted one after another, which slowed the restoration progress of the entire cooling system.

### R-009. Reduce IT load early to prevent fire sprinkler activation during cooling loss

*Since 1.3.0; learned from ALI-HKG-2022.*

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

**Evidence**

- `ALI-HKG-2022:S82`
  > Issue analysis: With the failure of the cooling system, the temperatures in all server rooms rose uncontrollably.
- `ALI-HKG-2022:S83`
  > This triggered the fire sprinkler system, and water got into multiple power supply cabinets and server racks, damaging hardware and complicating the equipment restoration process.
- `ALI-HKG-2022:S13`
  > At 10:30, we began to reduce loads on the computing, storage, network, database, and big data clusters of the entire data center to prevent the temperature from rising too fast and causing a fire.

### R-010. Restart chillers in a load-based sequence across data halls, not adjacent-first

*Since 1.4.0; learned from AZ-AUE-2023.*

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

**Evidence**

- `AZ-AUE-2023:S115`
  > Emergency Operation Procedure for manual restarts of simultaneous chiller failures has changed from an ‘adjacent’ sequence to a data hall ‘load based’ sequence to ensure all impacted data halls have partial cooling, to slow thermal runaway while full cooling is being restored (Completed).
- `AZ-AUE-2023:S117`
  > Based on our incident analysis the staffing levels at the time would have been sufficient to prevent impact if a ‘load based' chiller restart sequence had been followed, which we have since implemented (Completed).

### R-011. Treat the chilled-water loop temperature as the deadline for chiller restart

*Since 1.4.0; learned from AZ-AUE-2023.*

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

**Evidence**

- `AZ-AUE-2023:S16`
  > By the time the team reached the final five chillers requiring a manual restart, the water inside the pump system for these chillers (chilled water loop) had reached temperatures that were too high to allow them to be restarted.
- `AZ-AUE-2023:S17`
  > In this scenario, the restart is inhibited by a self-protection mechanism that acts to prevent damage to the chiller that would occur by processing water at the elevated temperatures.

### R-012. Confirm minimum chiller count per data hall before and during restart

*Since 1.4.0; learned from AZ-AUE-2023.*

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

**Evidence**

- `AZ-AUE-2023:S18`
  > The five chillers that could not be restarted supported cooling for the two adjacent data halls which were impacted in this incident.
- `AZ-AUE-2023:S19`
  > The two impacted data halls require at least four chillers to be operational.
- `AZ-AUE-2023:S20`
  > Before the voltage sag, our cooling capacity for these halls consisted of seven chillers, with five chillers in operation and two chillers in standby.

### R-013. Use infrastructure shutdown to cool the chilled-water loop when restart is blocked

*Since 1.4.0; learned from AZ-AUE-2023.*

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

**Evidence**

- `AZ-AUE-2023:S22`
  > At 11:34 UTC, as temperatures continued to increase, our onsite datacenter team began a remote shutdown of remaining networking, compute, and storage infrastructure in the impacted data halls to protect data durability, infrastructure health, and address the thermal runaway.
- `AZ-AUE-2023:S23`
  > This shutdown allowed the chilled water loop to return to a safe temperature which allowed us to restart the chillers.
- `AZ-AUE-2023:S24`
  > This shutdown of infrastructure resulted in a further reduction of service availability for this Availability Zone.

### R-014. Stage extra technicians before attempting manual chiller restarts

*Since 1.4.0; learned from AZ-AUE-2023.*

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

**Evidence**

- `AZ-AUE-2023:S116`
  > Following this incident, as a temporary mitigation, we increased technician staffing levels at the datacenter to be prepared to execute manual restart procedures of our chillers prior to the change to the Chiller Management System to prevent restart failures.

### R-015. Treat contractor control actions during upgrades as a cooling-availability threat

*Since 1.5.0; learned from EQX-SIN-2023.*

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

**Evidence**

- `EQX-SIN-2023:S7`
  > According to Equinix, the overheating issue was caused by a contractor that sent an incorrect signal to "close the valves from the chilled water buffer tanks" during a planned system upgrade.

## Guardrails (11)

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

### G-003

*Since 1.1.0.*

Do not treat purge mode as a guaranteed independent fallback while PLCs may be unresponsive; the review records that purge failed in the affected areas because the PLC controllers were unresponsive, and that purge is only being modified to bypass PLCs in newer designs.

**Evidence**

- `AWS-NRT-2019:S27`
  > As an added safeguard, our datacenter operators have the ability to bypass the datacenter control systems and put our cooling system in “purge” mode to quickly exhaust hot air in the event of a malfunction.
- `AWS-NRT-2019:S28`
  > The team attempted to activate purge in the affected areas of the datacenter, but this also failed.
- `AWS-NRT-2019:S34`
  > It was the failure of these PLC controllers which prevented the default cooling and “purge” mode from correctly working.
- `AWS-NRT-2019:S39`
  > Finally, we are working to modify the way that we control the impacted air handling units to ensure that “purge mode” is able to bypass the PLC controllers completely.
- `AWS-NRT-2019:S40`
  > This is an approach we have begun using in our newest datacenter designs and will make us even more confident that “purge mode” will work even if PLCs become unresponsive.

### G-004

*Since 1.1.0.*

Do not rely on the datacenter control system for visibility into cooling health during a control-system failure; the review records that the operations team had minimum visibility into cooling health and state while the control system was unavailable.

**Evidence**

- `AWS-NRT-2019:S30`
  > Because the datacenter control system was unavailable, the operations team had minimum visibility into the health and state of the datacenter cooling systems.

### G-005

*Since 1.1.0.*

Do not assume the control-system failover mode that triggered this bug is available; the review records that this failover mode has been disabled in the interim to prevent recurrence.

**Evidence**

- `AWS-NRT-2019:S37`
  > In the interim, we have disabled the failover mode that triggered this bug on our control systems to ensure we do not have a recurrence of this issue.

### G-006

*Since 1.2.0.*

Do not assume that redundant cooling systems provide protection against simultaneous failure, especially during extraordinarily high outside temperatures; the review records that multiple redundant cooling systems failed simultaneously and the data center could not maintain a safe operating temperature.

**Evidence**

- `GCP-LDN-2022:S30`
  > One of the data centers that hosts zone europe-west2-a could not maintain a safe operating temperature due to a simultaneous failure of multiple, redundant cooling systems combined with the extraordinarily high outside temperatures.

### G-007

*Since 1.3.0.*

Do not assume that automatic failover to standby cooling will work; the review records that standby chillers shared the same water circulation system as the active chillers, so failover failed. Verify both automatic and manual failover effectiveness before relying on them.

**Evidence**

- `ALI-HKG-2022:S73`
  > However, the four standby chillers used the same water circulation system as the four active chillers, so the failover failed.
- `ALI-HKG-2022:S80`
  > We will also ensure that automatic failover and manual failover are both effective to avoid disaster recovery failures due to deadlocks.

### G-008

*Since 1.3.0.*

Do not rely on the fire sprinkler system as a safe thermal limit; the review records that sprinkler activation due to high temperature caused water damage to power supply cabinets and server racks, complicating restoration.

**Evidence**

- `ALI-HKG-2022:S18`
  > At 14:47, the fire sprinkler system of a room was triggered automatically due to high temperature, which increased the difficulty in troubleshooting.
- `ALI-HKG-2022:S83`
  > This triggered the fire sprinkler system, and water got into multiple power supply cabinets and server racks, damaging hardware and complicating the equipment restoration process.

### G-009

*Since 1.4.0.*

Do not assume the Chiller Management System will restart chillers correctly after a voltage sag; the review records that incremental load increases over time produced a chiller operating configuration susceptible to a timing defect in the Chiller Management System, and that a control timing logic change was required to de-risk restart failure due to voltage fluctuations.

**Evidence**

- `AZ-AUE-2023:S113`
  > Incremental load increases over time in the Availability Zone resulted in a chiller operating configuration that was susceptible to a timing defect in the Chiller Management System.
- `AZ-AUE-2023:S114`
  > We have de-risked this failure to restart due to voltage fluctuations, by implementing a change to the control timing logic on the Chiller Management System (Completed).

### G-010

*Since 1.5.0.*

Do not assume that backup plans for a cooling failure will work; the review records that the backup plans prepared for this kind of situation turned out to be absolutely worthless.

**Evidence**

- `EQX-SIN-2023:S8`
  > DBS and Citibank had some backup plans prepared for this kind of situation, but those turned out to be absolutely worthless.

### G-011

*Since 1.5.0.*

Do not treat a backup data center as reachable without confirming the network path; the review records that one bank could not reach its backup data center because of a network misconfiguration and another had unspecified connectivity issues.

**Evidence**

- `EQX-SIN-2023:S9`
  > DBS was unable to reach its backup data center because of a "network misconfiguration," Singapore's government said, while Citibank had some unspecified connectivity issues.

## Open questions (14)

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

### Q-004

*Raised by AWS-NRT-2019, since 1.1.0.*

**Question.** What is the maximum time the site can run with cooling down before hardware damage or customer impact, and what temperature or time threshold should trigger escalation and manual PLC reset?

**Why it matters.** The review describes temperatures rising and servers powering off but gives no threshold or time limit; the pill cannot tell a duty team when to escalate without a number that is not in the cited sentences.

### Q-005

*Raised by AWS-NRT-2019, since 1.1.0.*

**Question.** What is the approved procedure and authority for manually resetting PLCs and air handling units when the control system is unavailable, and who decides to do it?

**Why it matters.** The review records that the team had to manually investigate and reset equipment, but does not state the procedure, the authority, or the decision trigger; the pill must not guess these.

### Q-006

*Raised by AWS-NRT-2019, since 1.1.0.*

**Question.** How should operators identify and remediate this specific control-system failover bug, and what evidence confirms the situation has recurred?

**Why it matters.** The review states local operations teams were trained to quickly identify and remediate this situation, but does not describe the identifying signs or the remediation steps; the pill cannot encode them without that detail.

### Q-007

*Raised by GCP-LDN-2022, since 1.2.0.*

**Question.** What specific outside temperature threshold or combination of conditions should trigger preemptive thermal load reduction or shutdown planning when redundant cooling systems are compromised?

**Why it matters.** The review cites extraordinarily high outside temperatures as a contributing factor but does not specify a threshold; without this, the pill cannot guide when to act before a full shutdown is required.

### Q-008

*Raised by GCP-LDN-2022, since 1.2.0.*

**Question.** What are the criteria and decision process for progressively decreasing thermal load within a data center space, including which workloads to curtail and in what order?

**Why it matters.** The review commits to investigating more advanced methods but does not provide operational details; the pill needs expert guidance to implement progressive load reduction safely and effectively.

### Q-009

*Raised by ALI-HKG-2022, since 1.3.0.*

**Question.** What are the specific temperature thresholds and time limits for deciding when to shut down servers and when to power off server rooms during a cooling failure?

**Why it matters.** The review states the contingency plan will clarify when servers must be shut down and server rooms powered off, but does not give the thresholds or time limits needed to make that decision.

### Q-010

*Raised by ALI-HKG-2022, since 1.3.0.*

**Question.** What additional fine-grained metrics should be monitored to detect air ingress or water loss in the cooling system earlier, and what are their alarm thresholds?

**Why it matters.** The review commits to expanding monitoring scope for more efficient troubleshooting, but does not specify which metrics or thresholds would have detected the root cause sooner.

### Q-011

*Raised by AZ-AUE-2023, since 1.4.0.*

**Question.** What chilled-water loop temperature is the threshold above which the chiller self-protection mechanism inhibits restart, and how quickly does the loop reach it under the current data hall load?

**Why it matters.** The review says the loop reached temperatures too high to allow restart but gives no number; without the threshold and the heating rate the pill cannot tell a duty team how much time it has before restart becomes impossible.

### Q-012

*Raised by AZ-AUE-2023, since 1.4.0.*

**Question.** What is the maximum time a data hall can run below its minimum operational chiller count before infrastructure must be shut down to protect data durability and infrastructure health?

**Why it matters.** The review shows the shutdown decision was made as temperatures continued to increase, but gives no time limit or temperature trigger; the pill needs an expert-defined limit to tell teams when to stop trying to restart and start shedding load.

### Q-013

*Raised by EQX-SIN-2023, since 1.5.0.*

**Question.** What is the maximum unscheduled downtime that the facility's cooling and power design can tolerate for critical banking systems, and how should the duty team measure and report against the MAS limit of four hours in a 12-month period?

**Why it matters.** The review states that MAS dictates unscheduled downtime for critical banking systems should not exceed four hours within a 12-month period and that the October issue exceeded that limit, but the pill has no rule tying cooling-event decisions to that regulatory clock.

### Q-014

*Raised by EQX-SIN-2023, since 1.5.0.*

**Question.** What specific resilience requirements from the Monetary Authority of Singapore apply to the facility's cooling and power systems, and how should the duty team verify compliance during a cooling event?

**Why it matters.** The review states that the two financial institutions did not comply with MAS requirements related to resilience of critical IT systems, but the pill does not translate those requirements into facility checks.

## Approvals

None yet. This version answers nothing until a person approves it.

## Changelog

- 1.0.0: R-001 added from AZ-SCUS-2018: Treat utility voltage swells as a cooling-plant threat, not just a power-transfer event; R-002 added from AZ-SCUS-2018: Act on thermal buffer depletion before automated shutdowns begin; G-001 added from AZ-SCUS-2018; G-002 added from AZ-SCUS-2018; Q-001 raised by AZ-SCUS-2018; Q-002 raised by AZ-SCUS-2018; Q-003 raised by AZ-SCUS-2018
- 1.1.0: R-003 added from AWS-NRT-2019: Treat a control-system failover as a cooling-availability event, not a routine maintenance action; R-004 added from AWS-NRT-2019: When the control system is down, work the cooling chain by hand and reset the PLCs; G-003 added from AWS-NRT-2019; G-004 added from AWS-NRT-2019; G-005 added from AWS-NRT-2019; Q-004 raised by AWS-NRT-2019; Q-005 raised by AWS-NRT-2019; Q-006 raised by AWS-NRT-2019
- 1.2.0: R-005 added from GCP-LDN-2022: Treat simultaneous failure of redundant cooling systems as a single-point-of-failure event; R-006 added from GCP-LDN-2022: Use progressive thermal load reduction before full shutdown; G-006 added from GCP-LDN-2022; Q-007 raised by GCP-LDN-2022; Q-008 raised by GCP-LDN-2022
- 1.3.0: R-007 added from ALI-HKG-2022: Verify standby cooling is on an independent water circuit before trusting failover; R-008 added from ALI-HKG-2022: Check whether chillers are bound into a cluster before attempting individual restart; R-009 added from ALI-HKG-2022: Reduce IT load early to prevent fire sprinkler activation during cooling loss; G-007 added from ALI-HKG-2022; G-008 added from ALI-HKG-2022; Q-009 raised by ALI-HKG-2022; Q-010 raised by ALI-HKG-2022
- 1.4.0: R-010 added from AZ-AUE-2023: Restart chillers in a load-based sequence across data halls, not adjacent-first; R-011 added from AZ-AUE-2023: Treat the chilled-water loop temperature as the deadline for chiller restart; R-012 added from AZ-AUE-2023: Confirm minimum chiller count per data hall before and during restart; R-013 added from AZ-AUE-2023: Use infrastructure shutdown to cool the chilled-water loop when restart is blocked; R-014 added from AZ-AUE-2023: Stage extra technicians before attempting manual chiller restarts; G-009 added from AZ-AUE-2023; Q-011 raised by AZ-AUE-2023; Q-012 raised by AZ-AUE-2023
- 1.5.0: R-015 added from EQX-SIN-2023: Treat contractor control actions during upgrades as a cooling-availability threat; G-010 added from EQX-SIN-2023; G-011 added from EQX-SIN-2023; Q-013 raised by EQX-SIN-2023; Q-014 raised by EQX-SIN-2023
