// frontend/lib/table-home.ts
export function getSavedHome(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("table_home");
}

export function setSavedHome(url: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("table_home", url);
}