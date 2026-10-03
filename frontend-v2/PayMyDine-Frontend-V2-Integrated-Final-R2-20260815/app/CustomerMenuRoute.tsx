import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { GuestAiConcierge } from '@/src/runtime/components/GuestAiConcierge'
import { ServiceOverlaySimplifier } from '@/src/runtime/components/ServiceOverlaySimplifier'
import { TenantSetupSplashV1 } from '@/src/runtime/components/TenantSetupSplashV1'
import { CustomerTableFallback } from '@/src/runtime/components/CustomerTableFallback'
import { ThemeTableBadge } from '@/src/runtime/components/ThemeTableBadge'
import { loadCustomerBootstrap } from '@/src/server/bootstrap'
import { getPageContext } from '@/src/server/page-context'
import { ThemeRenderer } from '@/src/themes/ThemeRenderer'

type RawSearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

function kioskEnabled(rawSearch: RawSearchParams, forceKiosk: boolean): boolean {
  if (forceKiosk) return true
  return first(rawSearch.pmd_kiosk).trim() === '1'
}

export async function CustomerMenuRoute({
  rawSearch,
  forceKiosk = false,
}: {
  rawSearch: RawSearchParams
  forceKiosk?: boolean
}) {
  if (first(rawSearch.pmd_kiosk_reset).trim() === '1') {
    return <main data-pmd-kiosk-reset="v6" style={{ minHeight: '100dvh', background: '#050508' }} />
  }

  const context = await getPageContext(rawSearch)
  const loadedBootstrap = await loadCustomerBootstrap(context)
  const isKiosk = kioskEnabled(rawSearch, forceKiosk)
  const kioskOrderType = first(rawSearch.kiosk_order_type).trim() === 'pickup' ? 'pickup' : 'kiosk'
  const kioskSession = first(rawSearch.kiosk_session).trim() || null

  const bootstrap = isKiosk
    ? {
        ...loadedBootstrap,
        runtime: {
          mode: 'kiosk' as const,
          kioskOrderType: kioskOrderType as 'kiosk' | 'pickup',
          kioskSession,
        },
        features: {
          ...loadedBootstrap.features,
          waiterCall: false,
          valet: false,
          tableOrdering: false,
          splitBill: false,
          socialLinks: false,
        },
        table: {
          ...loadedBootstrap.table,
          valid: false,
          disabled: false,
          id: null,
          number: null,
          name: kioskOrderType === 'pickup' ? 'Take Away' : 'Kiosk',
          qr: null,
        },
        activeOrder: null,
      }
    : {
        ...loadedBootstrap,
        runtime: {
          mode: 'customer' as const,
        },
      }

  const setup = bootstrap.setup
  const setupStatus = setup?.status
  const explicitlyEmptyCatalog = Boolean(
    setupStatus
    && setupStatus.hasCategories === false
    && setupStatus.hasMenuItems === false,
  )

  // Customer table/QR requests fail closed. Kiosk is intentionally table-less.
  if (!isKiosk) {
    const hasTableLookup = Boolean(context.tableId || context.tableNo || context.qr)
    if (bootstrap.table.disabled || (hasTableLookup && !bootstrap.table.valid)) {
      const tableLabel =
        bootstrap.table.number
        || bootstrap.table.id
        || context.tableNo
        || context.tableId

      return <CustomerTableFallback tableLabel={tableLabel} />
    }
  }

  if (setup?.frontendConfigured === false || explicitlyEmptyCatalog) {
    return <TenantSetupSplashV1 />
  }

  return (
    <MenuRuntimeProvider bootstrap={bootstrap}>
      <main data-pmd-runtime-mode={isKiosk ? 'kiosk-v6' : 'customer'}>
        <ThemeRenderer themeId={bootstrap.theme.id} />
      </main>
      {!isKiosk ? (
        <>
          <ThemeTableBadge />
          <ServiceOverlaySimplifier />
          <GuestAiConcierge themeId={bootstrap.theme.id} />
        </>
      ) : null}
    </MenuRuntimeProvider>
  )
}
