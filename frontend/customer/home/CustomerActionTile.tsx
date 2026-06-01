import Link from "next/link"
import type { ReactNode } from "react"

export function CustomerActionTile({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description?: string }) {
  return (
    <Link href={href} className="pmd-customer-action-tile">
      <span className="pmd-customer-action-tile__icon">{icon}</span>
      <span>
        <h2 className="pmd-customer-action-tile__title">{title}</h2>
        {description ? <p className="pmd-customer-action-tile__description">{description}</p> : null}
      </span>
    </Link>
  )
}
