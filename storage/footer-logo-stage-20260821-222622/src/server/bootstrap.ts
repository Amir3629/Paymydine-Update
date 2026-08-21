import 'server-only'

import type { CustomerBootstrap } from '@/src/domain/model'
import { normalizeThemeId, type ThemeId } from '@/src/themes/catalog'
import { fetchBackendJsonOrNull } from './backend'
import { createMockBootstrap } from './mock-bootstrap'
import { applySmartCategories } from './smart-categories'
import {
  normalizeFeatures,
  normalizeMenu,
  normalizeOrder,
  normalizePayments,
  normalizeRestaurant,
  normalizeSocial,
  normalizeServiceCharge,
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

function enabledLocales(settings: any, theme: any, fallback: string): string[] {
  const raw = theme?.pmd_v2_enabled_languages || theme?.data?.pmd_v2_enabled_languages || settings?.enabled_languages || settings?.data?.enabled_languages || settings?.locales || settings?.data?.locales
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  const normalized = list.map((value: unknown) => String(value).trim().toLowerCase()).filter(Boolean)
  const supported = new Set(['en', 'de', 'fa', 'tr', 'ja'])
  const configured = normalized.filter((value: string) => supported.has(value))
  const base = supported.has(fallback) ? fallback : 'en'
  return Array.from(new Set([base, ...(configured.length ? configured : ['en', 'de'])]))
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
    categoriesPayload,
    themePayload,
    paymentsPayload,
    tablePayload,
    orderPayload,
    taxApiPayload,
    tipApiPayload,
  ] = await Promise.all([
    fetchBackendJsonOrNull<any>('/api/v1/settings', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/restaurant', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/menu', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/categories', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/frontend-theme-v2', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/payments', requestOptions),
    tableId || tableNo || qr ? fetchBackendJsonOrNull<any>(`/api/v1/table-info${tableLookup}`, requestOptions) : Promise.resolve(null),
    tableId || tableNo || qr ? fetchBackendJsonOrNull<any>(`/api/v1/table-order-draft${draftLookup}`, requestOptions) : Promise.resolve(null),
    fetchBackendJsonOrNull<any>('/api/v1/vat-settings', requestOptions),
    fetchBackendJsonOrNull<any>('/api/v1/tip-settings', requestOptions),
  ])

  // PMD_VAT_FAST_FALLBACK_R34
  // Do not block every SSR render on the slow legacy VAT endpoint when
  // the canonical /api/v1/vat-settings endpoint already succeeded.
  const taxLegacyPayload = taxApiPayload
    ? null
    : await fetchBackendJsonOrNull<any>('/vat-settings', requestOptions)

  const resolvedThemePayload = themePayload || await fetchBackendJsonOrNull<any>('/simple-theme', requestOptions)

  if (!settings && !restaurant && !menuPayload && !resolvedThemePayload) {
    const allowMockFallback = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.PMD_ALLOW_MOCK_FALLBACK || '').trim().toLowerCase(),
    )

    if (allowMockFallback) {
      return createMockBootstrap(previewId || 'verdant_modern', host)
    }

    throw new Error('PAYMYDINE_BACKEND_UNAVAILABLE')
  }

  const restaurantInfo = normalizeRestaurant(settings, restaurant)
  // PMD_RESTAURANT_NAME_AUTHORITY_R18
  // /admin/pmdsettings/restaurant saves site_name; make that setting the final
  // customer-menu display-name authority, with location name only as fallback.
  const adminRestaurantName = String(
    settings?.site_name
    || settings?.data?.site_name
    || restaurant?.name
    || restaurant?.data?.name
    || '',
  ).trim()
  if (adminRestaurantName) restaurantInfo.name = adminRestaurantName

  // PMD_MENU_SMART_CATEGORIES_V1_FRONTEND_V2
  // Live tenant hosts use the V2 runtime on port 3002. Resolve editable smart
  // category names/order from /api/v1/categories, while preserving the existing
  // product flags and combo data from the canonical /api/v1/menu payload.
  const menu = applySmartCategories(
    normalizeMenu(menuPayload),
    menuPayload,
    categoriesPayload,
  )
  const theme = normalizeTheme(resolvedThemePayload, previewId)
  const table = normalizeTable(tablePayload, { tableId, tableNo, qr })
  const paymentMethods = normalizePayments(paymentsPayload)
  const locale = String(query.locale || settingsLocale(settings)).toLowerCase()
  const activeOrder = normalizeOrder(orderPayload)

  return {
    apiVersion: 'pmd-customer-bootstrap-v2',
    tenant: { id: host.split('.')[0] || 'default', slug: host.split('.')[0] || 'default', host },
    restaurant: { ...restaurantInfo, locale },
    theme,
    locales: { defaultLocale: locale, enabledLocales: enabledLocales(settings, resolvedThemePayload, locale) },
    socialLinks: normalizeSocial(settings, resolvedThemePayload),
    features: normalizeFeatures(settings, resolvedThemePayload),
    tax: normalizeTax(taxApiPayload || taxLegacyPayload || settings),
    tips: normalizeTips(tipApiPayload || settings),
    serviceCharge: normalizeServiceCharge(settings, resolvedThemePayload),
    table,
    menu,
    payments: paymentMethods,
    activeOrder: table.valid && activeOrder
      && (activeOrder.status === 'draft' || activeOrder.totals.remainingAmount > 0)
      && (activeOrder.canShowToNewDevice || activeOrder.status === 'draft')
      ? activeOrder
      : null,
  }
}

export function previewBootstrap(themeId: ThemeId, host = 'preview.paymydine.local'): CustomerBootstrap {
  return createMockBootstrap(themeId, host)
}
