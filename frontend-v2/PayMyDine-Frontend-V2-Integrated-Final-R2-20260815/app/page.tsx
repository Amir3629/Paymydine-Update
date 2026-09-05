import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { GuestAiConcierge } from '@/src/runtime/components/GuestAiConcierge'
import { ServiceOverlaySimplifier } from '@/src/runtime/components/ServiceOverlaySimplifier'
import { TenantSetupSplashV1 } from '@/src/runtime/components/TenantSetupSplashV1'
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
  // /api/v1/menu readiness flag. Frontend V2 became the customer authority but
  // did not carry that render branch across. Restore the same fail-safe behavior:
  // only an explicit false from the canonical tenant menu API may replace the
  // guest menu with the owner setup CTA.
  if (bootstrap.setup?.frontendConfigured === false) {
    return <TenantSetupSplashV1 locale={bootstrap.restaurant.locale} />
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
