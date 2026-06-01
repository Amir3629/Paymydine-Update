import { CheckCircle2 } from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerButton } from "../components/CustomerButton"
import { CustomerCard } from "../components/CustomerCard"
import { CustomerInput } from "../components/CustomerInput"
import { CustomerTopBar } from "../components/CustomerTopBar"

export type ValetFormData = { name: string; car: string; plate: string }

export function ValetView({ isSuccess, isSubmitting, formData, labels, onInputChange, onSubmit, onHome }: {
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
      <main className="pmd-customer-shell__inner pmd-customer-valet">
        <CustomerTopBar contextLabel="Valet" backHref="/" />
        {!isSuccess ? (
          <CustomerCard className="pmd-customer-valet-card">
            <div className="pmd-customer-valet-heading">
              <h1>{labels.valetService}</h1>
              <p className="pmd-customer-muted">{labels.valetAvailability}</p>
            </div>
            <form onSubmit={onSubmit} className="pmd-customer-valet-form">
              <label className="pmd-customer-valet-field">
                <span>{labels.enterName} *</span>
                <CustomerInput id="name" value={formData.name} onChange={onInputChange} placeholder={labels.enterName} required />
              </label>
              <label className="pmd-customer-valet-field">
                <span>{labels.licensePlate} *</span>
                <CustomerInput id="plate" value={formData.plate} onChange={onInputChange} placeholder={labels.enterLicensePlate} required />
              </label>
              <label className="pmd-customer-valet-field">
                <span>{labels.carDetails} <small className="pmd-customer-muted">{labels.optional}</small></span>
                <CustomerInput id="car" value={formData.car} onChange={onInputChange} placeholder={labels.enterCarDetails} />
              </label>
              <CustomerButton className="pmd-customer-valet-submit" type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? labels.submitting : labels.requestValet}</CustomerButton>
            </form>
          </CustomerCard>
        ) : (
          <CustomerCard className="pmd-customer-valet-card pmd-customer-valet-card--success">
            <div className="pmd-customer-valet-success-icon"><CheckCircle2 aria-hidden="true" /></div>
            <h2 className="pmd-checkout-gold__section-title">{labels.valetRequestSuccess}</h2>
            <p className="pmd-customer-muted">{labels.valetConfirmation}</p>
            <CustomerButton variant="primary" onClick={onHome}>{labels.backToHome}</CustomerButton>
          </CustomerCard>
        )}
        <CustomerCard soft className="pmd-customer-valet-note">
          <p className="pmd-customer-muted">{labels.valetTicket}</p>
        </CustomerCard>
      </main>
    </CustomerShell>
  )
}
