// frontend/lib/table-url.ts
export type TableLike = {
  table_id?: number | string | null;
  table_no?: number | string | null;
  path_table?: string | null;
};

export function buildTablePath(table: TableLike | null | undefined, originalPathId?: string | null) {
  // Prefer human-facing table_no; if absent, fall back to the original path segment; finally use table_id.
  const maybeNo = (table?.table_no ?? originalPathId) ?? table?.table_id;
  const num = typeof maybeNo === 'string' ? maybeNo : (maybeNo != null ? String(maybeNo) : '');
  return num ? `/table/${num}` : '/';
}