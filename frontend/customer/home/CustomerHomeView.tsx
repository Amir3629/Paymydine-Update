import { Car, Utensils } from "lucide-react"
import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerLogoArea } from "../components/CustomerLogoArea"
import { CustomerActionTile } from "./CustomerActionTile"

export function CustomerHomeView({ logo, menuLabel, valetLabel }: { logo?: ReactNode; menuLabel: string; valetLabel: string }) {
  return (
    <CustomerShell page="home">
      <main className="pmd-customer-home">
        <section className="pmd-customer-home__content">
          <CustomerLogoArea name="PayMyDine" tagline="A warm, refined dining experience">
            {logo}
          </CustomerLogoArea>
          <div className="pmd-customer-action-grid">
            <CustomerActionTile href="/menu" title={menuLabel} description="Browse dishes and order from your table." icon={<Utensils aria-hidden="true" />} />
            <CustomerActionTile href="/valet" title={valetLabel} description="Request or manage valet parking." icon={<Car aria-hidden="true" />} />
          </div>
        </section>
      </main>
    </CustomerShell>
  )
}
