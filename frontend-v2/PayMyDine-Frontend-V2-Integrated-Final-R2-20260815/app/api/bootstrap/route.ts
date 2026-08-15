import { loadCustomerBootstrap } from '@/src/server/bootstrap'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const trustTenantHeader = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.PMD_TRUST_TENANT_OVERRIDE_HEADER || '').trim().toLowerCase(),
  )
  const requestUrl = new URL(request.url)
  const host = String(
    process.env.PMD_TENANT_HOST_OVERRIDE ||
      (trustTenantHeader ? request.headers.get('x-pmd-tenant-host') : null) ||
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      'localhost:3002',
  )
    .split(',')[0]
    .trim()
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
