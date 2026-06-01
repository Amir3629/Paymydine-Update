import { CustomerBottomBar } from "../components/CustomerBottomBar"
import { CustomerButton } from "../components/CustomerButton"

export function MenuBottomBarGold({ total, count, onCheckout, onOrder, orderCount, onWaiter, onNote }: { total: string; count: number; onCheckout: () => void; onOrder?: () => void; orderCount?: number; onWaiter?: () => void; onNote?: () => void }) {
  return (
    <CustomerBottomBar>
      <div className="pmd-customer-menu-bottom">
        <div><span className="pmd-customer-muted">Your order</span><strong>{count} items · {total}</strong></div>
        <div className="pmd-customer-menu-bottom__actions">
          {onWaiter ? <CustomerButton variant="ghost" onClick={onWaiter}>Waiter</CustomerButton> : null}
          {onNote ? <CustomerButton variant="ghost" onClick={onNote}>Note</CustomerButton> : null}
          {onOrder ? <CustomerButton variant="secondary" onClick={onOrder}>Table Order{orderCount ? ` (${orderCount})` : ""}</CustomerButton> : null}
          <CustomerButton variant="primary" onClick={onCheckout}>Checkout</CustomerButton>
        </div>
      </div>
    </CustomerBottomBar>
  )
}
