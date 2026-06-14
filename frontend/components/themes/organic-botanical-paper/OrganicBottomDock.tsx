"use client"

import type { ThemeDockProps } from "@/components/themes/shared/ThemeActionContract"
import styles from "./OrganicBottomDock.module.css"

type OrganicDockProps = ThemeDockProps & {
  onCheckout?: () => void
  onTableOrder?: () => void
  onCallWaiter?: () => void
  onOpenNote?: () => void
}

type OrganicAction = "waiter" | "note" | "checkout" | "table"

function emitOrganic(name: OrganicAction) {
  if (typeof window === "undefined") return

  console.info("PMD_ORGANIC_DOCK_EMIT", name)

  window.dispatchEvent(new CustomEvent(`pmd:organic:${name}`, { detail: { action: name } }))

  try {
    window.parent?.postMessage({ type: "PMD_ORGANIC_DOCK_CLICK", action: name }, "*")
  } catch {}

  try {
    document.dispatchEvent(new CustomEvent(`pmd:organic:${name}`, { detail: { action: name } }))
  } catch {}
}

function runMaybe(fn: unknown) {
  if (typeof fn === "function") {
    ;(fn as () => void)()
    return true
  }
  return false
}

export function OrganicBottomDock(props: OrganicDockProps) {
  const anyProps = props as any
  const tableCount = Number(props.tableOrderCount || 0)
  const cartCount = Number(props.cartCount || 0)

  const runWaiter = () => {
    console.info("PMD_ORGANIC_DOCK_DIRECT_ACTION", "waiter")
    runMaybe(anyProps.onCallWaiter) || runMaybe(anyProps.onWaiter)
    emitOrganic("waiter")
  }

  const runNote = () => {
    console.info("PMD_ORGANIC_DOCK_DIRECT_ACTION", "note")
    runMaybe(anyProps.onOpenNote) || runMaybe(anyProps.onNote)
    emitOrganic("note")
  }

  const runTableOrder = () => {
    console.info("PMD_ORGANIC_DOCK_DIRECT_ACTION", "table")
    runMaybe(anyProps.onOpenTableOrder) || runMaybe(anyProps.onTableOrder) || runMaybe(anyProps.onTable)
    emitOrganic("table")
  }

  const runCheckout = () => {
    console.info("PMD_ORGANIC_DOCK_DIRECT_ACTION", "checkout")
    runMaybe(anyProps.onOpenCheckout) || runMaybe(anyProps.onCheckout) || runMaybe(anyProps.onCartClick)
    emitOrganic("checkout")
  }

  const actions = [
    { key: "waiter", label: "Waiter", icon: "🛎️", count: 0, run: runWaiter },
    { key: "note", label: "Note", icon: "✎", count: 0, run: runNote },
    ...(props.showTableOrder
      ? [{ key: "table", label: "Table Order", icon: "☷", count: tableCount, run: runTableOrder }]
      : []),
    { key: "checkout", label: "Checkout", icon: "🧾", count: cartCount, run: runCheckout },
  ]

  return (
    <nav
      className={styles.dock}
      data-theme="organic"
      data-pmd-organic-dock-v2="1"
      aria-label="Menu actions"
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={styles.button}
          data-pmd-organic-dock-action={action.key}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            action.run()
          }}
        >
          <span className={styles.icon} aria-hidden="true">{action.icon}</span>
          <span className={styles.label}>{action.label}</span>
          {Number(action.count || 0) > 0 && <span className={styles.badge}>{action.count}</span>}
        </button>
      ))}
    </nav>
  )
}
