import { CustomerBottomBar } from "../components/CustomerBottomBar"
import { CustomerButton } from "../components/CustomerButton"

export function MenuBottomBarGold({ total, count, onCheckout, onOrder, orderCount, onWaiter, onNote }: { total: string; count: number; onCheckout: () => void; onOrder?: () => void; orderCount?: number; onWaiter?: () => void; onNote?: () => void }) {
  const checkoutLabel = count > 0 ? `Checkout · ${count} · ${total}` : "Checkout"

  return (
    <CustomerBottomBar>
      <nav className="pmd-customer-menu-actions" aria-label="Customer actions">
        {onWaiter ? <CustomerButton className="pmd-customer-menu-action" variant="ghost" onClick={onWaiter}>Call waiter</CustomerButton> : null}
        {onNote ? <CustomerButton className="pmd-customer-menu-action" variant="ghost" onClick={onNote}>Add note</CustomerButton> : null}
        <CustomerButton className="pmd-customer-menu-action pmd-customer-menu-action--checkout" variant="primary" onClick={onCheckout} disabled={count <= 0}>{checkoutLabel}</CustomerButton>
        {onOrder ? <CustomerButton className="pmd-customer-menu-action" variant="secondary" onClick={onOrder}>Table order{orderCount ? ` (${orderCount})` : ""}</CustomerButton> : null}
      </nav>
    </CustomerBottomBar>
  )
}
