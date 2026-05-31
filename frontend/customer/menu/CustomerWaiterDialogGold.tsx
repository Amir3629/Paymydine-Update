import { useEffect, useState } from "react"
import { CheckCircle2, HandPlatter } from "lucide-react"
import { CustomerModal } from "../components/CustomerModal"
import { CustomerButton } from "../components/CustomerButton"
import { useLanguageStore } from "@/store/language-store"

export function CustomerWaiterDialogGold({
  isOpen,
  onOpenChange,
  tableName,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId?: string | null
  tableName?: string | null
}) {
  const { t } = useLanguageStore()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (isOpen) setConfirmed(false)
  }, [isOpen])

  if (!isOpen) return null

  const close = () => onOpenChange(false)

  return (
    <CustomerModal title={t("callWaiter")} onBack={close}>
      <div className="pmd-customer-service-dialog">
        <div className="pmd-customer-service-dialog__icon" aria-hidden="true">
          {confirmed ? <CheckCircle2 /> : <HandPlatter />}
        </div>
        <div className="pmd-customer-service-dialog__copy">
          <h3>{confirmed ? t("waiterComing") : t("callWaiter")}</h3>
          <p>
            {confirmed
              ? t("waiterCalledDesc")
              : tableName
                ? `${t("callWaiterConfirm")} (${tableName})`
                : t("callWaiterConfirm")}
          </p>
        </div>
        <div className="pmd-customer-service-dialog__actions">
          {confirmed ? (
            <CustomerButton variant="primary" onClick={close}>OK</CustomerButton>
          ) : (
            <>
              <CustomerButton variant="secondary" onClick={close}>{t("no")}</CustomerButton>
              <CustomerButton variant="primary" onClick={() => setConfirmed(true)}>{t("yes")}</CustomerButton>
            </>
          )}
        </div>
      </div>
    </CustomerModal>
  )
}
