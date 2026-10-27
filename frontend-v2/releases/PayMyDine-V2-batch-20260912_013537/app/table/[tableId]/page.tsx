import { PmdGuestTableInactiveR17 } from '@/src/runtime/components/PmdGuestTableInactiveR17'
import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { GuestAiConcierge } from '@/src/runtime/components/GuestAiConcierge'
import { ServiceOverlaySimplifier } from '@/src/runtime/components/ServiceOverlaySimplifier'
import { ThemeTableBadge } from '@/src/runtime/components/ThemeTableBadge'
import { loadCustomerBootstrap } from '@/src/server/bootstrap'
import { getPageContext } from '@/src/server/page-context'
import { ThemeRenderer } from '@/src/themes/ThemeRenderer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ tableId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TableMenuPage({ params, searchParams }: PageProps) {
  const [{ tableId }, rawSearch] = await Promise.all([params, searchParams])
  const context = await getPageContext(rawSearch, tableId)
  const bootstrap = await loadCustomerBootstrap(context)

  // PMD_V2_TABLE_ROUTE_FAIL_CLOSED_R17
  if (bootstrap.table.disabled || !bootstrap.table.valid) {
    const tableLabel = bootstrap.table.number || bootstrap.table.id ||
      context.tableNo || context.tableId || tableId
    return <PmdGuestTableInactiveR17 tableLabel={tableLabel} />
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
