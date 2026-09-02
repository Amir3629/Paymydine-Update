'use client'

import { useEffect } from 'react'

const WORLDLINE_INLINE_HOST = 'data-pmd-worldline-inline-host'
const WORLDLINE_HIDDEN_PAY = 'data-pmd-worldline-hidden-pay-button'
const AUTO_START_ATTRIBUTE = 'data-pmd-worldline-auto-start'

function normalizeMethod(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function methodFromButton(button: HTMLButtonElement): string | null {
  const text = String(button.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null
  if (text.includes('apple pay')) return 'apple_pay'
  if (text.includes('google pay')) return 'google_pay'
  if (text.includes('paypal')) return 'paypal'
  if (text.includes('wero')) return 'wero'
  if (text.includes('card / wallet') || text === 'card' || text.includes('card /')) return 'card'
  return null
}

function paymentLabel(code: string): string {
  if (code === 'apple_pay') return 'Apple Pay'
  if (code === 'google_pay') return 'Google Pay'
  if (code === 'paypal') return 'PayPal'
  if (code === 'wero') return 'Wero'
  return 'Card / Wallet'
}

function directButtons(element: Element): HTMLButtonElement[] {
  return Array.from(element.children).filter((child): child is HTMLButtonElement => child instanceof HTMLButtonElement)
}

function findMethodGrid(panel: HTMLElement): HTMLElement | null {
  const candidates = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  for (const candidate of candidates) {
    const buttons = directButtons(candidate)
    if (buttons.some((button) => Boolean(methodFromButton(button)))) return candidate
  }
  return null
}

function looksLikeTotalCard(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (directButtons(element).length) return false
  const rows = Array.from(element.children).filter((child) => child instanceof HTMLDivElement)
  return rows.length >= 2 && Boolean(element.querySelector('strong'))
}

// Visual ordering only. Never move/remove/replace React-owned nodes.
function applyPaymentVisualOrder(panel: HTMLElement) {
  const children = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  children.forEach((child, index) => child.style.setProperty('order', String(index * 10)))

  const methodGrid = findMethodGrid(panel)
  if (!methodGrid) return
  const totalCard = methodGrid.nextElementSibling
  if (!looksLikeTotalCard(totalCard)) return

  const methodOrder = methodGrid.style.order
  const totalOrder = totalCard.style.order
  methodGrid.style.setProperty('order', totalOrder)
  totalCard.style.setProperty('order', methodOrder)
}

function genericPayButton(panel: HTMLElement): HTMLButtonElement | null {
  const buttons = directButtons(panel)
  return buttons.length ? buttons[buttons.length - 1] : null
}

function markImmediatePaymentAction(panel: HTMLElement, methodCode: string) {
  if (panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)) return
  const button = genericPayButton(panel)
  if (!button || button.hasAttribute(WORLDLINE_HIDDEN_PAY)) return

  if (!button.dataset.pmdWlOriginalAria) {
    button.dataset.pmdWlOriginalAria = button.getAttribute('aria-label') || ''
  }
  button.setAttribute('data-pmd-worldline-action', 'true')
  button.setAttribute('data-pmd-worldline-action-label', paymentLabel(methodCode))
  button.setAttribute('aria-label', paymentLabel(methodCode))
}

function restoreImmediatePaymentAction(panel: HTMLElement) {
  const button = genericPayButton(panel)
  if (!button || !button.hasAttribute('data-pmd-worldline-action')) return

  const originalAria = button.dataset.pmdWlOriginalAria || ''
  if (originalAria) button.setAttribute('aria-label', originalAria)
  else button.removeAttribute('aria-label')
  delete button.dataset.pmdWlOriginalAria
  button.removeAttribute('data-pmd-worldline-action')
  button.removeAttribute('data-pmd-worldline-action-label')
}

function triggerSelectedPayment(panel: HTMLElement, attempt = 0) {
  const button = genericPayButton(panel)
  if (!button || button.hasAttribute(WORLDLINE_HIDDEN_PAY) || button.disabled) {
    if (attempt < 10) window.setTimeout(() => triggerSelectedPayment(panel, attempt + 1), 40)
    return
  }

  // This marker is also understood by WorldlineEmbeddedCheckoutBridge, so its
  // slower runtime-method discovery cannot trigger a duplicate click later.
  button.removeAttribute(AUTO_START_ATTRIBUTE)
  button.setAttribute(AUTO_START_ATTRIBUTE, 'true')
  button.click()

  window.setTimeout(() => {
    if (!panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)) {
      button.removeAttribute(AUTO_START_ATTRIBUTE)
    }
  }, 15000)
}

function isReadyNoise(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized) return false
  return normalized.includes('is ready inside paymydine')
    || normalized.includes('authorization is ready inside paymydine')
    || normalized.includes('authorization opened securely')
    || normalized.includes('opened securely. complete authorization')
    || normalized.includes('enter your card details below')
    || normalized.includes('card data is encrypted by worldline')
    || normalized.includes('submitted. confirming with worldline')
    || normalized.includes('payment session ready')
}

function hideNonEssentialReadyMessages(panel: HTMLElement) {
  for (const candidate of Array.from(panel.querySelectorAll<HTMLElement>(':scope > div'))) {
    if (candidate.hasAttribute(WORLDLINE_INLINE_HOST)) continue
    if (isReadyNoise(String(candidate.textContent || ''))) candidate.style.setProperty('display', 'none')
  }
}

function compactWalletAndAuthorizationSurfaces() {
  for (const wallet of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-native-wallet]'))) {
    wallet.style.setProperty('border', '0', 'important')
    wallet.style.setProperty('background', 'transparent', 'important')
    wallet.style.setProperty('padding', '0', 'important')
    wallet.style.setProperty('margin', '0', 'important')
    wallet.style.setProperty('gap', '8px', 'important')

    for (const child of Array.from(wallet.children).filter((value): value is HTMLElement => value instanceof HTMLElement)) {
      if (child.tagName === 'STYLE' || child.matches('[role="alert"]')) continue
      const text = String(child.textContent || '').replace(/\s+/g, ' ').trim()
      if (/secure worldline own-checkout inside paymydine/i.test(text)
        || /wallet credential is tokenized/i.test(text)
        || /paymydine never receives raw card data/i.test(text)
        || /^preparing\s+(apple pay|google pay)/i.test(text)) {
        child.style.setProperty('display', 'none')
      }
      if (child.matches('[role="status"]') && !/cancel|fail|error|declin|reject/i.test(text)) {
        child.style.setProperty('display', 'none')
      }
    }

    const googleButton = Array.from(wallet.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => !button.classList.contains('pmd-worldline-apple-pay-button'))
    if (googleButton) {
      googleButton.setAttribute('data-pmd-worldline-final', 'google-pay')
      googleButton.style.setProperty('background', 'var(--pmd-text, #ffffff)', 'important')
      googleButton.style.setProperty('color', 'var(--pmd-control, #070707)', 'important')
      googleButton.style.setProperty('border-radius', '999px', 'important')
      googleButton.style.setProperty('min-height', '54px', 'important')
    }
  }

  for (const auth of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-embedded^="pmd-authorization-"]'))) {
    auth.style.setProperty('border', '0', 'important')
    auth.style.setProperty('background', 'transparent', 'important')
    auth.style.setProperty('padding', '0', 'important')
    auth.style.setProperty('margin', '0', 'important')
    auth.style.setProperty('gap', '8px', 'important')

    const button = Array.from(auth.children).find((child): child is HTMLButtonElement => child instanceof HTMLButtonElement) || null
    for (const child of Array.from(auth.children).filter((value): value is HTMLElement => value instanceof HTMLElement)) {
      if (child === button) continue
      if (child.matches('[role="status"]')) {
        const text = String(child.textContent || '')
        if (!/cancel|fail|error|declin|reject/i.test(text)) child.style.setProperty('display', 'none')
        continue
      }
      child.style.setProperty('display', 'none')
    }
    if (button) button.setAttribute('data-pmd-worldline-final', 'authorization')
  }
}

export function PaymentCheckoutUXEnhancer() {
  useEffect(() => {
    let disposed = false
    let scheduled = false
    const activeMethod = new WeakMap<HTMLElement, string>()

    const sync = () => {
      for (const panel of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id], [data-pmd-multi-order-payment="r32"]'))) {
        applyPaymentVisualOrder(panel)
        hideNonEssentialReadyMessages(panel)
        const method = activeMethod.get(panel)
        if (method) markImmediatePaymentAction(panel, method)
      }
      compactWalletAndAuthorizationSurfaces()
    }

    const schedule = () => {
      if (disposed || scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        if (!disposed) sync()
      })
    }

    const onClick = (event: MouseEvent) => {
      if (disposed) return
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest<HTMLButtonElement>('button') || null
      if (!button) return
      const panel = button.closest<HTMLElement>('[data-pmd-payment-order-id]')
      if (!panel) return
      const grid = findMethodGrid(panel)
      if (!grid || button.parentElement !== grid) return

      const methodCode = methodFromButton(button)
      if (methodCode) {
        activeMethod.set(panel, normalizeMethod(methodCode))
        markImmediatePaymentAction(panel, methodCode)
        // React handles the methodKey update during this click. Two animation
        // frames later pay() sees the selected provider/method and starts it.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (!disposed) triggerSelectedPayment(panel)
          })
        })
      } else {
        activeMethod.delete(panel)
        restoreImmediatePaymentAction(panel)
      }
      schedule()
    }

    const observer = new MutationObserver(schedule)
    sync()
    document.addEventListener('click', onClick, true)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  return (
    <style>{`
      [data-pmd-payment-order-id],
      [data-pmd-multi-order-payment="r32"] {
        --pmd-wl-action-bg: var(--pmd-text, #ffffff);
        --pmd-wl-action-fg: var(--pmd-control, #070707);
      }

      [data-pmd-worldline-action="true"],
      [data-pmd-worldline-final] {
        width: 100% !important;
        min-height: 54px !important;
        border-radius: 999px !important;
        border: 1px solid color-mix(in srgb, var(--pmd-wl-action-bg) 88%, transparent) !important;
        background: var(--pmd-wl-action-bg) !important;
        color: var(--pmd-wl-action-fg) !important;
        box-sizing: border-box !important;
        font-size: 0 !important;
        font-weight: 800 !important;
      }

      [data-pmd-worldline-action="true"] > *,
      [data-pmd-worldline-final] > * {
        display: none !important;
      }

      [data-pmd-worldline-action="true"]::before,
      [data-pmd-worldline-final]::before {
        content: '';
        display: inline-block;
        width: 18px;
        height: 12px;
        margin-inline-end: 10px;
        border: 2px solid currentColor;
        border-radius: 3px;
        box-sizing: border-box;
        vertical-align: -1px;
      }

      [data-pmd-worldline-action="true"]::after {
        content: attr(data-pmd-worldline-action-label);
        font-size: 17px;
        font-weight: 800;
      }

      [data-pmd-worldline-action="true"][disabled]::before {
        width: 17px;
        height: 17px;
        border-radius: 50%;
        border-right-color: transparent;
        animation: pmdWlSafeSpin .7s linear infinite;
      }

      @keyframes pmdWlSafeSpin { to { transform: rotate(360deg); } }

      [data-pmd-worldline-native-card] {
        border: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 10px !important;
      }

      [data-pmd-worldline-native-card] > div:first-of-type,
      [data-pmd-worldline-native-card] > div:last-child {
        display: none !important;
      }

      [data-pmd-worldline-native-card] label {
        font-size: 0 !important;
        gap: 0 !important;
        margin: 0 !important;
      }

      [data-pmd-worldline-native-card] input {
        height: 48px !important;
        font-size: 16px !important;
      }

      [data-pmd-worldline-native-card] button[type="submit"],
      [data-pmd-worldline-embedded^="pmd-authorization-"] > button {
        width: 100% !important;
        min-height: 54px !important;
        border-radius: 999px !important;
        background: var(--pmd-text, #ffffff) !important;
        color: var(--pmd-control, #070707) !important;
        border: 1px solid var(--pmd-text, #ffffff) !important;
      }

      [data-pmd-worldline-native-wallet^="own-checkout-apple_pay"] .pmd-worldline-apple-pay-button {
        -apple-pay-button-style: white !important;
        border-radius: 999px !important;
        min-height: 54px !important;
      }

      [data-pmd-worldline-embedded^="native-wallet-"] > [role="status"] {
        display: none !important;
      }
    `}</style>
  )
}
