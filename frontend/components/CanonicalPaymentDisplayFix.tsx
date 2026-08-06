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

function readOrderId(root: ParentNode): string {
  const orderLine = findLine(root, ["Order number"])
  const visible = String(orderLine?.querySelector(":scope > strong")?.textContent ?? "")
    .replace(/[^0-9]/g, "")
  if (visible) return visible

  try {
    return String(localStorage.getItem("lastOrderId") ?? "").replace(/[^0-9]/g, "")
  } catch {
    return ""
  }
}

function saveBreakdown(value: PaymentBreakdown): void {
  if (!value.orderId) return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + value.orderId, JSON.stringify(value))
  } catch {
    // Session storage is an optional enhancement only.
  }
}

function loadBreakdown(orderId: string): PaymentBreakdown | null {
  if (!orderId) return null
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + orderId) || "null")
    return parsed && typeof parsed === "object" ? parsed as PaymentBreakdown : null
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

  const orderId = readOrderId(root)

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

  const orderId = readOrderId(paidBox) || latest?.orderId || ""
  const breakdown = loadBreakdown(orderId) ?? (latest?.orderId === orderId ? latest : null)
  if (!breakdown || breakdown.baseAmount <= 0) return

  const signature = JSON.stringify([
    breakdown.orderId,
    breakdown.baseAmount,
    breakdown.vatAmount,
    breakdown.vatLabel,
    breakdown.tipAmount,
    breakdown.couponAmount,
    breakdown.couponLabel,
    breakdown.paidAmount,
  ])
  if (paidBox.dataset.pmdCanonicalPaymentSignature === signature) return

  paidBox.querySelectorAll('[data-pmd-canonical-payment-line="1"]').forEach((node) => node.remove())

  const fragment = document.createDocumentFragment()
  fragment.append(createSummaryLine("Items subtotal (incl. VAT)", breakdown.baseAmount))
  if (breakdown.vatAmount > 0) {
    fragment.append(createSummaryLine(breakdown.vatLabel || "Included VAT", breakdown.vatAmount))
  }
  if (breakdown.tipAmount > 0) {
    fragment.append(createSummaryLine("Tip", breakdown.tipAmount))
  }
  if (breakdown.couponAmount > 0) {
    fragment.append(createSummaryLine(breakdown.couponLabel || "Coupon", breakdown.couponAmount, true))
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
