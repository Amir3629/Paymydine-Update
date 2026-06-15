"use client"

import type { ThemeDockProps } from "./ThemeActionContract"
import { createBottomDockActions } from "./createBottomDockActions"
import styles from "./SharedBottomDock.module.css"

export type SharedBottomDockTheme = "kazen" | "modernGreen" | "organic" | "gold"

type SharedBottomDockProps = ThemeDockProps & {
  theme: SharedBottomDockTheme
}

export function SharedBottomDock({ theme, ...props }: SharedBottomDockProps) {
  const actions = createBottomDockActions(props)

  return (
    <nav className={styles.dock} data-theme={theme} data-pmd-shared-bottom-dock="1" aria-label="Menu actions">
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
