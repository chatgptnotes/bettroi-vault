---
department: pharmacy
agent_pack: reorder-suggester
sensitivity: internal
last_reviewed: 2026-05-10
owner: cmd@hopehospital.com
status: approved
tags: [sop, pharmacy, inventory, procurement, vendor]
---

# SOP: Pharmacy Inventory Management & Procurement

## 1. Objective

To establish a systematic process for monitoring stock, triggering reorder points, and managing vendor communications to ensure zero stock-outs of essential medicines.

## 2. Inventory Categorization & Reorder Levels

All pharmacy items are assigned a **Minimum Threshold (Reorder Level)** based on clinical criticality and lead time.

| Medication Item | Reorder Level (Units) | Primary Vendor |
|---|---|---|
| **Inj. Atropine** | **500 Amps** | **SSV Pharmaceutical & Distributor** |
| **Inj. Adrenaline** | **500 Amps** | **SSV Pharmaceutical & Distributor** |
| Critical Care Drugs | 20% of monthly consumption | Preferred Contracted Vendor |
| Routine Oral Meds | 10-day buffer | Designated Supplier |

Companion thresholds policy is in [[reorder-thresholds]].

## 3. The Reorder Process

The procurement cycle is triggered the moment **Current Stock ≤ Reorder Level**.

### Phase A: Trigger and Verification

1. **System Alert** — the Inventory Management System monitors real-time stock. When Inj. Atropine reaches **500 units**, a "Reorder Required" flag is raised AND the on-call humans are notified in Slack `#pharmacy-alerts`.
2. **Physical Audit** — the Pharmacy In-charge performs a quick spot-check to reconcile system data with physical shelf count before the order is finalized.

### Phase B: Vendor Notification

1. **Order Generation** — a Purchase Order (PO) is generated automatically by the agent or manually by the Pharmacist.
2. **Vendor Contact** — for Inj. Atropine and Inj. Adrenaline, the order is dispatched directly to **SSV Pharmaceutical & Distributor**.
3. **Communication Channel:**
   - **Primary:** digital PO sent via registered email / vendor portal.
   - **Escalation:** if no acknowledgment within **4 hours**, a direct phone call to the vendor's dispatch desk is required.

## 4. Receiving and Documentation

- **GRN (Goods Received Note):** upon delivery, the staff verifies batch number, expiry date, and quantity against the PO.
- **System Update:** stock levels must be updated in the "Single Source of Truth" database immediately upon receipt.
- **Documentation:** all invoices must be scanned and attached to the digital entry to maintain a transparent audit trail.

## 5. Emergency Procurement

If stock falls below a **"Critical Red Line"** (e.g., 50% of the reorder level) AND the vendor cannot deliver within the hour:

- The Pharmacist is authorized to procure from local partner pharmacies.
- The Administrator must be notified of the vendor's failure to meet the SLA (Service Level Agreement).

## 6. Roles and Responsibilities

- **Pharmacist** — responsible for daily reconciliation and ensuring the system reflects accurate counts.
- **Purchase Officer** — responsible for maintaining vendor relationships (SSV Pharmaceutical & Distributor, etc.) and ensuring timely payments to prevent supply holds.
- **Administrator** — escalation point for SLA failures and emergency procurement approvals.

## 7. Agent integration

The pharmacy reorder agent (`agents/pharmacy/reorder-suggester/`) consumes this SOP at runtime. Specifically:

- **Trigger rule:** when stock of `adrenaline` OR `atropine` falls **below 500 units**, the agent (a) posts an alert to Slack `#pharmacy-alerts` for human acknowledgement, and (b) generates a draft PO addressed to **SSV Pharmaceutical & Distributor**.
- **Approval gate:** the draft PO requires Pharmacist sign-off in Slack before dispatch (closed-loop per the framework's test-harness pattern).
- **Audit row:** every reorder cycle writes an entry to `agent_audit_log` with vendor, qty, lead-time, and the SOP version (`last_reviewed` frontmatter date) the agent grounded on.
