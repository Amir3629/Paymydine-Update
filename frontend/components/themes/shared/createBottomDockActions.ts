import type { ThemeDockProps, ThemeActionResult } from "./ThemeActionContract"

export type BottomDockActionKey = "waiter" | "note" | "table" | "checkout"

export type BottomDockAction = {
  key: BottomDockActionKey
  label: string
  icon: string
  count?: number
  primary?: boolean
  onClick: () => ThemeActionResult
}

export function createBottomDockActions(props: ThemeDockProps): BottomDockAction[] {
  return [
    { key: "waiter", label: "Waiter", icon: "🛎️", onClick: props.onCallWaiter },
    { key: "note", label: "Note", icon: "✎", onClick: props.onOpenNote },
    ...(props.showTableOrder
      ? [{ key: "table" as const, label: "Table Order", icon: "☷", count: props.tableOrderCount, onClick: props.onOpenTableOrder }]
      : []),
    { key: "checkout", label: "Checkout", icon: "🧾", count: props.cartCount, primary: true, onClick: props.onOpenCheckout },
  ]
}
