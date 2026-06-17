import { useEffect, useMemo } from "react"
import { buildTableOrderDraftContext } from "@/features/table-order/table-order-utils"

type SearchParamsLike = {
  get(name: string): string | null
}

export function useTableQrContext({
  searchParams,
  tableInfo,
  setTableInfoState,
}: {
  searchParams: SearchParamsLike | null
  tableInfo: any
  setTableInfoState: (value: any) => void
}) {
  const sharedTableOrderQr = searchParams?.get("qr") || null
  const spTableNo = searchParams?.get("table_no") ?? null
  const spTableId = searchParams?.get("table_id") ?? null
  const isRootDeliveryMode = !spTableNo && !spTableId
  const spQr = searchParams?.get("qr") ?? null

  useEffect(() => {
    if (isRootDeliveryMode) {
      setTableInfoState(null)
    }
  }, [isRootDeliveryMode, setTableInfoState])

  const tableNo = (tableInfo?.table_no ?? spTableNo) ?? null
  const tableId = (tableInfo?.table_id ?? spTableId) ?? null
  const tableIdString = String(tableId ?? "").trim()
  const tableName = tableInfo?.table_name ?? undefined

  const displayTableNumber =
    tableInfo?.table_no ?? spTableNo ?? tableInfo?.table_id ?? spTableId ?? null

  const sharedTableOrderContext = useMemo(
    () => buildTableOrderDraftContext(tableInfo, sharedTableOrderQr),
    [tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code, sharedTableOrderQr],
  )

  return {
    sharedTableOrderQr,
    sharedTableOrderContext,
    spQr,
    tableIdString,
    tableName,
    displayTableNumber,
    isRootDeliveryMode,
  }
}
