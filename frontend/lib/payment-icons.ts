const KNOWN = new Set([
  "cod",
  "paypal",
  "stripe",
  "authorizenetaim",
  "google_pay",
  "apple_pay",
  "square",
]);

/**
 * Prefer PNG if available (e.g., real logos you placed), otherwise use SVG.
 * Toggle entries to true if the corresponding PNG exists in /public/images/payments.
 */
const PNG_ONLY = new Set<string>([
  "google_pay",
  "apple_pay",
  "cod",
  "paypal",
  "stripe",
  "authorizenetaim",
  "square",
]);

// Absolute origin for static assets, e.g. http://127.0.0.1:3000
const ORIGIN = (process.env.NEXT_PUBLIC_STATIC_ORIGIN || "").replace(/\/+$/, "");

function makePath(rel: string) {
  return ORIGIN ? `${ORIGIN}${rel}` : rel;
}

export function iconForPayment(code: string): string {
  const key = (code || "").trim();
  if (!KNOWN.has(key)) return makePath("/images/payments/default.svg");
  const ext = PNG_ONLY.has(key) ? "png" : "svg";
  return makePath(`/images/payments/${key}.${ext}`);
}