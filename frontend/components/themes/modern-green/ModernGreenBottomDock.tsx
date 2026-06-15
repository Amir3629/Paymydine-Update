"use client"

import type { ThemeDockProps } from "@/components/themes/shared/ThemeActionContract"
import styles from "./ModernGreenBottomDock.module.css"

export function ModernGreenBottomDock(props: ThemeDockProps) {
  const actions = [
    { key: "waiter", label: "Waiter", icon: "🛎️", onClick: props.onCallWaiter },
    { key: "note", label: "Note", icon: "✎", onClick: props.onOpenNote },
    ...(props.showTableOrder ? [{ key: "table", label: "Table Order", icon: "☷", onClick: props.onOpenTableOrder, count: props.tableOrderCount }] : []),
    { key: "checkout", label: "Checkout", icon: "🧾", onClick: props.onOpenCheckout, count: props.cartCount, primary: true },
  ]

  return (
    <nav className={styles.dock} data-theme="modernGreen" aria-label="Menu actions">
      {actions.map((action) => (
        <button key={action.key} type="button" className={`${styles.button} ${action.primary ? styles.primary : ""}`} onClick={() => void action.onClick()}>
          <span className={styles.icon} aria-hidden="true">{action.icon}</span>
          <span>{action.label}</span>
          {Number(action.count || 0) > 0 && <span className={styles.badge}>{action.count}</span>}
        </button>
      ))}
    </nav>
  )
}
