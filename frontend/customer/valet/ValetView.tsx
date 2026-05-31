import { Car, CheckCircle2 } from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerButton } from "../components/CustomerButton"
import { CustomerCard } from "../components/CustomerCard"
import { CustomerHeader } from "../components/CustomerHeader"
import { CustomerInput } from "../components/CustomerInput"

export type ValetFormData = { name: string; car: string; plate: string }

export function ValetView({ logo, isSuccess, isSubmitting, formData, labels, onInputChange, onSubmit, onHome }: {
  logo?: ReactNode
  isSuccess: boolean
  isSubmitting: boolean
  formData: ValetFormData
  labels: Record<string, string>
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent) => void
  onHome: () => void
}) {
  return (
    <CustomerShell page="valet">
      <main className="pmd-customer-shell__inner" style={{ maxWidth: "34rem" }}>
        <div className="pmd-customer-logo-area__mark">{logo}</div>
        {!isSuccess ? (
          <CustomerCard className="p-5 sm:p-6">
            <CustomerHeader eyebrow="Valet" title={labels.valetService} subtitle={labels.valetAvailability} action={<span className="pmd-customer-badge"><Car aria-hidden="true" /> Service</span>} />
            <form onSubmit={onSubmit} className="pmd-checkout-gold__stack">
              <label className="pmd-checkout-gold__stack">
                <span>{labels.enterName} *</span>
                <CustomerInput id="name" value={formData.name} onChange={onInputChange} placeholder={labels.enterName} required />
              </label>
              <label className="pmd-checkout-gold__stack">
                <span>{labels.licensePlate} *</span>
                <CustomerInput id="plate" value={formData.plate} onChange={onInputChange} placeholder={labels.enterLicensePlate} required />
              </label>
              <label className="pmd-checkout-gold__stack">
                <span>{labels.carDetails} <small className="pmd-customer-muted">{labels.optional}</small></span>
                <CustomerInput id="car" value={formData.car} onChange={onInputChange} placeholder={labels.enterCarDetails} />
              </label>
              <CustomerButton type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? labels.submitting : labels.requestValet}</CustomerButton>
            </form>
          </CustomerCard>
        ) : (
          <CustomerCard className="p-6 sm:p-8 text-center">
            <div className="pmd-customer-action-tile__icon" style={{ margin: "0 auto 1rem" }}><CheckCircle2 aria-hidden="true" /></div>
            <h2 className="pmd-checkout-gold__section-title">{labels.valetRequestSuccess}</h2>
            <p className="pmd-customer-muted">{labels.valetConfirmation}</p>
            <div style={{ marginTop: "1.25rem" }}><CustomerButton variant="primary" onClick={onHome}>{labels.backToHome}</CustomerButton></div>
          </CustomerCard>
        )}
        <CustomerCard soft className="p-4 mt-4">
          <p className="pmd-customer-muted">{labels.valetTicket}</p>
        </CustomerCard>
      </main>
    </CustomerShell>
  )
}
