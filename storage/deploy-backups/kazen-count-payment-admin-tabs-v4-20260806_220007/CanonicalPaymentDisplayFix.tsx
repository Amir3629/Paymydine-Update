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

const KAZEN_POLISH_STYLE_ID = "pmd-kazen-order-flow-polish-v1"
let latestKazenCartQuantities = new Map<string, number>()

function normalizeItemName(value: string | null | undefined): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}

function installKazenPolishStyles(): void {
  if (document.getElementById(KAZEN_POLISH_STYLE_ID)) return

  const style = document.createElement("style")
  style.id = KAZEN_POLISH_STYLE_ID
  style.textContent = `
    /* PMD_KAZEN_ORDER_FLOW_DOM_POLISH_V1 */
    html body .kazen-page .kazen-item > button.kazen-add.has-selected-count {
      background:#b85d59 !important;
      background-color:#b85d59 !important;
      border-color:#a84f4c !important;
      color:#fffaf2 !important;
      -webkit-text-fill-color:#fffaf2 !important;
      transform:none !important;
    }
    html body .kazen-page .kazen-item > button.kazen-add .kazen-add-count {
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      width:100% !important;
      height:100% !important;
      font:900 1.05rem/1 Inter,ui-sans-serif,system-ui,sans-serif !important;
      color:currentColor !important;
      -webkit-text-fill-color:currentColor !important;
    }
    html body .kzco-overlay[data-kzco-root="1"] .pmd-kzco-final-total {
      margin-top:.35rem !important;
      padding-top:1rem !important;
      border-top:1px solid var(--kzco-panel-line,rgba(36,35,32,.18)) !important;
    }
    html body .kzco-overlay[data-kzco-root="1"] .kzco-review-card[data-pmd-review-locked="1"] :is(.kzco-stars button,.kzco-review-textarea) {
      cursor:default !important;
      opacity:.78 !important;
    }
  `
  document.head.appendChild(style)
}

function plusIconMarkup(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus h-5 w-5" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>'
}

function applySelectedItemCounts(): void {
  document.querySelectorAll<HTMLButtonElement>(".kazen-page .kazen-item button.kazen-add").forEach((button) => {
    const item = button.closest<HTMLElement>(".kazen-item")
    const visibleName = item?.querySelector<HTMLElement>(".kazen-item-name")?.textContent
    const fallbackName = String(button.dataset.pmdItemName || button.getAttribute("aria-label") || "")
      .replace(/^Add\s+/i, "")
      .replace(/^\d+\s+/, "")
      .replace(/\s+selected.*$/i, "")
    const itemName = String(visibleName || fallbackName || "").trim()
    if (!itemName) return

    button.dataset.pmdItemName = itemName
    const quantity = Math.max(0, Number(latestKazenCartQuantities.get(normalizeItemName(itemName)) || 0))
    const renderedQuantity = Number(button.dataset.selectedQuantity || 0)

    if (quantity > 0) {
      button.classList.add("has-selected-count")
      button.dataset.selectedQuantity = String(quantity)
      button.setAttribute("aria-label", `${quantity} ${itemName} selected. Add one more.`)
      if (renderedQuantity !== quantity || !button.querySelector(".kazen-add-count")) {
        button.innerHTML = `<span class="kazen-add-count" aria-hidden="true">${quantity}</span>`
      }
      return
    }

    button.classList.remove("has-selected-count")
    delete button.dataset.selectedQuantity
    button.setAttribute("aria-label", `Add ${itemName}`)
    if (!button.querySelector("svg")) button.innerHTML = plusIconMarkup()
  })
}

function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

function mirrorTipPresetIntoCustomField(button: HTMLElement): void {
  const root = button.closest<HTMLElement>('.kzco-overlay[data-kzco-root="1"]')
  if (!root) return

  const percentage = Number(String(button.textContent || "").replace(/[^0-9.-]/g, ""))
  if (!Number.isFinite(percentage) || percentage < 0) return

  const itemsLine = findLine(root, ["Items total", "Items subtotal (incl. VAT)", "Share amount", "Share amount (incl. VAT)"])
  const input = root.querySelector<HTMLInputElement>('.kzco-tip-custom-wrap input[data-pmd-kazen-tip-custom-input-v36="1"], .kzco-tip-custom-wrap input')
  if (!itemsLine || !input) return

  const baseAmount = lineAmount(itemsLine)
  const tipAmount = Math.round((baseAmount * percentage / 100) * 100) / 100
  setNativeInputValue(input, tipAmount.toFixed(2))
}

function checkoutTitle(root: ParentNode): string {
  return String(root.querySelector<HTMLElement>(".kzco-title-wrap h2")?.textContent || "").trim().toLowerCase()
}

function polishOrderFlowLayout(root: HTMLElement): void {
  const title = checkoutTitle(root)
  const summary = root.querySelector<HTMLElement>(".kzco-summary")
  const totalBox = root.querySelector<HTMLElement>(".kzco-total-box")

  if (totalBox && (
    title === "my order" ||
    title === "table order" ||
    title === "we received your order." ||
    title === "payment confirmed."
  )) {
    totalBox.classList.add("pmd-kzco-final-total")
  }

  if (summary && totalBox && (title === "we received your order." || title === "payment confirmed.")) {
    if (summary.nextElementSibling !== totalBox) summary.insertAdjacentElement("afterend", totalBox)
  }
}

function lockSubmittedReview(root: HTMLElement): void {
  const card = root.querySelector<HTMLElement>('.kzco-review-card[aria-label="Visit feedback"]')
  if (!card) return

  const submit = card.querySelector<HTMLButtonElement>(".kzco-review-submit")
  const locked = Boolean(submit?.disabled && /review submitted/i.test(String(submit.textContent || "")))
    || /already submitted|already sent|review was sent/i.test(String(card.textContent || ""))

  if (!locked) return
  card.dataset.pmdReviewLocked = "1"
  card.querySelectorAll<HTMLButtonElement>(".kzco-stars button").forEach((button) => { button.disabled = true })
  const textarea = card.querySelector<HTMLTextAreaElement>(".kzco-review-textarea")
  if (textarea) {
    textarea.disabled = true
    textarea.readOnly = true
  }
}

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

  const canonicalItemLabel = isShare ? "Share amount" : "Items subtotal"
  const canonicalItemValue = formatMoney(grossAmount)
  const canonicalVatLabel = "VAT (19%)"

  if (itemLabel && itemLabel.textContent !== canonicalItemLabel) itemLabel.textContent = canonicalItemLabel
  if (itemValue && grossAmount > 0 && itemValue.textContent !== canonicalItemValue) itemValue.textContent = canonicalItemValue
  if (vatLabel && vatLabel.textContent !== canonicalVatLabel) vatLabel.textContent = canonicalVatLabel

  const orderId = readVisibleOrderId(root)

  const breakdown: PaymentBreakdown = {
    orderId,
    baseAmount: grossAmount,
    vatAmount,
    vatLabel: String(vatLabel?.textContent ?? "VAT (19%)").trim(),
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

  // PMD_PAYMENT_LABELS_DEDUP_V3
  paidBox.querySelectorAll('[data-pmd-canonical-payment-line="1"]').forEach((node) => node.remove())

  // The native confirmation card may already contain its own subtotal/VAT/tip
  // rows. Remove those financial rows before inserting the canonical version,
  // otherwise the customer sees the same breakdown twice.
  const replaceableLabels = new Set([
    "Items total",
    "Items subtotal",
    "Items subtotal (incl. VAT)",
    "VAT included",
    "VAT included (19%)",
    "Included VAT",
    "Included VAT (19%)",
    "VAT (19%)",
    "Tip",
    "Coupon",
  ])

  Array.from(paidBox.querySelectorAll<HTMLElement>(".kzco-line")).forEach((line) => {
    if (line !== amountLine && replaceableLabels.has(lineLabel(line))) {
      line.remove()
    }
  })

  const fragment = document.createDocumentFragment()
  fragment.append(createSummaryLine("Items subtotal", normalizedBreakdown.baseAmount))
  if (normalizedBreakdown.vatAmount > 0) {
    fragment.append(createSummaryLine("VAT (19%)", normalizedBreakdown.vatAmount))
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
      installKazenPolishStyles()
      applySelectedItemCounts()
      document.querySelectorAll<HTMLElement>('.kzco-overlay[data-kzco-root="1"]').forEach((root) => {
        latest = fixPaymentSummary(root) ?? latest
        polishOrderFlowLayout(root)
        fixPaidSummary(root, latest)
        polishOrderFlowLayout(root)
        lockSubmittedReview(root)
      })
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const payload = event.data
      if (!payload || typeof payload !== "object" || String(payload.type || "") !== "PMD_KAZEN_SYNC") return

      const quantities = new Map<string, number>()
      const lines = Array.isArray(payload?.cart?.lines) ? payload.cart.lines : []
      lines.forEach((line: any) => {
        const name = normalizeItemName(line?.name)
        if (!name) return
        quantities.set(name, (quantities.get(name) || 0) + Math.max(0, Number(line?.quantity || 0)))
      })
      latestKazenCartQuantities = quantities
      schedule()
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const tipButton = target?.closest<HTMLElement>(".kzco-tip-preset")
      if (!tipButton) return
      window.requestAnimationFrame(() => mirrorTipPresetIntoCustomField(tipButton))
    }

    window.addEventListener("message", onMessage)
    document.addEventListener("click", onClick, true)

    const observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    schedule()

    return () => {
      observer.disconnect()
      window.removeEventListener("message", onMessage)
      document.removeEventListener("click", onClick, true)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
