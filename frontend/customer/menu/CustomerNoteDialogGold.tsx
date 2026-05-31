import { NotebookPen } from "lucide-react"
import { CustomerModal } from "../components/CustomerModal"
import { CustomerButton } from "../components/CustomerButton"
import { useLanguageStore } from "@/store/language-store"

export function CustomerNoteDialogGold({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
  tableName,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (value: string) => void
  onSend: () => void | Promise<void>
  tableId?: string | null
  tableName?: string | null
}) {
  const { t } = useLanguageStore()

  if (!isOpen) return null

  return (
    <CustomerModal title={t("leaveNoteTitle")} onBack={() => onOpenChange(false)}>
      <div className="pmd-customer-service-dialog">
        <div className="pmd-customer-service-dialog__icon" aria-hidden="true">
          <NotebookPen />
        </div>
        <div className="pmd-customer-service-dialog__copy">
          <h3>{t("leaveNoteTitle")}</h3>
          <p>{tableName ? `${t("leaveNoteDesc")} (${tableName})` : t("leaveNoteDesc")}</p>
        </div>
        <label className="pmd-customer-service-dialog__field">
          <span>{t("notePlaceholder")}</span>
          <textarea
            className="pmd-customer-textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={1000}
            rows={5}
          />
        </label>
        <div className="pmd-customer-service-dialog__actions">
          <CustomerButton variant="secondary" onClick={() => onOpenChange(false)}>{t("cancel")}</CustomerButton>
          <CustomerButton variant="primary" onClick={onSend}>{t("sendNote")}</CustomerButton>
        </div>
      </div>
    </CustomerModal>
  )
}
