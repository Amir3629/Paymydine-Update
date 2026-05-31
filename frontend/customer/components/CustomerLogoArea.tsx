import type { ReactNode } from "react"

export function CustomerLogoArea({ children, name, tagline }: { children?: ReactNode; name?: string; tagline?: string }) {
  return (
    <div className="pmd-customer-logo-area">
      {children ? <div className="pmd-customer-logo-area__mark">{children}</div> : null}
      {name ? <h1 className="pmd-customer-logo-area__name">{name}</h1> : null}
      {tagline ? <p className="pmd-customer-logo-area__tagline">{tagline}</p> : null}
    </div>
  )
}
