// Shared types for Bettroi pharmacy/clinical Edge Functions.
// Schema mirrors Adamrit's `medication` table + `v_pharmacy_low_stock_alert` view
// (canonical DDL: github.com/chatgptnotes/adamrit/blob/main/2_CREATE_PHARMACY_TABLES.sql).

export interface Medication {
  id: string;
  name: string;
  generic_name: string | null;
  item_code: string | null;
  current_stock: number;       // view CASTs from medication.stock (which is text)
  reorder_level: number | null;
  minimum_stock: number | null;
  supplier_name: string | null;
  manufacturer: string | null;
  shelf: string | null;
  pack_size?: number;          // not in view; pulled from medication if needed
}

export interface ReorderSuggestion {
  medication: Medication;
  suggested_qty: number;
  rationale: string;
  needs_human: boolean;
}

export interface ScanResult {
  scanned_at: string;
  total_medications_below_threshold: number;
  drafted_pos: number;
  alerts_sent: number;
  dry_run: boolean;
  errors: string[];
}
