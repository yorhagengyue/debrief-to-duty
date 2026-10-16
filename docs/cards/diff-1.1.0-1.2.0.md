# Data hall cooling loss: first-hour judgement: 1.1.0 → 1.2.0

2 rule(s) added, 0 changed, 0 removed, 1 guardrail(s) added, 2 open question(s) added.

## Status and approvals

- Effective from: 2019-09-22T03:36:00.000Z → **2022-08-18T13:33:00.000Z**
- Approval of 1.1.0: **approve** by Head of Critical Facilities (role-played), Approver at 2019-09-22T03:36:00.000Z — Regression gate passed on 2 incident(s) against v1.0.0.
- Approval of 1.2.0: **approve** by Head of Critical Facilities (role-played), Approver at 2022-08-18T13:33:00.000Z — Regression gate passed on 3 incident(s) against v1.1.0.

## Rules added

### R-005. Treat simultaneous failure of redundant cooling systems as a single-point-of-failure event

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

**Evidence:** `GCP-LDN-2022:S30`, `GCP-LDN-2022:S31`

### R-006. Use progressive thermal load reduction before full shutdown

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

**Evidence:** `GCP-LDN-2022:S52`, `GCP-LDN-2022:S36`, `GCP-LDN-2022:S42`

## Guardrails added

- **G-006.** Do not assume that redundant cooling systems provide protection against simultaneous failure, especially during extraordinarily high outside temperatures; the review records that multiple redundant cooling systems failed simultaneously and the data center could not maintain a safe operating temperature. (`GCP-LDN-2022:S30`)

## Open questions added

- **Q-007** (raised by GCP-LDN-2022). What specific outside temperature threshold or combination of conditions should trigger preemptive thermal load reduction or shutdown planning when redundant cooling systems are compromised?
- **Q-008** (raised by GCP-LDN-2022). What are the criteria and decision process for progressively decreasing thermal load within a data center space, including which workloads to curtail and in what order?
