import { redirect } from 'next/navigation'

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LegacyMenuRoute({ searchParams }: PageProps) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) params.set(key, first)
  }
  redirect(params.size ? `/?${params.toString()}` : '/')
}
