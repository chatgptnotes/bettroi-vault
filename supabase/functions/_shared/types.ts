// Shared types for Bettroi pharmacy/clinical Edge Functions.

export interface Medicine {
  id: string | number;
  name: string;
  current_stock: number;
  reorder_level: number;
  supplier: string | null;
  pack_size?: number | null;
  lead_time_days?: number | null;
  cold_chain?: boolean | null;
  schedule?: string | null; // H, H1, X for controlled
}

export interface ReorderSuggestion {
  medicine: Medicine;
  suggested_qty: number;
  rationale: string;
  needs_human: boolean;
}

export interface ScanResult {
  scanned_at: string;
  total_medicines_checked: number;
  below_threshold: number;
  drafted_pos: number;
  alerts_sent: number;
  dry_run: boolean;
  errors: string[];
}
