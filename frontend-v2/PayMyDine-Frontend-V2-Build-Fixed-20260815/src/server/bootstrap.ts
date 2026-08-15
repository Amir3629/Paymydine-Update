import 'server-only'

import type { CustomerBootstrap } from '@/src/domain/model'
import { normalizeThemeId, type ThemeId } from '@/src/themes/catalog'
import { fetchBackendJsonOrNull } from './backend'
import { createMockBootstrap } from './mock-bootstrap'
import {
  normalizeFeatures,
  normalizeMenu,
  normalizeOrder,
  normalizePayments,
  normalizeRestaurant,
  normalizeSocial,
  normalizeTable,
  normalizeTax,
  normalizeTheme,
  normalizeTips,
} from './normalize'

type BootstrapQuery = {
  host: string
  locale?: string | null
  tableId?: string | null
  tableNo?: string | null
  qr?: string | null
  previewTheme?: string | null
  forceDemo?: boolean
}

function safeParam(value: string | null | undefined): string | null {
  const clean = String(value || '').trim()
  if (!clean || clean === 'undefined' || clean === 'null') return null
  return /^[A-Za-z0-9_.:-]{1,128}$/.test(clean) ? clean : null
}

function queryString(entries: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) if (value) params.set(key, value)
  const output = params.toString()
  return output ? `?${output}` : ''
}

function settingsLocale(settings: any): string {
  return String(settings?.default_language || settings?.data?.default_language || 'en').trim() || 'en'
}

function enabledLocales(settings: any, fallback: string): string[] {
  const raw = settings?.enabled_languages || settings?.data?.enabled_languages || settings?.locales || settings?.data?.locales
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  const normalized = list.map((value: unknown) => String(value).trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set([fallback, ...normalized, 'en', 'de', 'fa', 'tr', 'ja']))
}

export async function loadCustomerBootstrap(query: BootstrapQuery): Promise<CustomerBootstrap> {
  const host = String(query.host || 'localhost').split(',')[0].trim()
  const tableId = safeParam(query.tableId)
  const tableNo = safeParam(query.tableNo)
  const qr = safeParam(query.qr)
  const demoMode = query.forceDemo || process.env.PMD_DEMO_MODE === '1'
  const previewId = query.previewTheme ? normalizeThemeId(query.previewTheme) : null

  if (demoMode) return createMockBootstrap(previewId || 'verdant_modern', host)

  const requestOptions = { host, timeoutMs: 8000, cache: 'no-store' as RequestCache }
  const tableLookup = queryString({ table_id: tableId, table_no: tableNo, qr_code: qr })
  const draftLookup = queryString({ table_id: tableId, table_no: tableNo, qr })

  const [
    settings,
    restaurant,
    menuPayload,
    themePayload,
    paymentsPayload,
    tablePayload,
    orderPayload,
    taxApiPayload,
    taxLegacyPayload,
    tipApiPayload,
  ] = await Promise.all([
    fetchBackendJsonOrNull<any>('/api/v1/settings', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/restaurant', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/menu', requestOptions),
    fetchBackendJsonOrNull<any>('/simple-theme', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/payments', requestOptions),
    tableId || tableNo || qr ? fetchBackendJsonOrNull<any>(`/api/v1/table-info${tableLookup}`, requestOptions) : Promise.resolve(null),
    tableId || tableNo || qr ? fetchBackendJsonOrNull<any>(`/api/v1/table-order-draft${draftLookup}`, requestOptions) : Promise.resolve(null),
    fetchBackendJsonOrNull<any>('/api/v1/vat-settings', requestOptions),
    fetchBackendJsonOrNull<any>('/vat-settings', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/tip-settings', requestOptions),
  ])

  if (!settings && !restaurant && !menuPayload && !themePayload) {
    const allowMockFallback = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.PMD_ALLOW_MOCK_FALLBACK || '').trim().toLowerCase(),
    )

    if (allowMockFallback) {
      return createMockBootstrap(previewId || 'verdant_modern', host)
    }

    throw new Error('PAYMYDINE_BACKEND_UNAVAILABLE')
  }

  const restaurantInfo = normalizeRestaurant(settings, restaurant)
  const menu = normalizeMenu(menuPayload)
  const theme = normalizeTheme(themePayload, previewId)
  const table = normalizeTable(tablePayload, { tableId, tableNo, qr })
  const paymentMethods = normalizePayments(paymentsPayload)
  const locale = String(query.locale || settingsLocale(settings)).toLowerCase()
  const activeOrder = normalizeOrder(orderPayload)

  return {
    apiVersion: 'pmd-customer-bootstrap-v2',
    tenant: { id: host.split('.')[0] || 'default', slug: host.split('.')[0] || 'default', host },
    restaurant: { ...restaurantInfo, locale },
    theme,
    locales: { defaultLocale: locale, enabledLocales: enabledLocales(settings, locale) },
    socialLinks: normalizeSocial(settings, themePayload),
    features: normalizeFeatures(settings, themePayload),
    tax: normalizeTax(taxApiPayload || taxLegacyPayload || settings),
    tips: normalizeTips(tipApiPayload || settings),
    table,
    menu,
    payments: paymentMethods,
    activeOrder: activeOrder && (activeOrder.canShowToNewDevice || activeOrder.status === 'draft') ? activeOrder : null,
  }
}

export function previewBootstrap(themeId: ThemeId, host = 'preview.paymydine.local'): CustomerBootstrap {
  return createMockBootstrap(themeId, host)
}
