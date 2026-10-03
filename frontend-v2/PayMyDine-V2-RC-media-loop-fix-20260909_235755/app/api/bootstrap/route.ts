import { loadCustomerBootstrap } from '@/src/server/bootstrap'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const trustTenantHeader = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.PMD_TRUST_TENANT_OVERRIDE_HEADER || '').trim().toLowerCase(),
  )
  const requestUrl = new URL(request.url)
  // PMD_DYNAMIC_TENANT_API_BOOTSTRAP_R29F
  // Public tenant authority is the real request host. The historical
  // PMD_TENANT_HOST_OVERRIDE remains only a localhost/tunnel fallback
  // unless PMD_FORCE_TENANT_HOST_OVERRIDE is explicitly enabled.
  const forceTenantOverride = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.PMD_FORCE_TENANT_HOST_OVERRIDE || '').trim().toLowerCase(),
  )
  const requestHost = String(
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '',
  ).split(',')[0].trim()
  const requestHostName = requestHost
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase()
  const localRequest = !requestHostName || ['localhost', '127.0.0.1', '::1'].includes(requestHostName)
  const trustedTenantHeader = trustTenantHeader ? request.headers.get('x-pmd-tenant-host') : null
  const host = String(
    forceTenantOverride
      ? (process.env.PMD_TENANT_HOST_OVERRIDE || trustedTenantHeader || requestHost || process.env.PMD_PUBLIC_HOST || 'localhost:3002')
      : (!localRequest
          ? (requestHost || trustedTenantHeader || process.env.PMD_PUBLIC_HOST || process.env.PMD_TENANT_HOST_OVERRIDE || 'localhost:3002')
          : (trustedTenantHeader || process.env.PMD_TENANT_HOST_OVERRIDE || process.env.PMD_PUBLIC_HOST || requestHost || 'localhost:3002'))
  ).split(',')[0].trim()
  const params = requestUrl.searchParams

  const bootstrap = await loadCustomerBootstrap({
    host,
    locale: params.get('lang'),
    tableId: params.get('table_id') || params.get('table'),
    tableNo: params.get('table_no'),
    qr: params.get('qr'),
    previewTheme: process.env.PMD_ENABLE_THEME_PREVIEW === 'true' ? params.get('theme') : null,
    forceDemo: process.env.PMD_DEMO_MODE === '1' && params.get('demo') === '1',
  })

  return Response.json(bootstrap, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
