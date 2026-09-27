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

  if (setup?.frontendConfigured === false || explicitlyEmptyCatalog) {
    return <TenantSetupSplashV1 />
  }

  // PMD_TABLE_ENABLE_DISABLE_R40
  if (bootstrap.table.disabled) {
    const tableLabel = bootstrap.table.number || bootstrap.table.id
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#fbf8f2',
          color: '#242320',
          textAlign: 'center',
        }}
      >
        <section
          style={{
            width: 'min(440px, 100%)',
            padding: 28,
            border: '1px solid #d8b982',
            borderRadius: 24,
            background: 'rgba(255,255,255,.92)',
            boxShadow: '0 16px 44px rgba(36,35,32,.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24 }}>This table is currently unavailable.</h1>
          <p style={{ margin: '12px 0 0', color: '#6b6258', lineHeight: 1.6 }}>
            Please ask a member of staff for another table before ordering.
          </p>
          {tableLabel ? (
            <div
              style={{
                display: 'inline-flex',
                marginTop: 18,
                padding: '8px 14px',
                borderRadius: 999,
                background: '#eef7f3',
                color: '#075c47',
                fontWeight: 800,
              }}
            >
              Table {tableLabel}
            </div>
          ) : null}
        </section>
      </main>
    )
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
