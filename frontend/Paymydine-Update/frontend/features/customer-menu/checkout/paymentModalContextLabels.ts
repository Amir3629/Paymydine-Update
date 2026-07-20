type PaymentModalContextLabelArgs = {
  tableDraft: any
  tableInfo: any
  submittedSnapshot: any
}

export function getPaymentModalContextLabels({
  tableDraft,
  tableInfo,
  submittedSnapshot,
}: PaymentModalContextLabelArgs) {
  const tableDisplayName =
    tableDraft?.table_name ||
    tableInfo?.table_name ||
    (tableDraft?.table_no || tableInfo?.table_no ? `Table ${tableDraft?.table_no || tableInfo?.table_no}` : "Delivery")

  const isTableContext = Boolean(tableInfo?.table_id || tableInfo?.table_no || tableDraft?.table_id || tableDraft?.table_no)
  const orderContextLabel = isTableContext ? "Table" : "Order type"
  const orderContextValue = isTableContext ? tableDisplayName : "Delivery"
  const submittedContextLabel = submittedSnapshot?.tableNumber || isTableContext ? "Table" : "Order type"
  const submittedContextValue = submittedSnapshot?.tableNumber ? `Table ${submittedSnapshot.tableNumber}` : orderContextValue

  return {
    tableDisplayName,
    isTableContext,
    orderContextLabel,
    orderContextValue,
    submittedContextLabel,
    submittedContextValue,
  }
}
