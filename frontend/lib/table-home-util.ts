// frontend/lib/table-home-util.ts
import { getSavedHome } from "@/lib/table-home";
import { stickySearch } from "@/lib/sticky-query";

type MaybeTable = { 
  table_no?: number|string|null; 
  table_id?: number|string|null; 
  path_table?: string|null 
} | null | undefined;

export function getHomeHrefFallback(opts?: { 
  pathParam?: string|null; 
  tableInfo?: MaybeTable 
}) {
  const saved = getSavedHome();
  if (saved) return saved;

  // Only use table_no/table_id when defined and not null (avoid String(undefined) → "undefined")
  const tableNo = opts?.tableInfo?.table_no;
  const tableId = opts?.tableInfo?.table_id;
  const validTableNo = tableNo !== undefined && tableNo !== null ? String(tableNo) : null;
  const validTableId = tableId !== undefined && tableId !== null ? String(tableId) : null;

  const p =
    opts?.pathParam ??
    opts?.tableInfo?.path_table ??
    validTableNo ??
    validTableId;

  if (p && p !== "undefined" && p !== "null") {
    return `/table/${p}` + stickySearch();
  }
  return "/" + stickySearch();
}