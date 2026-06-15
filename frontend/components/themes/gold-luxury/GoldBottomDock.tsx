"use client"

import type { ThemeDockProps } from "@/components/themes/shared/ThemeActionContract"
import { createBottomDockActions } from "@/components/themes/shared/createBottomDockActions"
import styles from "./GoldBottomDock.module.css"

export function GoldBottomDock(props: ThemeDockProps) {
  const actions = createBottomDockActions(props)

  return (
    <nav
      className={styles.dock}
      data-pmd-theme-dock="gold-luxury"
      aria-label="Gold Luxury menu actions"
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`${styles.button} ${action.primary ? styles.primary : ""}`}
          data-pmd-dock-action={action.key}
          onClick={() => void action.onClick()}
        >
          <span className={styles.icon} aria-hidden="true">{action.icon}</span>
          <span className={styles.label}>{action.label}</span>
          {Number(action.count || 0) > 0 && <span className={styles.badge}>{action.count}</span>}
        </button>
      ))}
    </nav>
  )
}
