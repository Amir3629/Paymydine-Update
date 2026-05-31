import type { ReactNode } from "react"
import { CustomerButton } from "../components/CustomerButton"

export function MenuItemCardGold({ name, description, price, image, onSelect, onAdd }: { name: string; description?: string; price: string; image?: ReactNode; onSelect: () => void; onAdd: () => void }) {
  return (
    <article className="pmd-customer-menu-card">
      <button type="button" className="pmd-customer-menu-card__media" onClick={onSelect}>{image}</button>
      <div className="pmd-customer-menu-card__body">
        <button type="button" className="pmd-customer-menu-card__title" onClick={onSelect}>{name}</button>
        {description ? <p className="pmd-customer-menu-card__desc">{description}</p> : null}
        <div className="pmd-customer-menu-card__footer"><strong>{price}</strong><CustomerButton variant="primary" onClick={onAdd}>+</CustomerButton></div>
      </div>
    </article>
  )
}
