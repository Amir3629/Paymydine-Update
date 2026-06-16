"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient, type TableOrderDraftResponse } from "@/lib/api-client"
import { buildTableOrderDraftContext, createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import { useTableOrderActions } from "@/features/table-order/use-table-order-actions"

type UseCheckoutTableDraftSyncOptions = {
  isOpen: boolean
  tableInfo: any
  taxPercentage: number
  getGuestSessionId: () => string
  setSubmittedSnapshot: any
}

export function useCheckoutTableDraftSync({
  isOpen,
  tableInfo,
  taxPercentage,
  getGuestSessionId,
  setSubmittedSnapshot,
}: UseCheckoutTableDraftSyncOptions) {
  const [tableDraft, setTableDraft] = useState<TableOrderDraftResponse | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)

  const draftContext = useMemo(
    () =>
      buildTableOrderDraftContext(
        tableInfo,
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("qr") : null
      ),
    [tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code]
  )

  const refreshTableDraft = useCallback(async () => {
    const context = draftContext

    if (!context.table_id && !context.table_no && !context.qr) return null

    setDraftLoading(true)

    try {
      const latest = await apiClient.getTableOrderDraft(context)

      if (latest?.success) {
        setTableDraft(latest)

        console.info("PMD_TABLE_DRAFT_LOADED", {
          status: latest.status,
          draft_id: latest.draft_id ?? null,
          order_id: latest.order_id ?? null,
        })

        if (latest.order_id && latest.status && latest.status !== "draft" && latest.status !== "empty") {
          const normalizedLatestSnapshot = createSubmittedTableOrderSnapshot(latest, tableInfo, taxPercentage)

          setSubmittedSnapshot((prev: any) => {
            const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
            const latestOrderId = Number(normalizedLatestSnapshot.orderId || 0)

            return !prev || prevOrderId !== latestOrderId
              ? normalizedLatestSnapshot
              : { ...prev, ...normalizedLatestSnapshot }
          })

          console.info("PMD_TABLE_ORDER_PAYMENT_READY", {
            order_id: latest.order_id,
            status: latest.status,
          })
        }
      }

      return latest
    } finally {
      setDraftLoading(false)
    }
  }, [draftContext, tableInfo, taxPercentage, setSubmittedSnapshot])

  const {
    isSubmittingDraft: submitDraftLoading,
    confirmTableDraftItems: confirmTableDraftItemsAction,
    submitTableDraft: submitTableDraftAction,
  } = useTableOrderActions({
    context: draftContext,
    getGuestSessionId,
    refreshDraft: refreshTableDraft,
  })

  useEffect(() => {
    if (!isOpen) return

    void refreshTableDraft()

    const timer = window.setInterval(() => {
      void refreshTableDraft()
    }, 12000)

    const onFocus = () => {
      void refreshTableDraft()
    }

    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [isOpen, refreshTableDraft])

  return {
    tableDraft,
    setTableDraft,
    draftLoading,
    refreshTableDraft,
    submitDraftLoading,
    confirmTableDraftItemsAction,
    submitTableDraftAction,
  }
}
