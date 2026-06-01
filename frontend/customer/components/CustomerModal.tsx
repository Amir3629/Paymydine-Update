import type { ReactNode } from "react"

type CustomerModalProps = {
  title: string
  onBack: () => void
  children: ReactNode
}

export function CustomerModal({ title, onBack, children }: CustomerModalProps) {
  return (
    <div className="pmd-customer-modal-overlay" role="presentation">
      <section className="pmd-customer-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="pmd-customer-modal__header">
          <button type="button" className="pmd-customer-modal__icon-button" onClick={onBack} aria-label="Back">
            ←
          </button>
          <h2 className="pmd-customer-modal__title">{title}</h2>
          <span aria-hidden="true" />
        </header>
        <div className="pmd-customer-modal__body">{children}</div>
      </section>
    </div>
  )
}
