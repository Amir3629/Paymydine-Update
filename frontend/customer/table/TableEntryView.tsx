import { Car, Utensils } from "lucide-react"
import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerLogoArea } from "../components/CustomerLogoArea"
import { CustomerActionTile } from "../home/CustomerActionTile"

export function TableEntryView({ logo, tableLabel, menuHref, valetHref, menuLabel, valetLabel, loading }: { logo?: ReactNode; tableLabel: string; menuHref: string; valetHref: string; menuLabel: string; valetLabel: string; loading?: boolean }) {
  return (
    <CustomerShell page="table">
      <main className="pmd-customer-home">
        <section className="pmd-customer-home__content">
          <CustomerLogoArea name={tableLabel} tagline="Welcome — choose how you would like to continue.">{logo}</CustomerLogoArea>
          {loading ? (
            <div className="pmd-customer-card p-6">Loading table information...</div>
          ) : (
            <div className="pmd-customer-action-grid">
              <CustomerActionTile href={menuHref} title={menuLabel} description="Open the menu for this table." icon={<Utensils aria-hidden="true" />} />
              <CustomerActionTile href={valetHref} title={valetLabel} description="Request valet assistance." icon={<Car aria-hidden="true" />} />
            </div>
          )}
        </section>
      </main>
    </CustomerShell>
  )
}
