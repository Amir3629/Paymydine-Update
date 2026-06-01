import type { ReactNode } from "react"

export function CustomerHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pmd-customer-header">
      <div>
        {eyebrow ? <p className="pmd-customer-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="pmd-customer-header__title">{title}</h1>
        {subtitle ? <p className="pmd-customer-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="pmd-customer-header__action">{action}</div> : null}
    </header>
  )
}
