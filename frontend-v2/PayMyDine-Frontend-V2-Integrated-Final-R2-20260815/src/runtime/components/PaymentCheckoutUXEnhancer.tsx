'use client'

import { useEffect } from 'react'

const WORLDLINE_RUNTIME_METHODS = '/api/v1/payments/worldline/runtime-methods'
const WORLDLINE_INLINE_HOST = 'data-pmd-worldline-inline-host'
const FAST_PLACEHOLDER = 'data-pmd-worldline-fast-placeholder'
const FAST_HIDDEN_PAY = 'data-pmd-worldline-fast-hidden-pay'
const GOOGLE_PAY_SCRIPT = 'https://pay.google.com/gp/p/js/pay.js'

function normalizeMethod(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function methodFromButton(button: HTMLButtonElement): string | null {
  const dataCode = normalizeMethod(button.dataset.pmdPaymentMethodCode)
  if (dataCode) return dataCode

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
    if (!buttons.length) continue
    const paymentButtons = buttons.filter((button) => Boolean(methodFromButton(button)))
    if (paymentButtons.length >= 1) return candidate
  }
  return null
}

function looksLikeTotalCard(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (directButtons(element).length) return false
  const rows = Array.from(element.children).filter((child) => child instanceof HTMLDivElement)
  if (rows.length < 2) return false
  return Boolean(element.querySelector('strong'))
}

function moveMethodsBelowTotal(panel: HTMLElement): HTMLElement | null {
  const methodGrid = findMethodGrid(panel)
  if (!methodGrid) return null

  const next = methodGrid.nextElementSibling
  if (looksLikeTotalCard(next)) {
    next.insertAdjacentElement('afterend', methodGrid)
  }

  return methodGrid
}

function genericDirectPayButton(panel: HTMLElement): HTMLButtonElement | null {
  const direct = directButtons(panel)
  if (!direct.length) return null
  return direct[direct.length - 1] || null
}

function restoreFastHiddenPay(panel: HTMLElement) {
  const hidden = panel.querySelector<HTMLButtonElement>(`:scope > button[${FAST_HIDDEN_PAY}="true"]`)
  if (!hidden) return
  hidden.style.removeProperty('display')
  hidden.removeAttribute(FAST_HIDDEN_PAY)
}

function removeFastPlaceholder(panel: HTMLElement, restorePay = false) {
  const placeholder = panel.querySelector<HTMLElement>(`:scope > [${FAST_PLACEHOLDER}="true"]`)
  placeholder?.remove()
  if (restorePay) restoreFastHiddenPay(panel)
}

function showFastPlaceholder(panel: HTMLElement, methodCode: string) {
  removeFastPlaceholder(panel, true)
  const methodGrid = moveMethodsBelowTotal(panel)
  if (!methodGrid) return

  const genericPay = genericDirectPayButton(panel)
  if (genericPay) {
    genericPay.setAttribute(FAST_HIDDEN_PAY, 'true')
    genericPay.style.display = 'none'
  }

  const host = document.createElement('div')
  host.setAttribute(FAST_PLACEHOLDER, 'true')
  host.style.width = '100%'
  host.style.minWidth = '0'
  host.style.margin = '0'
  host.style.padding = '0'

  const button = document.createElement('button')
  button.type = 'button'
  button.disabled = true
  button.setAttribute('aria-label', `${paymentLabel(methodCode)} is preparing`)
  button.textContent = paymentLabel(methodCode)
  button.style.width = '100%'
  button.style.height = '54px'
  button.style.border = '0'
  button.style.borderRadius = '999px'
  button.style.padding = '0 18px'
  button.style.background = 'var(--pmd-accent, #ff1f70)'
  button.style.color = 'var(--pmd-accentText, #fff)'
  button.style.font = 'inherit'
  button.style.fontSize = '17px'
  button.style.fontWeight = '800'
  button.style.opacity = '.62'
  button.style.cursor = 'wait'

  host.appendChild(button)
  methodGrid.insertAdjacentElement('afterend', host)

  window.setTimeout(() => {
    if (!host.isConnected) return
    const worldlineHost = panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)
    if (worldlineHost) {
      host.remove()
      return
    }
    host.remove()
    restoreFastHiddenPay(panel)
  }, 15000)
}

function isReadyNoise(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized) return false
  return normalized.includes('is ready inside paymydine')
    || normalized.includes('authorization is ready inside paymydine')
    || normalized.includes('authorization opened securely')
}

function hideReadyNoise(panel: HTMLElement) {
  const candidates = Array.from(panel.querySelectorAll<HTMLElement>(':scope > div'))
  for (const candidate of candidates) {
    if (candidate.hasAttribute(WORLDLINE_INLINE_HOST)) continue
    if (isReadyNoise(String(candidate.textContent || ''))) candidate.style.display = 'none'
  }
}

function compactWalletPanel(panel: HTMLElement) {
  panel.style.setProperty('border', '0', 'important')
  panel.style.setProperty('background', 'transparent', 'important')
  panel.style.setProperty('padding', '0', 'important')
  panel.style.setProperty('gap', '8px', 'important')

  const methodCode = normalizeMethod(panel.getAttribute('data-pmd-worldline-native-wallet')?.includes('apple_pay') ? 'apple_pay' : 'google_pay')
  const label = paymentLabel(methodCode)
  const children = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)

  for (const child of children) {
    if (child.tagName === 'STYLE') continue
    const text = String(child.textContent || '').replace(/\s+/g, ' ').trim()

    if (child.matches('[role="alert"]')) continue

    if (child.matches('[role="status"]')) {
      child.style.display = 'none'
      continue
    }

    if (/secure worldline own-checkout inside paymydine/i.test(text)) {
      child.style.display = 'none'
      continue
    }

    if (/wallet credential is tokenized/i.test(text) || /paymydine never receives raw card data/i.test(text)) {
      child.style.display = 'none'
      continue
    }

    if (/^preparing\s+(apple pay|google pay)/i.test(text)) {
      child.textContent = label
      child.style.minHeight = '52px'
      child.style.display = 'grid'
      child.style.placeItems = 'center'
      child.style.borderRadius = '999px'
      child.style.background = 'var(--pmd-accent, #ff1f70)'
      child.style.color = 'var(--pmd-accentText, #fff)'
      child.style.fontSize = '17px'
      child.style.fontWeight = '800'
      child.style.opacity = '.62'
    }
  }
}

function compactAuthorizationPanel(panel: HTMLElement) {
  panel.style.setProperty('border', '0', 'important')
  panel.style.setProperty('background', 'transparent', 'important')
  panel.style.setProperty('padding', '0', 'important')
  panel.style.setProperty('gap', '8px', 'important')

  const children = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  for (const child of children) {
    if (child instanceof HTMLButtonElement) continue
    if (child.matches('[role="status"]')) {
      const text = String(child.textContent || '')
      child.style.display = isReadyNoise(text) ? 'none' : child.style.display
      continue
    }
    child.style.display = 'none'
  }
}

function preloadGooglePay() {
  if (document.querySelector(`script[src="${GOOGLE_PAY_SCRIPT}"]`)) return
  const script = document.createElement('script')
  script.src = GOOGLE_PAY_SCRIPT
  script.async = true
  script.dataset.pmdGooglePayPreload = 'payment-ux-v1'
  document.head.appendChild(script)
}

function syncCheckoutDom() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id], [data-pmd-multi-order-payment="r32"]'))
  for (const panel of panels) {
    moveMethodsBelowTotal(panel)
    hideReadyNoise(panel)

    const worldlineHost = panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)
    if (worldlineHost) removeFastPlaceholder(panel, false)
  }

  const walletPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-native-wallet]'))
  for (const panel of walletPanels) compactWalletPanel(panel)

  const authPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-embedded^="pmd-authorization-"]'))
  for (const panel of authPanels) compactAuthorizationPanel(panel)
}

export function PaymentCheckoutUXEnhancer() {
  useEffect(() => {
    let disposed = false
    const worldlineMethods = new Set<string>()

    const loadWorldlineMethods = async () => {
      try {
        const response = await fetch(WORLDLINE_RUNTIME_METHODS, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        const methods = Array.isArray(data?.methods) ? data.methods : []
        for (const row of methods) {
          if (row?.enabled === false || Number(row?.status ?? 1) === 0) continue
          const code = normalizeMethod(row?.code)
          if (code) worldlineMethods.add(code)
        }
        if (worldlineMethods.has('google_pay')) preloadGooglePay()
      } catch {}
    }

    const onClick = (event: MouseEvent) => {
      if (disposed) return
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest<HTMLButtonElement>('button') || null
      if (!button) return
      const panel = button.closest<HTMLElement>('[data-pmd-payment-order-id]')
      if (!panel) return
      const methodCode = methodFromButton(button)
      if (!methodCode || !worldlineMethods.has(methodCode)) return

      showFastPlaceholder(panel, methodCode)
      window.requestAnimationFrame(syncCheckoutDom)
    }

    const observer = new MutationObserver(() => {
      if (disposed) return
      window.requestAnimationFrame(syncCheckoutDom)
    })

    syncCheckoutDom()
    void loadWorldlineMethods()
    document.addEventListener('click', onClick, true)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
      for (const panel of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id]'))) {
        removeFastPlaceholder(panel, true)
      }
    }
  }, [])

  return null
}
