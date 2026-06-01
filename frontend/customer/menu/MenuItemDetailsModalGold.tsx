import type { ReactNode } from "react"
import { CustomerModal } from "../components/CustomerModal"
import { CustomerButton } from "../components/CustomerButton"

export function MenuItemDetailsModalGold({ title, description, image, price, onClose, onAdd }: { title: string; description?: string; image?: ReactNode; price: string; onClose: () => void; onAdd: () => void }) {
  return (
    <CustomerModal title={title} onBack={onClose}>
      <div className="pmd-checkout-gold">
        {image ? <div className="pmd-customer-menu-detail__media">{image}</div> : null}
        {description ? <p className="pmd-customer-muted">{description}</p> : null}
        <div className="pmd-checkout-gold__row"><strong>{price}</strong><CustomerButton variant="primary" onClick={onAdd}>Add</CustomerButton></div>
      </div>
    </CustomerModal>
  )
}
