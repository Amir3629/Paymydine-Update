"use client"

import { useCallback, useRef, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { TableOrderDraftItem, TableOrderDraftResponse } from "@/lib/api-client"
import type { TableOrderContext } from "./types"

type UseTableOrderActionsOptions = {
  context: TableOrderContext | null | undefined
  getGuestSessionId: () => string
  refreshDraft?: () => Promise<TableOrderDraftResponse | null>
}

type ConfirmTableDraftItemsOptions = {
  refreshAfterConfirm?: boolean
}

type SubmitTableDraftOptions = {
  draftId?: number | null
  refreshOnError?: boolean
}

function toActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useTableOrderActions({ context, getGuestSessionId, refreshDraft }: UseTableOrderActionsOptions) {
  const [isConfirmingDraftItems, setIsConfirmingDraftItems] = useState(false)
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)
  const [tableOrderActionError, setTableOrderActionError] = useState<string | null>(null)
  const confirmDraftItemsInFlightRef = useRef<Promise<TableOrderDraftResponse> | null>(null)
  const submitDraftInFlightRef = useRef<Promise<TableOrderDraftResponse> | null>(null)

  const confirmTableDraftItems = useCallback(async (
    items: TableOrderDraftItem[],
    options: ConfirmTableDraftItemsOptions = {},
  ): Promise<TableOrderDraftResponse> => {
    if (confirmDraftItemsInFlightRef.current) {
      return confirmDraftItemsInFlightRef.current
    }

    const request = (async () => {
      setIsConfirmingDraftItems(true)
      setTableOrderActionError(null)

      try {
        const result = await apiClient.confirmTableDraftItems({
          ...((context || {}) as TableOrderContext),
          guest_session_id: getGuestSessionId(),
          items,
        })

        if (options.refreshAfterConfirm) {
          await refreshDraft?.()
        }

        return result
      } catch (error) {
        setTableOrderActionError(toActionErrorMessage(error, "Failed to confirm table items"))
        throw error
      } finally {
        confirmDraftItemsInFlightRef.current = null
        setIsConfirmingDraftItems(false)
      }
    })()

    confirmDraftItemsInFlightRef.current = request
    return request
  }, [context, getGuestSessionId, refreshDraft])

  const submitTableDraft = useCallback(async (options: SubmitTableDraftOptions = {}): Promise<TableOrderDraftResponse> => {
    if (submitDraftInFlightRef.current) {
      return submitDraftInFlightRef.current
    }

    const request = (async () => {
      setIsSubmittingDraft(true)
      setTableOrderActionError(null)

      try {
        return await apiClient.submitTableDraft({
          ...((context || {}) as TableOrderContext),
          draft_id: options.draftId ?? null,
          guest_session_id: getGuestSessionId(),
        })
      } catch (error) {
        setTableOrderActionError(toActionErrorMessage(error, "Failed to submit table order"))
        if (options.refreshOnError) {
          await refreshDraft?.()
        }
        throw error
      } finally {
        submitDraftInFlightRef.current = null
        setIsSubmittingDraft(false)
      }
    })()

    submitDraftInFlightRef.current = request
    return request
  }, [context, getGuestSessionId, refreshDraft])

  return {
    isConfirmingDraftItems,
    isSubmittingDraft,
    tableOrderActionError,
    confirmTableDraftItems,
    submitTableDraft,
  }
}
