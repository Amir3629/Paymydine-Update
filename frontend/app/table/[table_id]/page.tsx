"use client"

import React, { useEffect, useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore } from "@/store/cart-store"
import { Logo } from "@/components/logo"
import { TableEntryView } from "@/customer/table/TableEntryView"
import { useSearchParams, useParams } from "next/navigation"
import { EnvironmentConfig } from "@/lib/environment-config"
import { setSavedHome } from "@/lib/table-home"
import { stickySearch } from "@/lib/sticky-query"
import { ApiClient } from "@/lib/api-client"

export default function TableHomePage({ params }: { params: { table_id: string } }) {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const { setTableInfo, clearCart } = useCartStore()
  const searchParams = useSearchParams()
  
  // ✅ Don't use React's experimental `use(...)` here; this is a client file.
  const routeParams = useParams<{ table_id: string }>()
  const pathParam =
    String(routeParams?.table_id || params?.table_id || "").trim() ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean)[1] || ""
      : "")
  
  const qr = searchParams.get("qr")
  const [table, setTable] = useState<any>(null)
  const [activeTableOrder, setActiveTableOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Save the home URL to sessionStorage on first landing
  useEffect(() => {
    const url = `/table/${pathParam}${stickySearch()}`;
    setSavedHome(url);
  }, [pathParam])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const envConfig = EnvironmentConfig.getInstance();
        // Prefer table_no (since /table/{no}), fall back once to table_id
        const base = envConfig.getApiEndpoint(
          `/table-info?table_no=${encodeURIComponent(pathParam)}${qr ? `&qr=${qr}` : ''}`,
        )
        let res = await fetch(base).then(r => r.json())
        if (!res?.success) {
          const fb = envConfig.getApiEndpoint(
            `/table-info?table_id=${encodeURIComponent(pathParam)}${qr ? `&qr=${qr}` : ''}`,
          )
          res = await fetch(fb).then(r => r.json())
        }
        if (!cancelled && res?.success) {
          console.info("[PMD QR entry] scanned table context", {
            route_table: pathParam,
            resolved_table_id: res.data?.table_id ?? null,
            resolved_table_no: res.data?.table_no ?? null,
            qr: qr ?? null,
          })

          setTable(res.data)
          const resolvedTableId = String(res.data.table_id)
          setTableInfo({
            table_id: resolvedTableId,
            table_no: res.data.table_no,
            table_name: res.data.table_name,
            location_id: res.data.location_id,
            qr_code: res.data.qr_code,
            path_table: pathParam,          // keep original path for navigation
          })

          const api = new ApiClient()
          const tableDraft = await api.getTableOrderDraft({ table_id: resolvedTableId, table_no: res.data?.table_no ?? pathParam, qr })
          console.info("[PMD QR entry] table draft response", {
            table_id: resolvedTableId,
            status: tableDraft?.status ?? null,
            draft_id: tableDraft?.draft_id ?? null,
            order_id: tableDraft?.order_id ?? null,
            success: tableDraft?.success ?? false,
          })
          if (!cancelled && tableDraft?.success && tableDraft?.status && tableDraft.status !== "empty" && tableDraft.status !== "paid") {
            setActiveTableOrder(tableDraft)
          }

          const pending = await api.getPendingQrOrderByTable(resolvedTableId, { tableNo: res.data?.table_no ?? pathParam, qr })
          console.info("[PMD QR entry] pending-qr response", {
            table_id: resolvedTableId,
            has_pending_order: !!pending?.data?.order_id,
            pending_order_id: pending?.data?.order_id ?? null,
            success: pending?.success ?? false,
          })
          if (!cancelled && pending?.success && pending?.data?.order_id) {
            setActiveTableOrder((current: any) => current || { status: "submitted_unpaid", order_id: pending.data.order_id })
          }

          // Always keep QR entry on the table home page; guests choose whether to open menu/order.
          clearCart()
          try {
            const cartState = useCartStore.getState() as any
            if (cartState?.isCartOpen === true) {
              useCartStore.setState({ isCartOpen: false })
            }
          } catch (e) {
            console.error("[PMD QR entry] failed to close stale cart drawer", e)
          }
        }
      } catch (e) {
        console.error('Failed to fetch table info:', e)
      } finally {
        !cancelled && setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // ✅ Fix dependency to use pathParam instead of undefined table_id
  }, [pathParam, qr, setTableInfo])


  const menuHref = `/table/${pathParam}/menu?qr=${qr || ''}`
  const valetHref = `/table/${pathParam}/valet?qr=${qr || ''}`
  const tableLabel = table?.table_name || (table?.table_no ? `Table ${table.table_no}` : `Table ${pathParam}`)

  return (
    <TableEntryView
      logo={<Logo />}
      tableLabel={tableLabel}
      menuHref={menuHref}
      valetHref={valetHref}
      menuLabel={t("menuCard")}
      valetLabel={t("valetParking")}
      loading={loading}
    />
  )
} 
