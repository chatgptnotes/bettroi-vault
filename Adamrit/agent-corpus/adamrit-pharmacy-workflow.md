---
department: pharmacy
agent_pack: adamrit-integration
sensitivity: internal
last_reviewed: 2026-05-15
owner: chatgptnotes@gmail.com
status: draft
tags: [sop, adamrit, pharmacy, inventory, dispensing]
---

# Adamrit — Pharmacy Workflow

## Scope

How prescriptions become dispensing events and bills inside Adamrit. The procurement / reorder side (vendor PO generation, threshold alerts) is covered by the pharmacy reorder agent's own SOP — see [[inventory-management]] in `corpus/pharmacy/`. This note is about the *in-app* workflow: prescribing, dispensing, batch tracking, billing.

## Surface area

- **Pages:** `Pharmacy.tsx`, `Medications.tsx`, `src/pages/prescriptions/`.
- **Hooks:** `useMedicationData`, `useBatchInventory`, `useSearchableMedication`, `usePendingPrescriptions`.

## Medication master

- Medications table — drug name, generic, form, strength, default unit price, category.
- Searchable autocomplete from `useSearchableMedication` (used in prescription dialogs and billing).

## Batch inventory

- `useBatchInventory` exposes per-batch stock: batch number, expiry date, quantity on hand.
- Dispensing decrements the **specific batch**, not just the master quantity, so expiry tracking and recall are possible.
- Out-of-stock and near-expiry warnings should surface to the dispenser via the inventory hook.

## Prescription → dispense flow

```
1. Doctor prescribes in OPD/IPD UI
   (TreatmentSheet.tsx / clinical pages — uses useSearchableMedication)
   ↓
2. Prescription appears in pharmacy queue (usePendingPrescriptions)
   ↓
3. Pharmacist opens the prescription in Pharmacy.tsx
   ↓
4. For each item: pick the batch to dispense from (useBatchInventory)
   ↓
5. Dispense — decrement that batch's stock, mark prescription line as dispensed
   ↓
6. Charge — the dispensed line posts to the visit's bill at the appropriate rate
   ↓
7. (Optional) print the pharmacy slip
```

## Scheme handling

Pharmacy items go on the same final bill as the rest of the visit's charges. The scheme attached to the patient determines markup / coverage rules. See [[adamrit-billing-workflow]] for how the line item flows into the final bill.

## Batch + expiry rules

- **First Expiry First Out (FEFO):** the dispenser should choose the batch with the nearest expiry first, unless clinical reason dictates otherwise.
- **Expired stock must not dispense.** The UI should block or warn when the chosen batch's expiry is past the current date.
- **GRN at receipt:** when stock is received, the Goods Received Note flow updates the batch table — see procurement SOP [[inventory-management]].

## Reorder triggers (separate agent)

When in-app stock falls below the reorder threshold (e.g. **500 amps** for Inj. Atropine and Inj. Adrenaline, per [[inventory-management]]), the pharmacy reorder agent (`agents/pharmacy/reorder-suggester/`) triggers a draft PO to the vendor. That agent reads Adamrit's stock data via the Supabase client and writes its decisions to `agent_audit_log`.

## Related

- [[adamrit-system-overview]]
- [[adamrit-clinical-workflows]] — where prescriptions are written
- [[adamrit-billing-workflow]] — how dispensed items become bill lines
- [[adamrit-supabase-schema]] — medication / pharmacy_batches / prescription tables
- [[inventory-management]] — procurement / reorder SOP (separate corpus)
- [[reorder-thresholds]] — companion threshold policy
- [[hospital-abbreviations]] — GRN, PO, FEFO
