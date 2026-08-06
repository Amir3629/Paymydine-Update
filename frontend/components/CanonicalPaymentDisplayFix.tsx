"use client"

import { useEffect } from "react"

type PaymentBreakdown = {
  orderId: string
  baseAmount: number
  vatAmount: number
  vatLabel: string
  tipAmount: number
  couponAmount: number
  couponLabel: string
  paidAmount: number
}

const STORAGE_PREFIX = "pmd:canonical-payment-breakdown:"
const PENDING_STORAGE_KEY = `${STORAGE_PREFIX}pending`

function parseMoney(value: string | null | undefined): number {
  let normalized = String(value ?? "").replace(/[^0-9,.-]/g, "")
  const lastComma = normalized.lastIndexOf(",")
  const lastDot = normalized.lastIndexOf(".")

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "")
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".")
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

function formatMoney(value: number): string {
  return `€${Math.max(0, value).toFixed(2)}`
}

function lineLabel(line: Element): string {
  return String(line.querySelector(":scope > span")?.textContent ?? "").trim()
}

function lineAmount(line: Element): number {
  return parseMoney(line.querySelector(":scope > strong")?.textContent)
}

function findLine(root: ParentNode, labels: string[]): HTMLElement | null {
  for (const line of Array.from(root.querySelectorAll<HTMLElement>(".kzco-line"))) {
    if (labels.includes(lineLabel(line))) return line
  }
  return null
}

function readVisibleOrderId(root: ParentNode): string {
  const orderLine = findLine(root, ["Order number"])
  return String(orderLine?.querySelector(":scope > strong")?.textContent ?? "")
    .replace(/[^0-9]/g, "")
}

function readLastOrderId(): string {
  try {
    return String(localStorage.getItem("lastOrderId") ?? "").replace(/[^0-9]/g, "")
  } catch {
    return ""
  }
}

function saveBreakdown(value: PaymentBreakdown): void {
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(value))
    if (value.orderId) {
      sessionStorage.setItem(STORAGE_PREFIX + value.orderId, JSON.stringify(value))
    }
  } catch {
    // Session storage is an optional enhancement only.
  }
}

function loadBreakdown(orderId: string): PaymentBreakdown | null {
  try {
    if (orderId) {
      const exact = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + orderId) || "null")
      if (exact && typeof exact === "object") return exact as PaymentBreakdown
    }

    const pending = JSON.parse(sessionStorage.getItem(PENDING_STORAGE_KEY) || "null")
    if (!pending || typeof pending !== "object") return null

    const normalized = {
      ...(pending as PaymentBreakdown),
      orderId: orderId || String((pending as PaymentBreakdown).orderId || ""),
    }

    if (orderId) {
      sessionStorage.setItem(STORAGE_PREFIX + orderId, JSON.stringify(normalized))
    }

    return normalized
  } catch {
    return null
  }
}

function createSummaryLine(label: string, value: number, discount = false): HTMLDivElement {
  const line = document.createElement("div")
  line.className = discount ? "kzco-line kzco-discount" : "kzco-line"
  line.dataset.pmdCanonicalPaymentLine = "1"

  const labelNode = document.createElement("span")
  labelNode.textContent = label

  const amountNode = document.createElement("strong")
  amountNode.textContent = `${discount ? "-" : ""}${formatMoney(value)}`

  line.append(labelNode, amountNode)
  return line
}

function fixPaymentSummary(root: HTMLElement): PaymentBreakdown | null {
  const itemsLine = findLine(root, ["Items total", "Items subtotal (incl. VAT)", "Share amount", "Share amount (incl. VAT)"])
  const vatLine = findLine(root, ["VAT included (19%)", "VAT included", "Included VAT (19%)", "Included VAT"])
  const payableLine = findLine(root, ["Payable total"])

  if (!itemsLine || !vatLine || !payableLine) return null

  const currentItemsLabel = lineLabel(itemsLine)
  const itemsAmount = lineAmount(itemsLine)
  const vatAmount = lineAmount(vatLine)
  const tipLine = findLine(root, ["Tip"])
  const couponLine = findLine(root, ["Coupon"])
  const tipAmount = tipLine ? lineAmount(tipLine) : 0
  const couponAmount = couponLine ? lineAmount(couponLine) : 0
  const payableAmount = lineAmount(payableLine)
  const equationGross = Math.max(0, payableAmount - tipAmount + couponAmount)
  const fallbackGross = currentItemsLabel.includes("incl. VAT")
    ? itemsAmount
    : itemsAmount + vatAmount
  const grossAmount = Math.round((equationGross > 0 ? equationGross : fallbackGross) * 100) / 100
  const isShare = currentItemsLabel.toLowerCase().startsWith("share")

  const itemLabel = itemsLine.querySelector(":scope > span")
  const itemValue = itemsLine.querySelector(":scope > strong")
  const vatLabel = vatLine.querySelector(":scope > span")

  const canonicalItemLabel = isShare ? "Share amount (incl. VAT)" : "Items subtotal (incl. VAT)"
  const canonicalItemValue = formatMoney(grossAmount)
  const canonicalVatLabel = lineLabel(vatLine).replace(/^VAT included/, "Included VAT")

  if (itemLabel && itemLabel.textContent !== canonicalItemLabel) itemLabel.textContent = canonicalItemLabel
  if (itemValue && grossAmount > 0 && itemValue.textContent !== canonicalItemValue) itemValue.textContent = canonicalItemValue
  if (vatLabel && vatLabel.textContent !== canonicalVatLabel) vatLabel.textContent = canonicalVatLabel

  // Before payment succeeds there is no current order number in this modal.
  // Never attach the breakdown to a stale localStorage lastOrderId; keep it as
  // a pending checkout breakdown and bind it to the visible order after success.
  const orderId = readVisibleOrderId(root)

  const breakdown: PaymentBreakdown = {
    orderId,
    baseAmount: grossAmount,
    vatAmount,
    vatLabel: String(vatLabel?.textContent ?? "Included VAT").trim(),
    tipAmount,
    couponAmount,
    couponLabel: couponLine ? lineLabel(couponLine) : "Coupon",
    paidAmount: payableAmount,
  }

  saveBreakdown(breakdown)
  root.dataset.pmdCanonicalPaymentDisplay = "payment"
  return breakdown
}

function fixPaidSummary(root: HTMLElement, latest: PaymentBreakdown | null): void {
  const paidBox = root.querySelector<HTMLElement>(".kzco-paid-total-box")
  if (!paidBox) return

  const amountLine = findLine(paidBox, ["Amount paid"])
  if (!amountLine) return

  const orderId = readVisibleOrderId(paidBox) || readLastOrderId() || latest?.orderId || ""
  const breakdown = loadBreakdown(orderId) ?? latest
  if (!breakdown || breakdown.baseAmount <= 0) return

  const normalizedBreakdown = {
    ...breakdown,
    orderId: orderId || breakdown.orderId,
  }
  saveBreakdown(normalizedBreakdown)

  const signature = JSON.stringify([
    normalizedBreakdown.orderId,
    normalizedBreakdown.baseAmount,
    normalizedBreakdown.vatAmount,
    normalizedBreakdown.vatLabel,
    normalizedBreakdown.tipAmount,
    normalizedBreakdown.couponAmount,
    normalizedBreakdown.couponLabel,
    normalizedBreakdown.paidAmount,
  ])
  if (paidBox.dataset.pmdCanonicalPaymentSignature === signature) return

  paidBox.querySelectorAll('[data-pmd-canonical-payment-line="1"]').forEach((node) => node.remove())

  const fragment = document.createDocumentFragment()
  fragment.append(createSummaryLine("Items subtotal (incl. VAT)", normalizedBreakdown.baseAmount))
  if (normalizedBreakdown.vatAmount > 0) {
    fragment.append(createSummaryLine(normalizedBreakdown.vatLabel || "Included VAT", normalizedBreakdown.vatAmount))
  }
  if (normalizedBreakdown.tipAmount > 0) {
    fragment.append(createSummaryLine("Tip", normalizedBreakdown.tipAmount))
  }
  if (normalizedBreakdown.couponAmount > 0) {
    fragment.append(createSummaryLine(normalizedBreakdown.couponLabel || "Coupon", normalizedBreakdown.couponAmount, true))
  }

  paidBox.insertBefore(fragment, amountLine)
  paidBox.dataset.pmdCanonicalPaymentSignature = signature
  root.dataset.pmdCanonicalPaymentDisplay = "paid"
}

export default function CanonicalPaymentDisplayFix() {
  useEffect(() => {
    let latest: PaymentBreakdown | null = null
    let frame = 0

    const apply = () => {
      frame = 0
      document.querySelectorAll<HTMLElement>('.kzco-overlay[data-kzco-root="1"]').forEach((root) => {
        latest = fixPaymentSummary(root) ?? latest
        fixPaidSummary(root, latest)
      })
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    const observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    schedule()

    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
