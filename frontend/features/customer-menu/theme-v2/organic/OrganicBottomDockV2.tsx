"use client"

import type { ThemeDockProps } from "@/features/customer-menu/theme-v2/shared/ThemeActionTypes"
import styles from "./organic-theme.module.css"

export function OrganicBottomDockV2(props: ThemeDockProps) {
  const actions = [
    { key: "waiter", label: "Waiter", icon: "🛎️", count: 0, onClick: props.onCallWaiter },
    { key: "note", label: "Note", icon: "✎", count: 0, onClick: props.onOpenNote },
    ...(props.showTableOrder ? [{ key: "table", label: "Table Order", icon: "☷", count: props.tableOrderCount, onClick: props.onOpenTableOrder }] : []),
    { key: "checkout", label: "Checkout", icon: "🧾", count: props.cartCount, onClick: props.onOpenCheckout },
  ]
  return <nav className={styles.dock} data-pmd-theme-v2="organic" aria-label="Menu actions">{actions.map((action) => <button key={action.key} type="button" className={styles.dockButton} onClick={() => void action.onClick()}><span className={styles.dockIcon}>{action.icon}</span><span className={styles.dockLabel}>{action.label}</span>{Number(action.count) > 0 && <span className={styles.badge}>{action.count}</span>}</button>)}</nav>
}
