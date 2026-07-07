"use client"

import { useEffect, useState } from "react"
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
  const [missingRouteTable, setMissingRouteTable] = useState(false)

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
      setMissingRouteTable(true)
      return
    }

    setMissingRouteTable(false)

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

  // PMD_AUDIT_PHASE2_TABLE_REDIRECT_FRIENDLY
  if (missingRouteTable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8f2] px-6 text-center text-[#242320]">
        <div className="max-w-md rounded-3xl border border-[#d8b982] bg-white/85 p-6 shadow-sm">
          <h1 className="text-xl font-bold">Oops, we could not find your table.</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b6258]">Please scan the QR code on your table again, or ask a member of staff for help.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf8f2] text-[#242320]">
      <div>Opening your table menu...</div>
    </div>
  )
}
