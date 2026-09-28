import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { GuestAiConcierge } from '@/src/runtime/components/GuestAiConcierge'
import { ServiceOverlaySimplifier } from '@/src/runtime/components/ServiceOverlaySimplifier'
import { TenantSetupSplashV1 } from '@/src/runtime/components/TenantSetupSplashV1'
import { CustomerTableFallback } from '@/src/runtime/components/CustomerTableFallback'
import { ThemeTableBadge } from '@/src/runtime/components/ThemeTableBadge'
import { loadCustomerBootstrap } from '@/src/server/bootstrap'
import { getPageContext } from '@/src/server/page-context'
import { ThemeRenderer } from '@/src/themes/ThemeRenderer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CustomerMenuPage({ searchParams }: PageProps) {
  const rawSearch = await searchParams
  const context = await getPageContext(rawSearch)
  const bootstrap = await loadCustomerBootstrap(context)

  // PMD_NEW_TENANT_SETUP_SPLASH_V2
  // The legacy customer frontend rendered the first-time setup card from the
  // /api/v1/menu readiness response. Frontend V2 became the customer authority
  // but never carried that render branch across.
  //
  // Clean tenant provisioning already writes baseline logo/name/settings, so the
  // old aggregate is_frontend_configured flag can be true before the owner has
  // created any real customer menu. Treat the explicit catalog sub-state as the
  // launch authority: zero categories + zero menu items is the genuine new-tenant
  // state. If setup metadata is unavailable, fail safe and render the normal menu.
  const setup = bootstrap.setup
  const setupStatus = setup?.status
  const explicitlyEmptyCatalog = Boolean(
    setupStatus
    && setupStatus.hasCategories === false
    && setupStatus.hasMenuItems === false,
  )

  // PMD_CUSTOMER_TABLE_FALLBACK_R43
  // A table/QR lookup must fail closed into PayMyDine UI before any setup/menu
  // branch. This guarantees stale/removed/wrong table QR links never reveal an
  // unrelated page just because the tenant is also in first-time setup.
  const hasTableLookup = Boolean(context.tableId || context.tableNo || context.qr)
  if (bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)) {
    const tableLabel =
      bootstrap.table.number
      || bootstrap.table.id
      || context.tableNo
      || context.tableId

    return <CustomerTableFallback tableLabel={tableLabel} />
  }

  if (setup?.frontendConfigured === false || explicitlyEmptyCatalog) {
    return <TenantSetupSplashV1 />
  }

  return (
    <MenuRuntimeProvider bootstrap={bootstrap}>
      <ThemeRenderer themeId={bootstrap.theme.id} />
      <ThemeTableBadge />
      <ServiceOverlaySimplifier />
      <GuestAiConcierge themeId={bootstrap.theme.id} />
    </MenuRuntimeProvider>
  )
}
