import { notFound } from 'next/navigation'
import { MenuRuntimeProvider } from '@/src/runtime/MenuRuntimeContext'
import { ThemeTableBadge } from '@/src/runtime/components/ThemeTableBadge'
import { loadCustomerBootstrap } from '@/src/server/bootstrap'
import { getPageContext } from '@/src/server/page-context'
import { isThemeId } from '@/src/themes/catalog'
import { ThemeRenderer } from '@/src/themes/ThemeRenderer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ themeId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ThemePreviewPage({ params, searchParams }: PageProps) {
  const [{ themeId }, rawSearch] = await Promise.all([params, searchParams])
  if (!isThemeId(themeId)) notFound()
  const context = await getPageContext(rawSearch, null, themeId)
  if (!context.forceDemo) notFound()
  const bootstrap = await loadCustomerBootstrap(context)

  return (
    <MenuRuntimeProvider bootstrap={bootstrap}>
      <ThemeRenderer themeId={bootstrap.theme.id} />
      <ThemeTableBadge />
    </MenuRuntimeProvider>
  )
}
