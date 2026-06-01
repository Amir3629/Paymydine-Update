const CUSTOMER_GOLD_ROUTES = ["/", "/menu", "/valet"];

export function isGoldCustomerRoute(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (!path) return false;
  if (CUSTOMER_GOLD_ROUTES.includes(path)) return true;
  return path.startsWith("/menu/") || path.startsWith("/table/") || path.startsWith("/valet/");
}

export function isGoldCustomerAppActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector('[data-pmd-customer-app="gold-v1"]') ||
    document.documentElement.getAttribute("data-pmd-customer-root") === "gold-v1"
  );
}

export function shouldSkipLegacyThemeForGoldCustomer(pathname?: string): boolean {
  return isGoldCustomerRoute(pathname) || isGoldCustomerAppActive();
}
