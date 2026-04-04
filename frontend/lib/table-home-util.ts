const clean = (v: any) => {
  if (!v) return null;
  if (v === "undefined") return null;
  if (v === "null") return null;
  return v;
};

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

  const tableNo = opts?.tableInfo?.table_no;
  const tableId = opts?.tableInfo?.table_id;

  const validTableNo =
    tableNo !== undefined && tableNo !== null && tableNo !== ""
      ? String(tableNo)
      : null;

  const validTableId =
    tableId !== undefined && tableId !== null && tableId !== ""
      ? String(tableId)
      : null;

  const p =
    opts?.pathParam ??
    opts?.tableInfo?.path_table ??
    validTableNo ??
    validTableId;

  return (p ? `/table/${p}` : "/") + stickySearch();
}
