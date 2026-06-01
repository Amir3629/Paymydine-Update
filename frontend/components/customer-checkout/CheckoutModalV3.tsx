"use client"

import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

type CheckoutModalV3Props = {
  title: string
  onBack: () => void
  children: ReactNode
}

export default function CheckoutModalV3({ title, onBack, children }: CheckoutModalV3Props) {
  return (
    <div className="pmd-checkout-v3-overlay" data-pmd-checkout-v3="1">
      <section className="pmd-checkout-v3-shell" aria-label={title}>
        <header className="pmd-checkout-v3-header">
          <button
            type="button"
            className="pmd-checkout-v3-back"
            onClick={onBack}
            aria-label="Go back"
            data-pmd-checkout-v3-action="primary"
          >
            <ArrowLeft aria-hidden="true" className="pmd-checkout-v3-back-icon" />
          </button>
          <h2 className="pmd-checkout-v3-title">{title}</h2>
          <div className="pmd-checkout-v3-header-spacer" aria-hidden="true" />
        </header>
        <div className="pmd-checkout-v3-body" data-pmd-checkout-v3-scroll="1">
          {children}
        </div>
      </section>
    </div>
  )
}
