"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { TableOrderDraftResponse } from "@/lib/api-client"
import { hasTableOrderDraftContext, isVisibleTableOrderDraft } from "./table-order-utils"
import type { TableOrderContext } from "./types"

type UseTableOrderDraftOptions = {
  context: TableOrderContext | null | undefined
  enabled?: boolean
  pollIntervalMs?: number
  refreshOnFocus?: boolean
  keepEmptyDrafts?: boolean
}

export function useTableOrderDraft({
  context,
  enabled = true,
  pollIntervalMs = 0,
  refreshOnFocus = false,
  keepEmptyDrafts = false,
}: UseTableOrderDraftOptions) {
  const [tableDraft, setTableDraft] = useState<TableOrderDraftResponse | null>(null)
  const [isDraftLoading, setIsDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const refreshDraft = useCallback(async () => {
    if (!enabled || !hasTableOrderDraftContext(context)) {
      setTableDraft(null)
      return null
    }

    setIsDraftLoading(true)
    setDraftError(null)

    try {
      const latest = await apiClient.getTableOrderDraft(context as TableOrderContext)
      if (keepEmptyDrafts || isVisibleTableOrderDraft(latest)) {
        setTableDraft(latest)
      } else {
        setTableDraft(null)
      }
      return latest
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch table order draft"
      setDraftError(message)
      return null
    } finally {
      setIsDraftLoading(false)
    }
  }, [context, enabled, keepEmptyDrafts])

  const resetDraft = useCallback(() => {
    setTableDraft(null)
    setDraftError(null)
    setIsDraftLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled || !hasTableOrderDraftContext(context)) {
      resetDraft()
      return
    }

    let cancelled = false
    const load = async () => {
      if (cancelled) return
      await refreshDraft()
    }

    void load()

    const timer = pollIntervalMs > 0 ? window.setInterval(load, pollIntervalMs) : null
    const onFocus = () => { void load() }

    if (refreshOnFocus) {
      window.addEventListener("focus", onFocus)
    }

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      if (refreshOnFocus) window.removeEventListener("focus", onFocus)
    }
  }, [context, enabled, pollIntervalMs, refreshDraft, refreshOnFocus, resetDraft])

  return {
    tableDraft,
    isDraftLoading,
    draftError,
    refreshDraft,
    resetDraft,
    setTableDraft,
  }
}
