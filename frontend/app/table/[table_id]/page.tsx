"use client"

import React, { useEffect, useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsConfigStore } from "@/store/cms/cms-config-store"
import { useCartStore } from "@/store/cart-store"
import { Logo } from "@/components/logo"
import { Car, ReceiptText, Utensils } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useSearchParams, useParams } from "next/navigation"
import { EnvironmentConfig } from "@/lib/environment-config"
import { setSavedHome } from "@/lib/table-home"
import { stickySearch } from "@/lib/sticky-query"
import { ApiClient } from "@/lib/api-client"
import { isValetFeatureEnabled } from "@/features/valet/valet-config"

const MotionLink = motion.create(Link)

export default function TableHomePage({ params }: { params: { table_id: string } }) {
  const { t } = useLanguageStore()
  const { settings } = useCmsConfigStore()
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
            const pendingOrderId = pending.data.order_id
            setActiveTableOrder((current: any) => current || { status: "submitted_unpaid", order_id: pendingOrderId })
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

  const cardStyles = "relative flex flex-col items-center pmd-v2-card backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 w-72 h-56 justify-center home-action-card"
  const iconContainerStyles = "mb-6 pmd-home-action-icon-direct"
  const iconCircleStyle = {
    width: "7.25rem",
    height: "7.25rem",
    minWidth: "7.25rem",
    minHeight: "7.25rem",
    maxWidth: "7.25rem",
    maxHeight: "7.25rem",
    padding: 0,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#062F2A",
    backgroundColor: "#062F2A",
    backgroundImage: "none",
    color: "#FFFFFF",
    WebkitTextFillColor: "#FFFFFF",
    border: "1px solid #062F2A",
    boxShadow: "0 14px 32px rgba(6, 47, 42, 0.18)",
    overflow: "hidden",
  }
  const iconSvgStyle = {
    color: "#FFFFFF",
    stroke: "#FFFFFF",
    WebkitTextFillColor: "#FFFFFF",
  }
  const showValet = isValetFeatureEnabled(settings, table)
  const menuHref = `/table/${pathParam}/menu?qr=${qr || ''}`
  const tableOrderHref = `/menu?table_no=${encodeURIComponent(String(table?.table_no || pathParam))}&table_id=${encodeURIComponent(String(table?.table_id || pathParam))}&table=${encodeURIComponent(String(table?.table_no || pathParam))}${qr ? `&qr=${encodeURIComponent(qr)}` : ''}${activeTableOrder?.order_id ? `&pending_order_id=${encodeURIComponent(String(activeTableOrder.order_id))}` : ''}`

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background flex flex-col items-center justify-center p-4">
        <div className="text-lg" style={{ color: 'var(--theme-primary)' }}>Loading table information...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-background pmd-v2-page pmd-customer-page page--table flex flex-col items-center justify-center p-4" data-pmd-customer-page="table">
      {/* FIXED: Use Logo without tableNumber prop - it will get it from cart store */}
      <Logo className="mb-8" />

      <div className="flex flex-row flex-wrap gap-6 justify-center">
        <MotionLink
          href={menuHref}
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500"
            style={{
              background: `linear-gradient(to right, var(--theme-primary)/30, var(--theme-secondary)/30)`
            }}
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              style={iconCircleStyle}
              variants={{
                hover: {
                  scale: 1.06,
                  backgroundColor: "#021F1C",
                },
                initial: {
                  scale: 1,
                  backgroundColor: "#062F2A",
                }
              }}
            >
              <Utensils className="w-12 h-12" strokeWidth={2.35} style={iconSvgStyle} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {t("menuCard")}
            </h2>
          </motion.div>
        </MotionLink>
        {/* PMD: View table order card hidden. Homepage keeps only Menu and Valet Parking. */}

        {showValet && (
        <MotionLink
          href={`/table/${pathParam}/valet?qr=${qr || ''}`}
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500"
            style={{
              background: `linear-gradient(to right, var(--theme-primary)/30, var(--theme-secondary)/30)`
            }}
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              style={iconCircleStyle}
              variants={{
                hover: {
                  scale: 1.06,
                  backgroundColor: "#021F1C",
                },
                initial: {
                  scale: 1,
                  backgroundColor: "#062F2A",
                }
              }}
            >
              <Car className="w-12 h-12" strokeWidth={2.35} style={iconSvgStyle} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {t("valetParking")}
            </h2>
          </motion.div>
        </MotionLink>
        )}
      </div>

    </div>
  )
}
