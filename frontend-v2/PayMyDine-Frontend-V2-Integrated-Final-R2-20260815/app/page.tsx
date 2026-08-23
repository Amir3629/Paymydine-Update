import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { ServiceOverlaySimplifier } from '@/src/runtime/components/ServiceOverlaySimplifier'
import { TenantSetupWelcome } from '@/src/runtime/components/TenantSetupWelcome'
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

  const emptyTenantMenu = bootstrap.menu.items.length === 0 && bootstrap.menu.categories.length === 0

  if (emptyTenantMenu) {
    return <TenantSetupWelcome restaurantName={bootstrap.restaurant.name} />
  }

  return (
    <MenuRuntimeProvider bootstrap={bootstrap}>
      <ThemeRenderer themeId={bootstrap.theme.id} />
      <ThemeTableBadge />
      <ServiceOverlaySimplifier />
    </MenuRuntimeProvider>
  )
}
