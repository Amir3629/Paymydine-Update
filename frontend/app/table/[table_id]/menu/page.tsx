"use client"

import { useEffect } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import MenuPage from "../../../page"

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s === "undefined" || s === "null") return null
  return s
}

function TableMenuContextGate({ children }: any) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const routeTable =
    clean((params as any)?.table_id) ??
    clean(pathname.match(/^\/table\/([^/]+)\/menu(?:\/)?$/)?.[1]) ??
    clean(searchParams.get("table")) ??
    clean(searchParams.get("table_no"))

  const tableNo = clean(searchParams.get("table_no"))

  useEffect(() => {
    if (!routeTable) return

    const next = new URLSearchParams(searchParams.toString())
    let changed = false

    if (!clean(next.get("table_no"))) {
      next.set("table_no", routeTable)
      changed = true
    }

    if (!clean(next.get("table"))) {
      next.set("table", routeTable)
      changed = true
    }

    if (changed) {
      const target = `${pathname}?${next.toString()}`
      router.replace(target, { scroll: false })
    }
  }, [routeTable, pathname, router, searchParams])

  if (!routeTable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8f2] px-6 text-center text-[#242320]">
        <div className="max-w-md rounded-3xl border border-[#d8b982] bg-white/85 p-6 shadow-sm">
          <h1 className="text-xl font-bold">Oops, we could not find your table.</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b6258]">
            Please scan the QR code on your table again, or ask a member of staff for help.
          </p>
        </div>
      </div>
    )
  }

  if (!tableNo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8f2] text-[#242320]">
        <div>Opening your table menu...</div>
      </div>
    )
  }

  return children
}

export default function TableMenuPage(props: any) {
  return (
    <TableMenuContextGate>
      <MenuPage {...props} />
    </TableMenuContextGate>
  )
}
