import type { ReactNode } from "react"

export function CustomerEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="pmd-customer-empty">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  )
}
