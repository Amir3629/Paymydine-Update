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

  const p =
    opts?.pathParam ??
    opts?.tableInfo?.path_table ??
    (opts?.tableInfo?.table_no != null ? String(opts.tableInfo.table_no) : null) ??
    (opts?.tableInfo?.table_id != null ? String(opts.tableInfo.table_id) : null);

  return (p ? `/table/${p}` : "/") + stickySearch();
}