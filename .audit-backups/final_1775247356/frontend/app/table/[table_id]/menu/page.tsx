"use client"

import { useEffect } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s === "undefined" || s === "null") return null
  return s
}

export default function TableMenuRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const params = useParams()

  useEffect(() => {
    const routeParam =
      clean(params?.table_id) ??
      clean(pathname.match(/^\/table\/([^\/]+)\/menu(?:\/)?$/)?.[1])

    if (!routeParam) {
      console.error("[PMD menu redirect] missing route table_id", {
        pathname,
        params,
        href: typeof window !== "undefined" ? window.location.href : null,
      })
      return
    }

    const menuUrl = new URL("/menu", window.location.origin)
    menuUrl.searchParams.set("table_no", routeParam)

    for (const [key, value] of searchParams.entries()) {
      if (key === "table_no") continue
      menuUrl.searchParams.set(key, value)
    }

    const target = menuUrl.pathname + menuUrl.search
    if (target !== window.location.pathname + window.location.search) {
      router.replace(target)
    }
  }, [params, pathname, router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Redirecting to menu...</div>
    </div>
  )
}
