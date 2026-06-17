import { useEffect, type MutableRefObject } from "react"
import {
  categories,
  defaultMenuHighlightSettings,
  getMenuData,
  menuData,
  type MenuHighlightSettings,
  type MenuItem,
} from "@/lib/data"
import { apiClient } from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"

type SearchParamsLike = {
  get(name: string): string | null
}

type PendingSettlementSummary = {
  orderTotal: number
  settledAmount: number
  remainingAmount: number
} | null

export function useMenuLoader({
  searchParams,
  apiMenuItems,
  selectedCategory,
  setSelectedCategory,
  setIsLoading,
  setIsFrontendConfigured,
  setApiMenuItems,
  setMenuHighlightSettings,
  setDynamicCategories,
  setTableInfoState,
  setTableInfo,
  clearCart,
  setPaymentModalOpen,
  setExistingOrderId,
  setPendingSettlementSummary,
  setLocalOpenOrder,
  setHasLocalOpenOrder,
  hydratedPendingOrderRef,
  existingOrderId,
  loadVATSettings,
}: {
  searchParams: SearchParamsLike
  apiMenuItems: MenuItem[]
  selectedCategory: string
  setSelectedCategory: (value: string) => void
  setIsLoading: (value: boolean) => void
  setIsFrontendConfigured: (value: boolean) => void
  setApiMenuItems: (items: MenuItem[]) => void
  setMenuHighlightSettings: (settings: MenuHighlightSettings) => void
  setDynamicCategories: (categories: string[]) => void
  setTableInfoState: (value: any) => void
  setTableInfo: (value: any) => void
  clearCart: () => void
  setPaymentModalOpen: (value: boolean) => void
  setExistingOrderId: (value: number | null) => void
  setPendingSettlementSummary: (value: PendingSettlementSummary) => void
  setLocalOpenOrder: (value: any | null | ((previous: any | null) => any | null)) => void
  setHasLocalOpenOrder: (value: boolean) => void
  hydratedPendingOrderRef: MutableRefObject<number | null>
  existingOrderId: number | null
  loadVATSettings: () => void | Promise<void>
}) {
  const MENU_CACHE_TTL_MS = 5 * 60 * 1000

  const getMenuCacheKey = () => {
    if (typeof window === "undefined") return ""
    return `pmd-menu-cache:${window.location.host}:${window.location.pathname}?${window.location.search}`
  }

  useEffect(() => {
    setSelectedCategory("All")
  }, [setSelectedCategory])

  useEffect(() => {
    if (apiMenuItems.length > 0) {
      setSelectedCategory("All")
    }
  }, [apiMenuItems.length, setSelectedCategory])

  useEffect(() => {
    loadVATSettings()
  }, [loadVATSettings])

  useEffect(() => {
    async function loadMenuData() {
      try {
        setIsLoading(true)
        console.log("Loading menu data...")

        const cacheKey = getMenuCacheKey()
        if (cacheKey) {
          try {
            const rawCache = localStorage.getItem(cacheKey)
            if (rawCache) {
              const parsed = JSON.parse(rawCache)
              const isFresh =
                parsed?.timestamp &&
                Date.now() - Number(parsed.timestamp) < MENU_CACHE_TTL_MS

              if (isFresh) {
                setApiMenuItems(Array.isArray(parsed.items) ? parsed.items : [])
                setDynamicCategories(Array.isArray(parsed.categories) ? parsed.categories : [])
                if (parsed.menuHighlightSettings) {
                  setMenuHighlightSettings({
                    ...defaultMenuHighlightSettings,
                    ...parsed.menuHighlightSettings,
                  })
                }
                console.info("PMD_MENU_CACHE_HIT")
              } else {
                console.info("PMD_MENU_CACHE_MISS")
              }
            } else {
              console.info("PMD_MENU_CACHE_MISS")
            }
          } catch {
            console.info("PMD_MENU_CACHE_MISS")
          }
        }

        const table_id = searchParams.get("table_id")
        const table_no = searchParams.get("table_no")
        const qr = searchParams.get("qr")
        const tableParam = table_no || table_id

        if (tableParam) {
          try {
            const useTableNo = !!table_no
            const tableResult = await apiClient.getTableInfo(tableParam, qr || undefined, useTableNo)

            if (tableResult.success) {
              const normalizedTableInfo = {
                table_id: String(tableResult.data.table_id ?? tableParam),
                table_name: String(tableResult.data.table_name ?? ""),
                location_id: Number(tableResult.data.location_id ?? 1),
                qr_code: tableResult.data.qr_code ?? null,
                table_no:
                  tableResult.data.table_no != null
                    ? Number(tableResult.data.table_no)
                    : undefined,
              }

              setTableInfoState(normalizedTableInfo)
              setTableInfo(normalizedTableInfo)

              const pendingQr = await apiClient.getPendingQrOrderByTable(
                String(tableResult.data.table_id),
                { tableNo: tableResult.data?.table_no ?? table_no ?? null, qr: qr || null },
              )

              if (pendingQr?.success && pendingQr.data?.order_id) {
                const pendingId = Number(pendingQr.data.order_id)

                setExistingOrderId(pendingId)
                setPendingSettlementSummary({
                  orderTotal: Number((pendingQr.data as any).order_total || 0),
                  settledAmount: Number((pendingQr.data as any).settled_amount || 0),
                  remainingAmount: Number((pendingQr.data as any).remaining_amount || 0),
                })
                setLocalOpenOrder({
                  orderId: pendingId,
                  status: "submitted_unpaid",
                  paymentStatus: "unpaid",
                  tableNumber: tableResult.data?.table_no ?? table_no ?? null,
                  total: Number((pendingQr.data as any).order_total || 0),
                  orderTotal: Number((pendingQr.data as any).order_total || 0),
                  settledAmount: Number((pendingQr.data as any).settled_amount || 0),
                  remainingAmount: Number((pendingQr.data as any).remaining_amount || 0),
                  submittedItems: pendingQr.data.items || [],
                  payment: "qr_pay_later",
                })
                setHasLocalOpenOrder(true)

                if (hydratedPendingOrderRef.current !== pendingId) {
                  hydratedPendingOrderRef.current = pendingId
                  try {
                    const state = useCartStore.getState() as any
                    if (state?.isCartOpen === true) useCartStore.setState({ isCartOpen: false })
                  } catch (e) {
                    console.error("[PMD] close drawer after table order sync failed", e)
                  }
                }
              } else {
                const hadPendingContext =
                  hydratedPendingOrderRef.current !== null || existingOrderId !== null

                setExistingOrderId(null)
                setPendingSettlementSummary(null)
                hydratedPendingOrderRef.current = null

                if (hadPendingContext) {
                  console.info("[PMD QR fallback] No pending QR order, restoring normal menu flow", {
                    table_id: tableResult?.data?.table_id ?? null,
                    table_no: tableResult?.data?.table_no ?? null,
                  })

                  clearCart()

                  try {
                    const state = useCartStore.getState() as any
                    if (state?.isCartOpen === true) {
                      useCartStore.setState({ isCartOpen: false })
                    }
                  } catch (e) {
                    console.error("[PMD QR fallback] close drawer failed", e)
                  }

                  setPaymentModalOpen(false)
                }
              }
            }
          } catch (error) {
            console.error("Failed to fetch table info:", error)
          }
        }

        const menuResult = await getMenuData()

        setApiMenuItems(menuResult.menuItems)
        setDynamicCategories(menuResult.categoryNames)
        setIsFrontendConfigured(menuResult.isFrontendConfigured ?? true)
        setMenuHighlightSettings(menuResult.menuHighlightSettings || defaultMenuHighlightSettings)

        if (cacheKey) {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              categories: menuResult.categoryNames,
              items: menuResult.menuItems,
              timestamp: Date.now(),
              menuHighlightSettings: menuResult.menuHighlightSettings,
              menuCacheVersion: menuResult.menuCacheVersion,
            }),
          )
          console.info("PMD_MENU_CACHE_REFRESHED")
        }
      } catch (error) {
        console.error("Failed to load menu data:", error)
        setApiMenuItems(menuData)
        setDynamicCategories(categories)
        setSelectedCategory("All")
      } finally {
        setIsLoading(false)
      }
    }

    loadMenuData()
  }, [searchParams, setTableInfo, clearCart, setPaymentModalOpen])
}
