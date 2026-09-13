import 'server-only'

import { cookies, headers } from 'next/headers'

type RawSearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function enabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

export type PageContext = {
  host: string
  locale: string | null
  tableId: string | null
  tableNo: string | null
  qr: string | null
  previewTheme: string | null
  forceDemo: boolean
}

export async function getPageContext(
  searchParams: RawSearchParams,
  routeTableId: string | null = null,
  routeThemeId: string | null = null,
): Promise<PageContext> {
  const requestHeaders = await headers()
  const requestCookies = await cookies()
  const trustTenantHeader = enabled(process.env.PMD_TRUST_TENANT_OVERRIDE_HEADER)
  // PMD_DYNAMIC_TENANT_HOST_R29
  // Production tenant authority is the real public request host. The historical
  // PMD_TENANT_HOST_OVERRIDE=mimoza... remains useful only for localhost/tunnel
  // checks unless PMD_FORCE_TENANT_HOST_OVERRIDE is explicitly enabled.
  const forceTenantOverride = enabled(process.env.PMD_FORCE_TENANT_HOST_OVERRIDE)
  const requestHost = String(
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    ''
  ).split(',')[0].trim()
  const requestHostName = requestHost.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase()
  const localRequest = !requestHostName || ['localhost', '127.0.0.1', '::1'].includes(requestHostName)
  const trustedTenantHeader = trustTenantHeader ? requestHeaders.get('x-pmd-tenant-host') : null
  const host = String(
    forceTenantOverride
      ? (process.env.PMD_TENANT_HOST_OVERRIDE || trustedTenantHeader || requestHost || process.env.PMD_PUBLIC_HOST || 'localhost:3002')
      : (!localRequest
          ? (trustedTenantHeader || requestHost || process.env.PMD_PUBLIC_HOST || process.env.PMD_TENANT_HOST_OVERRIDE || 'localhost:3002')
          : (trustedTenantHeader || process.env.PMD_TENANT_HOST_OVERRIDE || process.env.PMD_PUBLIC_HOST || requestHost || 'localhost:3002'))
  ).split(',')[0].trim()

  const previewAllowed = enabled(process.env.PMD_ENABLE_THEME_PREVIEW) || enabled(process.env.PMD_DEMO_MODE)
  const requestedPreview = routeThemeId || first(searchParams.preview_theme) || first(searchParams.theme)
  const requestedDemo = first(searchParams.demo)

  return {
    host,
    locale: first(searchParams.lang) || requestCookies.get('pmd_locale')?.value || null,
    tableId: routeTableId || first(searchParams.table_id) || first(searchParams.table) || null,
    tableNo: first(searchParams.table_no) || null,
    qr: first(searchParams.qr) || null,
    previewTheme: previewAllowed ? requestedPreview : null,
    forceDemo: previewAllowed && (requestedDemo === '1' || Boolean(routeThemeId)),
  }
}
