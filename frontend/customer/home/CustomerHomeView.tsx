import { Car, Utensils } from "lucide-react"
import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerLogoArea } from "../components/CustomerLogoArea"
import { CustomerActionTile } from "./CustomerActionTile"

export function CustomerHomeView({ logo, restaurantName = "Welcome", poweredBy = "Powered by PayMyDine", menuLabel, valetLabel }: { logo?: ReactNode; restaurantName?: string; poweredBy?: string; menuLabel: string; valetLabel: string }) {
  return (
    <CustomerShell page="home">
      <main className="pmd-customer-home">
        <section className="pmd-customer-home__content">
          <CustomerLogoArea name={restaurantName} tagline={poweredBy}>
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
