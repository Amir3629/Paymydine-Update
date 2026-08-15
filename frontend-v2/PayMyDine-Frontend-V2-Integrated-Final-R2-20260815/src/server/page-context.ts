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
  const host = String(
    process.env.PMD_TENANT_HOST_OVERRIDE ||
    (trustTenantHeader ? requestHeaders.get('x-pmd-tenant-host') : null) ||
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    process.env.PMD_PUBLIC_HOST ||
    'localhost:3002'
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
