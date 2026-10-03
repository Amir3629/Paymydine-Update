'use client'

import { useEffect } from 'react'

const INLINE_HOST = 'data-pmd-worldline-inline-host'
const HIDDEN_PAY = 'data-pmd-worldline-hidden-pay-button'
const AUTO_START = 'data-pmd-worldline-auto-start'
const METHOD = 'data-pmd-worldline-method'
const LAUNCHING = 'data-pmd-worldline-launching'
const OVERLAYED = 'data-pmd-worldline-overlayed'
const HIDDEN_CANONICAL = 'data-pmd-worldline-single-action-hidden'

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function codeFromButton(button: HTMLButtonElement): string | null {
  const text = String(button.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null
  if (text.includes('apple pay')) return 'apple_pay'
  if (text.includes('google pay')) return 'google_pay'
  if (text.includes('paypal')) return 'paypal'
  if (text.includes('wero')) return 'wero'
  if (text.includes('card / wallet') || text === 'card' || text.includes('card /')) return 'card'
  return null
}

function directButtons(element: Element): HTMLButtonElement[] {
  return Array.from(element.children).filter((child): child is HTMLButtonElement => child instanceof HTMLButtonElement)
}

function methodGrid(panel: HTMLElement): HTMLElement | null {
  for (const child of Array.from(panel.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (directButtons(child).some((button) => Boolean(codeFromButton(button)))) return child
  }
  return null
}

function decorate(panel: HTMLElement) {
  const grid = methodGrid(panel)
  if (!grid) return
  for (const button of directButtons(grid)) {
    const code = codeFromButton(button)
    if (code) button.setAttribute(METHOD, code)
    else button.removeAttribute(METHOD)
  }
}

function methodButton(panel: HTMLElement, code: string): HTMLButtonElement | null {
  const grid = methodGrid(panel)
  if (!grid) return null
  return directButtons(grid).find((button) => normalize(button.getAttribute(METHOD)) === code) || null
}

function canonicalPay(panel: HTMLElement): HTMLButtonElement | null {
  const buttons = directButtons(panel)
  return buttons.length ? buttons[buttons.length - 1] : null
}

function hideCanonical(panel: HTMLElement) {
  const button = canonicalPay(panel)
  if (!button) return
  button.setAttribute(AUTO_START, 'true')
  button.setAttribute(HIDDEN_CANONICAL, 'true')
  button.style.setProperty('display', 'none', 'important')
}

function restoreCanonical(panel: HTMLElement) {
  const button = canonicalPay(panel)
  if (!button || !button.hasAttribute(HIDDEN_CANONICAL)) return
  button.removeAttribute(HIDDEN_CANONICAL)
  if (!button.hasAttribute(HIDDEN_PAY)) button.style.removeProperty('display')
}

function launchCanonical(panel: HTMLElement, attempt = 0) {
  const button = canonicalPay(panel)
  if (!button) return
  hideCanonical(panel)
  if (button.disabled) {
    if (attempt < 14) window.setTimeout(() => launchCanonical(panel, attempt + 1), 35)
    return
  }
  button.click()
}

function resetMethodOverlay(panel: HTMLElement, keep = '') {
  const grid = methodGrid(panel)
  if (!grid) return
  for (const button of directButtons(grid)) {
    const code = normalize(button.getAttribute(METHOD))
    if (keep && code === keep) continue
    if (button.getAttribute(OVERLAYED) === 'true') {
      button.style.removeProperty('visibility')
      button.removeAttribute(OVERLAYED)
    }
    button.removeAttribute(LAUNCHING)
  }
}

function resetHost(host: HTMLElement) {
  for (const prop of ['position', 'left', 'top', 'width', 'height', 'min-height', 'z-index', 'pointer-events']) {
    host.style.removeProperty(prop)
  }
}

function finalProviderAction(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(
    '.pmd-worldline-apple-pay-button, [data-pmd-worldline-final], [data-pmd-worldline-embedded^="pmd-authorization-"] > button',
  )
}

function placeProviderOnMethod(panel: HTMLElement, code: string) {
  const host = panel.querySelector<HTMLElement>(`:scope > [${INLINE_HOST}="true"]`)
  if (!host) {
    resetMethodOverlay(panel)
    return
  }

  if (code === 'card') {
    resetHost(host)
    resetMethodOverlay(panel)
    if (host.querySelector('[data-pmd-worldline-native-card]')) methodButton(panel, code)?.removeAttribute(LAUNCHING)
    return
  }

  const source = methodButton(panel, code)
  const action = finalProviderAction(host)
  if (!source || !action) return

  const panelRect = panel.getBoundingClientRect()
  const sourceRect = source.getBoundingClientRect()
  if (sourceRect.width < 8 || sourceRect.height < 8) return

  if (getComputedStyle(panel).position === 'static') panel.style.setProperty('position', 'relative')
  host.style.setProperty('position', 'absolute', 'important')
  host.style.setProperty('left', `${sourceRect.left - panelRect.left}px`, 'important')
  host.style.setProperty('top', `${sourceRect.top - panelRect.top}px`, 'important')
  host.style.setProperty('width', `${sourceRect.width}px`, 'important')
  host.style.setProperty('height', `${sourceRect.height}px`, 'important')
  host.style.setProperty('min-height', `${sourceRect.height}px`, 'important')
  host.style.setProperty('z-index', '9', 'important')
  host.style.setProperty('pointer-events', 'auto', 'important')

  resetMethodOverlay(panel, code)
  source.style.setProperty('visibility', 'hidden', 'important')
  source.setAttribute(OVERLAYED, 'true')
  source.removeAttribute(LAUNCHING)
}

export function WorldlineSingleActionUX() {
  useEffect(() => {
    let disposed = false
    let scheduled = false
    const active = new WeakMap<HTMLElement, string>()
    const timeout = new WeakMap<HTMLElement, number>()

    const sync = () => {
      for (const panel of Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id]'))) {
        decorate(panel)
        const code = active.get(panel) || ''
        if (!code) {
          restoreCanonical(panel)
          resetMethodOverlay(panel)
          const host = panel.querySelector<HTMLElement>(`:scope > [${INLINE_HOST}="true"]`)
          if (host) resetHost(host)
          continue
        }
        hideCanonical(panel)
        placeProviderOnMethod(panel, code)
      }
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
      const grid = methodGrid(panel)
      if (!grid || button.parentElement !== grid) return

      const rawCode = codeFromButton(button)
      if (!rawCode) {
        active.delete(panel)
        restoreCanonical(panel)
        resetMethodOverlay(panel)
        schedule()
        return
      }

      const code = normalize(rawCode)
      active.set(panel, code)
      decorate(panel)
      button.setAttribute(LAUNCHING, 'true')
      hideCanonical(panel)

      const prior = timeout.get(panel)
      if (prior) window.clearTimeout(prior)
      timeout.set(panel, window.setTimeout(() => {
        button.removeAttribute(LAUNCHING)
        schedule()
      }, 15000))

      // One visible control only: the selected method tile launches the hidden
      // canonical React pay() handler. Worldline later replaces this same visual
      // slot with its official wallet/authorization action; no second bar appears.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!disposed) launchCanonical(panel)
        })
      })
      schedule()
    }

    const observer = new MutationObserver(schedule)
    const viewport = () => schedule()
    sync()
    document.addEventListener('click', onClick, true)
    document.addEventListener('scroll', viewport, true)
    window.addEventListener('resize', viewport)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] })

    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('scroll', viewport, true)
      window.removeEventListener('resize', viewport)
    }
  }, [])

  return (
    <style>{`
      [data-pmd-worldline-single-action-hidden="true"] { display: none !important; }

      button[${METHOD}] { position: relative; }

      button[${METHOD}="apple_pay"] > svg,
      button[${METHOD}="google_pay"] > svg,
      button[${METHOD}="paypal"] > svg,
      button[${METHOD}="wero"] > svg { display: none !important; }

      button[${METHOD}="apple_pay"]::before {
        content: '';
        display: inline-block;
        margin-inline-end: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
        font-size: 23px;
        font-weight: 500;
        line-height: 1;
        vertical-align: -1px;
      }

      button[${METHOD}="google_pay"]::before {
        content: 'G';
        display: inline-grid;
        width: 22px;
        height: 22px;
        margin-inline-end: 10px;
        place-items: center;
        border: 2px solid currentColor;
        border-radius: 50%;
        font-family: Arial, sans-serif;
        font-size: 13px;
        font-weight: 900;
        line-height: 1;
        box-sizing: border-box;
      }

      button[${METHOD}="paypal"]::before {
        content: 'P';
        display: inline-block;
        min-width: 18px;
        margin-inline-end: 10px;
        font-family: Arial, sans-serif;
        font-size: 21px;
        font-style: italic;
        font-weight: 900;
        line-height: 1;
      }

      button[${METHOD}="wero"]::before {
        content: 'W';
        display: inline-grid;
        width: 22px;
        height: 22px;
        margin-inline-end: 10px;
        place-items: center;
        border: 2px solid currentColor;
        border-radius: 50%;
        font-family: Arial, sans-serif;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        box-sizing: border-box;
      }

      button[${LAUNCHING}="true"] {
        border-color: var(--pmd-text, #fff) !important;
        background: var(--pmd-text, #fff) !important;
        color: var(--pmd-control, #070707) !important;
        opacity: 1 !important;
      }

      button[${LAUNCHING}="true"] > svg { display: none !important; }

      button[${LAUNCHING}="true"]::before {
        content: '' !important;
        display: inline-block !important;
        width: 18px !important;
        height: 18px !important;
        margin-inline-end: 10px !important;
        border: 2px solid currentColor !important;
        border-right-color: transparent !important;
        border-radius: 50% !important;
        animation: pmdWorldlineSingleSpin .7s linear infinite !important;
        box-sizing: border-box !important;
        vertical-align: -3px !important;
      }

      [${INLINE_HOST}="true"] [data-pmd-worldline-native-wallet],
      [${INLINE_HOST}="true"] [data-pmd-worldline-embedded^="pmd-authorization-"] {
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
      }

      [${INLINE_HOST}="true"] .pmd-worldline-apple-pay-button,
      [${INLINE_HOST}="true"] [data-pmd-worldline-final] {
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        border-radius: 999px !important;
      }

      @keyframes pmdWorldlineSingleSpin { to { transform: rotate(360deg); } }
    `}</style>
  )
}
