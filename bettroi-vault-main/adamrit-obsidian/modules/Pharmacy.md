# Pharmacy

#clinical #inventory

**Purpose:** Medicine inventory management — procurement (PO→GRN), batch stock tracking, prescription dispensing, and direct sale billing.

**Connected to:** [[Patient Management]], [[IPD]], [[Billing]], [[Tally Integration]], [[Master Data]], [[Supabase]]

---

## Key Pages

| Page | File |
|------|------|
| Pharmacy (main) | `src/pages/Pharmacy.tsx` |
| Medications master | `src/pages/Medications.tsx` |
| Import pharmacy data | guide in `IMPORT_PHARMACY_DATA_GUIDE.md` |

## Key Components

| Component | Purpose |
|-----------|---------|
| `src/components/pharmacy/PharmacyBilling.tsx` | Medicine sales billing |
| `src/components/pharmacy/MedicineInventory.tsx` | Stock management view |
| `src/components/pharmacy/DirectSaleBill.tsx` | Counter sales |
| `src/components/pharmacy/CreateGRN.tsx` | Goods Receipt Note creation |
| `src/components/pharmacy/AddPurchaseOrder.tsx` | PO creation |
| `src/components/pharmacy/LowStockMedicines.tsx` | Inventory alerts |

## Key Services

| File | Purpose |
|------|---------|
| `src/lib/pharmacy-billing-service.ts` | Billing logic |
| `src/lib/batch-inventory-service.ts` | Batch tracking, FIFO deduction |
| `src/lib/purchase-order-service.ts` | PO lifecycle |
| `src/lib/grn-service.ts` | GRN processing, stock update |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `inventory_items` | Current stock per medicine |
| `medicine_master` | Medicine master catalogue |
| `medicine_batch_inventory` | Batch-wise stock (expiry, quantity) |
| `batch_stock_movements` | Every stock in/out transaction |
| `requisitions` | Internal purchase requests |
| `purchase_orders` | POs to suppliers |
| `goods_received_notes` | GRN header (delivery receipt) |
| `grn_items` | GRN line items (medicines received) |
| `suppliers` | Supplier master |
| `manufacturers_companies` | Manufacturer data |
| `visit_medications` | Medicines prescribed per visit |

---

## Key Workflows

```
Procurement:
  Requisition → Purchase Order → GRN → Batch Stock Added

Dispensing:
  Prescription (visit_medications) → Medicine Dispensed → Batch Deducted (FIFO)

Counter Sale:
  DirectSaleBill → Payment → Tally Auto-push
```
