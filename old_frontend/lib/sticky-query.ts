// frontend/lib/sticky-query.ts
export function stickySearch(keys = ['location','guest','date','time','qr','table']) {
  const sp = new URLSearchParams(window.location.search);
  const next = new URLSearchParams();
  keys.forEach(k => { const v = sp.get(k); if (v) next.set(k, v); });
  const s = next.toString();
  return s ? `?${s}` : '';
}