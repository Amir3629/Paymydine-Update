const KNOWN = new Set([
  "cod",
  "card",
  "paypal",
  "stripe",
  "google_pay",
  "apple_pay",
  "wero",
  "square",
  "authorizenetaim",
  "sumup",
  "worldline",
])

const PNG_ONLY = new Set<string>([
  "google_pay",
  "apple_pay",
  "cod",
  "stripe",
  "square",
  "authorizenetaim",
])

const ORIGIN = (process.env.NEXT_PUBLIC_STATIC_ORIGIN || "").replace(/\/+$/, "")

function makePath(rel: string) {
  return ORIGIN ? `${ORIGIN}${rel}` : rel
}

function sumupThemeIcon() {
  if (typeof window === "undefined") return makePath("/images/payments/sumup.svg")

  const html = document.documentElement
  const theme = (html.getAttribute("data-theme") || "").toLowerCase()
  const classes = (html.className || "").toLowerCase()
  const styles = getComputedStyle(html)
  const bg = (styles.getPropertyValue("--theme-background") || "").trim().toLowerCase()

  const isDark =
    classes.includes("dark") ||
    theme.includes("dark") ||
    theme.includes("luxury") ||
    bg === "#0f0b05" ||
    bg.includes("15, 11, 5")

  return makePath(isDark ? "/images/payments/sumup_dark.svg" : "/images/payments/sumup.svg")
}

const CODE_ALIASES: Record<string, string> = {
  card_payment: "card",
  paypal_express: "paypal",
  paypalexpress: "paypal",
  sum_up: "sumup",
  sumup: "sumup",
  wero_pay: "wero",
}

export function iconForPayment(code: string): string {
  const raw = code ?? ""
  const key = CODE_ALIASES[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase()

  if (!KNOWN.has(key)) return makePath("/images/payments/default.svg")
  if (key === "sumup") return sumupThemeIcon()
  if (key === "wero") return makePath("/images/payments/wero.svg")

  const ext = PNG_ONLY.has(key) ? "png" : "svg"
  return makePath(`/images/payments/${key}.${ext}`)
}
