import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerLogoArea } from "../components/CustomerLogoArea"
import { CustomerActionTile } from "./CustomerActionTile"

export function CustomerHomeView({ logo, restaurantName = "Welcome", menuLabel, valetLabel }: { logo?: ReactNode; restaurantName?: string; poweredBy?: string; menuLabel: string; valetLabel: string }) {
  return (
    <CustomerShell page="home">
      <main className="pmd-customer-home">
        <section className="pmd-customer-home__content">
          <CustomerLogoArea name={restaurantName}>{logo}</CustomerLogoArea>
          <div className="pmd-customer-action-grid">
            <CustomerActionTile href="/menu" title={menuLabel} />
            <CustomerActionTile href="/valet" title={valetLabel} />
          </div>
        </section>
      </main>
    </CustomerShell>
  )
}
