import { CustomerMenuRoute } from '../CustomerMenuRoute'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function KioskMenuPage({ searchParams }: PageProps) {
  const rawSearch = await searchParams
  return <CustomerMenuRoute rawSearch={rawSearch} forceKiosk />
}
