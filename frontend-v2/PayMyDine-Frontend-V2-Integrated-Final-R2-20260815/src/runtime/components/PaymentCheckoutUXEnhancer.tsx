'use client'

import { useEffect } from 'react'

const WORLDLINE_RUNTIME_METHODS = '/api/v1/payments/worldline/runtime-methods'
const WORLDLINE_INLINE_HOST = 'data-pmd-worldline-inline-host'
const WORLDLINE_HIDDEN_PAY = 'data-pmd-worldline-hidden-pay-button'
const WORLDLINE_AUTO_START = 'data-pmd-worldline-auto-start'
const STYLE_ID = 'pmd-worldline-payment-ux-v2'
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
  if (looksLikeTotalCard(next)) next.insertAdjacentElement('afterend', methodGrid)
  return methodGrid
}

function genericPayButton(panel: HTMLElement): HTMLButtonElement | null {
  const direct = directButtons(panel)
  if (!direct.length) return null
  return direct[direct.length - 1] || null
}

function parseRgb(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] == null ? 1 : Number(match[4])]
}

function isDarkTheme(element: HTMLElement): boolean {
  let current: HTMLElement | null = element
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const parsed = parseRgb(window.getComputedStyle(current).backgroundColor)
    if (!parsed || parsed[3] < 0.12) continue
    const [r, g, b] = parsed
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luminance < 0.48
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function ensureStyleSheet() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [data-pmd-worldline-action="true"],
    [data-pmd-worldline-final] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      min-height: 54px !important;
      border-radius: 999px !important;
      box-sizing: border-box !important;
    }

    [data-pmd-worldline-action="true"] .pmd-wl-action-icon,
    [data-pmd-worldline-final]::before {
      content: '';
      display: inline-block;
      width: 18px;
      height: 12px;
      flex: 0 0 auto;
      border: 2px solid currentColor;
      border-radius: 3px;
      box-sizing: border-box;
    }

    [data-pmd-worldline-action="true"][disabled] .pmd-wl-action-icon {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      border-width: 2px;
      border-right-color: transparent;
      animation: pmdWlActionSpin .7s linear infinite;
    }

    @keyframes pmdWlActionSpin { to { transform: rotate(360deg); } }

    [data-pmd-worldline-native-card] label {
      font-size: 0 !important;
      gap: 0 !important;
      margin: 0 !important;
    }

    [data-pmd-worldline-native-card] input {
      font-size: 16px !important;
    }

    [data-pmd-worldline-native-wallet^="own-checkout-apple_pay"] .pmd-worldline-apple-pay-button {
      -apple-pay-button-style: white !important;
      border-radius: 999px !important;
      overflow: hidden !important;
    }
  `
  document.head.appendChild(style)
}

function applyWhiteActionStyle(button: HTMLButtonElement, dark: boolean) {
  if (dark) {
    button.style.setProperty('background', '#ffffff', 'important')
    button.style.setProperty('color', '#070707', 'important')
    button.style.setProperty('border', '1px solid rgba(255,255,255,.92)', 'important')
  } else {
    button.style.setProperty('background', 'var(--pmd-accent, #111111)', 'important')
    button.style.setProperty('color', 'var(--pmd-accentText, #ffffff)', 'important')
    button.style.setProperty('border', '1px solid var(--pmd-accent, #111111)', 'important')
  }
  button.style.setProperty('opacity', '1', 'important')
  button.style.setProperty('font', 'inherit', 'important')
  button.style.setProperty('font-size', '17px', 'important')
  button.style.setProperty('font-weight', '800', 'important')
  button.style.setProperty('width', '100%', 'important')
  button.style.setProperty('height', '54px', 'important')
  button.style.setProperty('cursor', button.disabled ? 'wait' : 'pointer', 'important')
}

function styleExistingPayButton(panel: HTMLElement, methodCode: string) {
  if (panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)) return
  const button = genericPayButton(panel)
  if (!button || button.hasAttribute(WORLDLINE_HIDDEN_PAY)) return

  const label = paymentLabel(methodCode)
  button.setAttribute('data-pmd-worldline-action', 'true')
  button.dataset.pmdWorldlineActionMethod = methodCode
  applyWhiteActionStyle(button, isDarkTheme(panel))

  const currentLabel = String(button.querySelector('[data-pmd-wl-action-label]')?.textContent || '')
  if (currentLabel !== label || !button.querySelector('.pmd-wl-action-icon')) {
    const icon = document.createElement('span')
    icon.className = 'pmd-wl-action-icon'
    icon.setAttribute('aria-hidden', 'true')
    const text = document.createElement('span')
    text.dataset.pmdWlActionLabel = 'true'
    text.textContent = label
    button.replaceChildren(icon, text)
  }
}

function restoreExistingPayButton(panel: HTMLElement) {
  const button = genericPayButton(panel)
  if (!button || !button.hasAttribute('data-pmd-worldline-action')) return
  button.removeAttribute('data-pmd-worldline-action')
  delete button.dataset.pmdWorldlineActionMethod
  button.style.removeProperty('background')
  button.style.removeProperty('color')
  button.style.removeProperty('border')
  button.style.removeProperty('opacity')
  button.style.removeProperty('font')
  button.style.removeProperty('font-size')
  button.style.removeProperty('font-weight')
  button.style.removeProperty('width')
  button.style.removeProperty('height')
  button.style.removeProperty('cursor')
}

function triggerGenericPay(panel: HTMLElement, attempt = 0) {
  const button = genericPayButton(panel)
  if (!button || button.hasAttribute(WORLDLINE_HIDDEN_PAY) || button.disabled) {
    if (attempt < 8) window.setTimeout(() => triggerGenericPay(panel, attempt + 1), 45)
    return
  }
  if (button.getAttribute(WORLDLINE_AUTO_START) === 'true') return
  button.setAttribute(WORLDLINE_AUTO_START, 'true')
  button.click()
  window.setTimeout(() => button.removeAttribute(WORLDLINE_AUTO_START), 1000)
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

function hideReadyNoise(panel: HTMLElement) {
  const candidates = Array.from(panel.querySelectorAll<HTMLElement>(':scope > div'))
  for (const candidate of candidates) {
    if (candidate.hasAttribute(WORLDLINE_INLINE_HOST)) continue
    if (isReadyNoise(String(candidate.textContent || ''))) candidate.style.display = 'none'
  }
}

function compactNativeCardForm(form: HTMLElement) {
  form.style.setProperty('border', '0', 'important')
  form.style.setProperty('background', 'transparent', 'important')
  form.style.setProperty('padding', '0', 'important')
  form.style.setProperty('gap', '10px', 'important')
  form.style.setProperty('margin', '0', 'important')

  const children = Array.from(form.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  for (const child of children) {
    const text = String(child.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (text.includes('encrypted securely by worldline')
      || text.includes('paymydine never sends your raw card number')
      || text.includes('worldline may open a bank verification')) {
      child.style.display = 'none'
    }
  }

  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input'))) {
    input.style.setProperty('height', '48px', 'important')
    input.style.setProperty('border-radius', '12px', 'important')
    input.style.setProperty('padding', '0 14px', 'important')
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (button) {
    button.setAttribute('data-pmd-worldline-final', 'card')
    applyWhiteActionStyle(button, isDarkTheme(form))
  }
}

function compactWalletPanel(panel: HTMLElement) {
  panel.style.setProperty('border', '0', 'important')
  panel.style.setProperty('background', 'transparent', 'important')
  panel.style.setProperty('padding', '0', 'important')
  panel.style.setProperty('gap', '8px', 'important')
  panel.style.setProperty('margin', '0', 'important')

  const methodCode = panel.getAttribute('data-pmd-worldline-native-wallet')?.includes('apple_pay') ? 'apple_pay' : 'google_pay'
  const label = paymentLabel(methodCode)
  const children = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)

  for (const child of children) {
    if (child.tagName === 'STYLE') continue
    const text = String(child.textContent || '').replace(/\s+/g, ' ').trim()
    if (child.matches('[role="alert"]')) continue

    if (child.matches('[role="status"]')) {
      if (!/cancel|fail|error|declin|reject/i.test(text)) child.style.display = 'none'
      continue
    }

    if (/secure worldline own-checkout inside paymydine/i.test(text)
      || /wallet credential is tokenized/i.test(text)
      || /paymydine never receives raw card data/i.test(text)) {
      child.style.display = 'none'
      continue
    }

    if (/^preparing\s+(apple pay|google pay)/i.test(text)) {
      child.textContent = label
      child.setAttribute('data-pmd-worldline-action', 'true')
      child.style.setProperty('min-height', '54px', 'important')
      child.style.setProperty('display', 'grid', 'important')
      child.style.setProperty('place-items', 'center', 'important')
      child.style.setProperty('border-radius', '999px', 'important')
      child.style.setProperty('background', '#ffffff', 'important')
      child.style.setProperty('color', '#070707', 'important')
      child.style.setProperty('font-size', '17px', 'important')
      child.style.setProperty('font-weight', '800', 'important')
      child.style.setProperty('opacity', '.78', 'important')
    }
  }

  if (methodCode === 'apple_pay') {
    const appleButton = panel.querySelector<HTMLButtonElement>('.pmd-worldline-apple-pay-button')
    if (appleButton) {
      appleButton.style.setProperty('-apple-pay-button-style', 'white')
      appleButton.style.setProperty('border-radius', '999px', 'important')
      appleButton.style.setProperty('height', '54px', 'important')
    }
    return
  }

  const possibleHosts = Array.from(panel.querySelectorAll<HTMLElement>('div'))
  for (const host of possibleHosts) {
    const actual = Array.from(host.children).find((child): child is HTMLButtonElement => child instanceof HTMLButtonElement)
    if (!actual || actual.hasAttribute('data-pmd-worldline-google-proxy')) continue
    if (host.querySelector('[data-pmd-worldline-google-proxy="true"]')) continue

    actual.style.setProperty('display', 'none', 'important')
    const proxy = document.createElement('button')
    proxy.type = 'button'
    proxy.setAttribute('data-pmd-worldline-google-proxy', 'true')
    proxy.setAttribute('data-pmd-worldline-final', 'google-pay')
    proxy.setAttribute('aria-label', 'Pay with Google Pay')
    proxy.textContent = 'Google Pay'
    applyWhiteActionStyle(proxy, true)
    proxy.addEventListener('click', () => actual.click())
    host.appendChild(proxy)
    break
  }
}

function compactAuthorizationPanel(panel: HTMLElement) {
  panel.style.setProperty('border', '0', 'important')
  panel.style.setProperty('background', 'transparent', 'important')
  panel.style.setProperty('padding', '0', 'important')
  panel.style.setProperty('gap', '8px', 'important')
  panel.style.setProperty('margin', '0', 'important')

  const button = Array.from(panel.children).find((child): child is HTMLButtonElement => child instanceof HTMLButtonElement) || null
  const children = Array.from(panel.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  for (const child of children) {
    if (child === button) continue
    if (child.matches('[role="status"]')) {
      const text = String(child.textContent || '')
      child.style.display = /cancel|fail|error|declin|reject/i.test(text) ? '' : 'none'
      continue
    }
    child.style.display = 'none'
  }

  if (button) {
    button.setAttribute('data-pmd-worldline-final', normalizeMethod(String(panel.getAttribute('data-pmd-worldline-embedded') || 'authorization')))
    applyWhiteActionStyle(button, isDarkTheme(panel))
  }
}

function dedupeNativeWalletStatus() {
  const walletPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-native-wallet]'))
  for (const wallet of walletPanels) {
    const host = wallet.closest<HTMLElement>(`[${WORLDLINE_INLINE_HOST}="true"]`)
    const panel = host?.parentElement
    if (!panel) continue

    const innerAlert = wallet.querySelector<HTMLElement>('[role="alert"]')
    const innerText = String(innerAlert?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (!innerText) continue

    for (const candidate of Array.from(panel.querySelectorAll<HTMLElement>(':scope > div'))) {
      if (candidate === host) continue
      const text = String(candidate.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      if (text && (text === innerText || text.includes(innerText) || innerText.includes(text))) candidate.style.display = 'none'
    }
  }
}

function preloadGooglePay() {
  if (document.querySelector(`script[src="${GOOGLE_PAY_SCRIPT}"]`)) return
  const script = document.createElement('script')
  script.src = GOOGLE_PAY_SCRIPT
  script.async = true
  script.dataset.pmdGooglePayPreload = 'payment-ux-v2'
  document.head.appendChild(script)
}

export function PaymentCheckoutUXEnhancer() {
  useEffect(() => {
    ensureStyleSheet()
    let disposed = false
    let syncScheduled = false
    const worldlineMethods = new Set<string>()
    const activeMethod = new WeakMap<HTMLElement, string>()

    const runtimeMethodsPromise = fetch(WORLDLINE_RUNTIME_METHODS, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) return worldlineMethods
      const data = await response.json().catch(() => ({}))
      const methods = Array.isArray(data?.methods) ? data.methods : []
      for (const row of methods) {
        const provider = normalizeMethod(row?.provider_code || row?.provider || 'worldline')
        if (provider !== 'worldline' || row?.enabled === false || Number(row?.status ?? 1) === 0) continue
        const code = normalizeMethod(row?.code)
        if (code) worldlineMethods.add(code)
      }
      if (worldlineMethods.has('google_pay')) preloadGooglePay()
      return worldlineMethods
    }).catch(() => worldlineMethods)

    const syncCheckoutDom = () => {
      const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id], [data-pmd-multi-order-payment="r32"]'))
      for (const panel of panels) {
        moveMethodsBelowTotal(panel)
        hideReadyNoise(panel)

        const methodCode = activeMethod.get(panel)
        const host = panel.querySelector<HTMLElement>(`:scope > [${WORLDLINE_INLINE_HOST}="true"]`)
        if (!host && methodCode && worldlineMethods.has(methodCode)) styleExistingPayButton(panel, methodCode)
      }

      for (const form of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-native-card]'))) compactNativeCardForm(form)
      for (const wallet of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-native-wallet]'))) compactWalletPanel(wallet)
      for (const authorization of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-worldline-embedded^="pmd-authorization-"]'))) compactAuthorizationPanel(authorization)
      dedupeNativeWalletStatus()
    }

    const scheduleSync = () => {
      if (disposed || syncScheduled) return
      syncScheduled = true
      window.requestAnimationFrame(() => {
        syncScheduled = false
        if (!disposed) syncCheckoutDom()
      })
    }

    const activateWorldlineMethod = (panel: HTMLElement, methodCode: string) => {
      if (disposed || !worldlineMethods.has(methodCode)) return
      activeMethod.set(panel, methodCode)
      scheduleSync()
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (disposed) return
          styleExistingPayButton(panel, methodCode)
          triggerGenericPay(panel)
        })
      })
    }

    const onClick = (event: MouseEvent) => {
      if (disposed) return
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest<HTMLButtonElement>('button') || null
      if (!button) return
      const panel = button.closest<HTMLElement>('[data-pmd-payment-order-id]')
      if (!panel) return

      const methodGrid = findMethodGrid(panel)
      if (!methodGrid || button.parentElement !== methodGrid) return
      const methodCode = methodFromButton(button)
      if (!methodCode) return

      if (worldlineMethods.has(methodCode)) {
        activateWorldlineMethod(panel, methodCode)
        return
      }

      void runtimeMethodsPromise.then(() => {
        if (disposed) return
        if (worldlineMethods.has(methodCode)) activateWorldlineMethod(panel, methodCode)
        else {
          activeMethod.delete(panel)
          restoreExistingPayButton(panel)
          scheduleSync()
        }
      })
    }

    const observer = new MutationObserver(scheduleSync)
    syncCheckoutDom()
    void runtimeMethodsPromise.then(scheduleSync)
    document.addEventListener('click', onClick, true)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [])

  return null
}
