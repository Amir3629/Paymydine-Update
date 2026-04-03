const KNOWN = new Set([
  "cod",
  "paypal",
  "stripe",
  "google_pay",
  "apple_pay",
  "square",
  "authorizenetaim",
  "sumup",
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
  const cls = (html.className || "").toLowerCase()
  const bg = getComputedStyle(html).getPropertyValue("--theme-background").trim().toLowerCase()

  const isDark =
    cls.includes("dark") ||
    theme.includes("dark") ||
    theme.includes("luxury") ||
    bg.includes("0f0b05") ||
    bg.includes("0a0e12") ||
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches

  return makePath(isDark ? "/images/payments/sumup_dark.svg" : "/images/payments/sumup.svg")
}

const CODE_ALIASES: Record<string, string> = {
  paypal_express: "paypal",
  paypalexpress: "paypal",
  sum_up: "sumup",
  sumup: "sumup",
}

export function iconForPayment(code: string): string {
  const raw = code ?? ""
  const trimmed = raw.trim()
  const key = CODE_ALIASES[trimmed.toLowerCase()] ?? trimmed.toLowerCase()

  if (!KNOWN.has(key)) return makePath("/images/payments/default.svg")
  if (key === "sumup") return sumupThemeIcon()

  const ext = PNG_ONLY.has(key) ? "png" : "svg"
  return makePath(`/images/payments/${key}.${ext}`)
}
