import Link from "next/link"
import type { ReactNode } from "react"

export function CustomerActionTile({ href, title }: { href: string; icon?: ReactNode; title: string; description?: string }) {
  return (
    <Link href={href} className="pmd-customer-action-tile">
      <h2 className="pmd-customer-action-tile__title">{title}</h2>
    </Link>
  )
}
