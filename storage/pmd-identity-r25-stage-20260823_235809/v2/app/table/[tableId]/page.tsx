import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
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

  return (
    <MenuRuntimeProvider bootstrap={bootstrap}>
      <ThemeRenderer themeId={bootstrap.theme.id} />
      <ThemeTableBadge />
      <ServiceOverlaySimplifier />
    </MenuRuntimeProvider>
  )
}
