import type { ReactNode } from "react"
import { CustomerButton } from "../components/CustomerButton"

export function MenuItemCardGold({ name, description, price, image, badges, quantity = 0, onSelect, onAdd }: { name: string; description?: string; price: string; image?: ReactNode; badges?: ReactNode; quantity?: number; onSelect: () => void; onAdd: () => void }) {
  return (
    <article className="pmd-customer-menu-card">
      <button type="button" className="pmd-customer-menu-card__media" onClick={onSelect} aria-label={`View ${name}`}>
        <span className="pmd-customer-menu-card__image-frame">{image}</span>
      </button>
      <div className="pmd-customer-menu-card__body">
        <button type="button" className="pmd-customer-menu-card__title" onClick={onSelect}>{name}</button>
        {description ? <p className="pmd-customer-menu-card__desc">{description}</p> : null}
        {badges ? <div className="pmd-customer-menu-card__badges">{badges}</div> : null}
        <strong className="pmd-customer-menu-card__price">{price}</strong>
      </div>
      <CustomerButton className="pmd-customer-menu-card__add" variant="primary" onClick={onAdd} aria-label={`Add ${name}`}>
        {quantity > 0 ? quantity : "+"}
      </CustomerButton>
    </article>
  )
}
