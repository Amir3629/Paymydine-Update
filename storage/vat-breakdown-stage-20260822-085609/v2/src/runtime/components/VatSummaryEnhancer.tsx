'use client'

import { useEffect, useState } from 'react'

type VatConfig = {
  enabled: boolean
  percentage: number
}

function enabledValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return ['1', 'true', 'yes', 'on', 'enabled', 'active'].includes(String(value ?? '').trim().toLowerCase())
}

function numericValue(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function parseMoney(text: string): number | null {
  let raw = String(text || '').replace(/\s|\u00a0/g, '').replace(/[^0-9,.-]/g, '')
  if (!raw) return null

  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  const decimalIndex = Math.max(comma, dot)

  if (decimalIndex >= 0) {
    const decimals = raw.length - decimalIndex - 1
    if (decimals === 1 || decimals === 2) {
      const decimal = raw[decimalIndex]
      const integer = raw.slice(0, decimalIndex).replace(/[.,]/g, '')
      const fraction = raw.slice(decimalIndex + 1).replace(/[.,]/g, '')
      raw = `${integer}.${fraction}`
      if (decimal === '-' || !fraction) return null
    } else {
      raw = raw.replace(/[.,]/g, '')
    }
  }

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function formatLikeSample(value: number, sample: string): string {
  const locale = document.documentElement.lang || 'en'
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  const text = String(sample || '').trim()
  const currency = text.replace(/[\d\s\u00a0.,+-]/g, '').trim()
  if (!currency) return formatted

  const firstDigit = text.search(/\d/)
  const currencyIndex = text.indexOf(currency)
  return currencyIndex >= 0 && firstDigit >= 0 && currencyIndex < firstDigit
    ? `${currency}${formatted}`
    : `${formatted} ${currency}`
}

function vatLabel(locale: string, percentage: number): string {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  const rate = Number.isInteger(percentage) ? String(percentage) : String(percentage).replace('.', ',')
  if (lang === 'de') return `MwSt. (${rate}%)`
  if (lang === 'tr') return `KDV (${rate}%)`
  if (lang === 'fa') return `مالیات بر ارزش افزوده (${rate}٪)`
  if (lang === 'ja') return `消費税 (${rate}%)`
  return `VAT (${rate}%)`
}

function runtimeSummaries(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"] div[class*="RuntimeOverlays-module"][class*="__summary"], article[data-pmd-order-id] div[class*="RuntimeOverlays-module"][class*="__summary"]',
  ))
}

function directSummaryRows(summary: HTMLElement): HTMLElement[] {
  return Array.from(summary.children).filter((child): child is HTMLElement => (
    child instanceof HTMLElement && child.className.includes('__summaryRow')
  ))
}

function removeInjectedRows() {
  document.querySelectorAll('[data-pmd-vat-summary-row="r37"]').forEach((node) => node.remove())
}

/* PMD_VAT_BREAKDOWN_R37
 * Owner finance settings remain the VAT authority. The existing backend order
 * total already contains the configured VAT; this component makes that tax
 * portion visible in every submitted-order summary and payment summary without
 * changing the amount being charged. It is deliberately event-driven rather
 * than polling so it remains compatible with the V2 source-safety rules.
 */
export function VatSummaryEnhancer() {
  const [config, setConfig] = useState<VatConfig>({ enabled: false, percentage: 0 })

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/vat-settings', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json().catch(() => ({}))
      })
      .then((payload) => {
        if (cancelled) return
        const data = payload && typeof payload.data === 'object' && payload.data ? payload.data : payload
        setConfig({
          enabled: enabledValue(data?.vat_mode ?? data?.tax_mode),
          percentage: Math.max(0, numericValue(data?.vat_percentage ?? data?.tax_percentage)),
        })
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false, percentage: 0 })
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const timers = new Set<number>()

    const renderVatRows = () => {
      removeInjectedRows()
      if (!config.enabled || config.percentage <= 0) return

      const label = vatLabel(document.documentElement.lang || 'en', config.percentage)

      for (const summary of runtimeSummaries()) {
        const rows = directSummaryRows(summary)
        if (rows.length < 2) continue

        // The first summary row is the gross order/open amount in the current
        // order cards and payment cards. VAT is already inside that gross amount.
        const amountRow = rows[0]
        const amountNode = amountRow.lastElementChild
        if (!(amountNode instanceof HTMLElement)) continue

        const gross = parseMoney(amountNode.textContent || '')
        if (gross == null || gross <= 0) continue

        const vat = Math.round((gross * config.percentage / (100 + config.percentage)) * 100) / 100
        if (!(vat > 0)) continue

        const vatRow = document.createElement('div')
        vatRow.className = amountRow.className
        vatRow.dataset.pmdVatSummaryRow = 'r37'

        const labelNode = document.createElement('span')
        labelNode.textContent = label

        const valueNode = document.createElement('span')
        valueNode.textContent = formatLikeSample(vat, amountNode.textContent || '')

        vatRow.append(labelNode, valueNode)

        // Keep Total as the final authoritative row: Remaining/Combined -> VAT -> Total.
        const totalRow = rows[rows.length - 1]
        summary.insertBefore(vatRow, totalRow)
      }
    }

    const schedule = (delays: number[]) => {
      for (const delay of delays) {
        const timer = window.setTimeout(() => {
          timers.delete(timer)
          renderVatRows()
        }, delay)
        timers.add(timer)
      }
    }

    const handleClick = () => schedule([0, 100, 300, 700, 1400])
    const handleReturn = () => schedule([0, 180])

    document.addEventListener('click', handleClick, true)
    window.addEventListener('focus', handleReturn)
    window.addEventListener('pageshow', handleReturn)
    schedule([0, 120, 400])

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('focus', handleReturn)
      window.removeEventListener('pageshow', handleReturn)
      for (const timer of timers) window.clearTimeout(timer)
      timers.clear()
      removeInjectedRows()
    }
  }, [config.enabled, config.percentage])

  return null
}
