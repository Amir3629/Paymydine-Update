"use client"

import { useState } from "react"

type Props = {
  amount?: number
  orderId?: number | string | null
  orderType?: string
  successUrl?: string
  cancelUrl?: string
}

export default function SumUpHostedCheckout(props: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    try {
      setLoading(true)
      setError(null)

      const payload = {
        order_id: props.orderId ?? null,
        order_type: props.orderType ?? "delivery",
        success_url: props.successUrl ?? `${window.location.origin}/order-placed`,
        cancel_url: props.cancelUrl ?? `${window.location.origin}/menu`,
      }

      console.log("[PMD-SUMUP] create-checkout payload", payload)

      const res = await fetch("/api/v1/payments/sumup/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      let json: any = null

      try {
        json = JSON.parse(text)
      } catch {
        json = { raw: text }
      }

      console.log("[PMD-SUMUP] create-checkout response", {
        status: res.status,
        ok: res.ok,
        json,
      })

      if (!res.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
      }

      const redirectUrl =
        json?.redirect_url ||
        json?.checkout_url ||
        json?.data?.redirect_url ||
        json?.data?.checkout_url ||
        json?.data?.hosted_checkout_url ||
        json?.hosted_checkout_url

      if (!redirectUrl) {
        throw new Error("No redirect URL returned from SumUp backend")
      }

      window.location.href = redirectUrl
    } catch (e: any) {
      console.error("[PMD-SUMUP] checkout failed", e)
      setError(e?.message || "SumUp checkout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-pmd-sumup-checkout="1"
      className="w-full mt-4 rounded-3xl border p-4 sm:p-5"
      style={{
        borderColor: "var(--theme-border)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <img
          src="/images/payments/sumup_dark.svg"
          alt="SumUp"
          className="h-8 w-auto object-contain"
          style={{ maxWidth: "140px" }}
        />
        <div>
          <div className="text-sm font-semibold">پرداخت با SumUp</div>
          <div className="text-xs opacity-80">بعد از کلیک، به صفحه امن SumUp منتقل می‌شوی.</div>
        </div>
      </div>

      {error ? (
        <div
          className="mb-3 rounded-2xl px-3 py-2 text-sm"
          style={{ background: "rgba(255,0,0,0.08)", color: "#ff6b6b" }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-2xl px-4 py-3 font-semibold transition"
        style={{
          background: "var(--theme-payment-button, var(--theme-primary))",
          color: "var(--theme-background, #111)",
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "در حال انتقال به SumUp..." : "Pay with SumUp"}
      </button>
    </div>
  )
}
TS

section "5) Patch secure-payment-flow.tsx"
python3 <<'PY'
from pathlib import Path
p = Path("/var/www/paymydine/frontend/components/payment/secure-payment-flow.tsx")
s = p.read_text()

if 'import SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout"' not in s:
    marker = 'import { iconForPayment } from "@/lib/payment-icons"'
    s = s.replace(marker, marker + '\nimport SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout"')

if 'case "sumup":' not in s:
    target = 'case "cod":'
    repl = '''case "sumup":
        return (
          <SumUpHostedCheckout />
        )

      case "cod":'''
    s = s.replace(target, repl)

# hard fallback under selectedPaymentMethod block
if 'data-pmd-sumup-hard-fallback="1"' not in s:
    anchor = '{selectedPaymentMethod && ('
    if anchor in s:
        s = s.replace(anchor, '''{selectedPaymentMethod === "sumup" && (
              <div data-pmd-sumup-hard-fallback="1" className="w-full mt-4">
                <SumUpHostedCheckout />
              </div>
            )}

            {selectedPaymentMethod && (''')

p.write_text(s)
PY

grep -n 'sumup\|SumUpHostedCheckout\|pmd-sumup-hard-fallback' "$SECURE_FLOW" | tee -a "$OUT" || true

section "6) Patch payment-flow.tsx"
python3 <<'PY'
from pathlib import Path
p = Path("/var/www/paymydine/frontend/components/payment-flow.tsx")
s = p.read_text()

if 'import SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout"' not in s:
    marker = 'import { iconForPayment } from "@/lib/payment-icons"'
    s = s.replace(marker, marker + '\nimport SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout"')

if 'case "sumup":' not in s:
    target = 'case "cod":'
    repl = '''case "sumup":
        return (
          <SumUpHostedCheckout />
        )

      case "cod":'''
    s = s.replace(target, repl)

if 'data-pmd-sumup-hard-fallback="1"' not in s:
    anchor = '{selectedPaymentMethod && ('
    if anchor in s:
        s = s.replace(anchor, '''{selectedPaymentMethod === "sumup" && (
              <div data-pmd-sumup-hard-fallback="1" className="w-full mt-4">
                <SumUpHostedCheckout />
              </div>
            )}

            {selectedPaymentMethod && (''')

p.write_text(s)
PY

grep -n 'sumup\|SumUpHostedCheckout\|pmd-sumup-hard-fallback' "$PAYMENT_FLOW" | tee -a "$OUT" || true

section "7) Build frontend"
cd "$FRONT"
rm -rf .next
npm run build | tee -a "$OUT"

section "8) Restart pm2"
pm2 restart paymydine-frontend | tee -a "$OUT"
pm2 save | tee -a "$OUT"

section "9) Final checks"
echo "Test icon files:" | tee -a "$OUT"
ls -la "$IMG_DIR"/sumup*.svg | tee -a "$OUT"

echo | tee -a "$OUT"
echo "Now test this flow:" | tee -a "$OUT"
echo "1) open /menu" | tee -a "$OUT"
echo "2) add item to cart" | tee -a "$OUT"
echo "3) open order modal" | tee -a "$OUT"
echo "4) click SumUp" | tee -a "$OUT"
echo "5) you should see a card with button: Pay with SumUp" | tee -a "$OUT"
echo "6) click button -> browser should call /api/v1/payments/sumup/create-checkout" | tee -a "$OUT"

echo | tee -a "$OUT"
echo "DONE -> $OUT" | tee -a "$OUT"
