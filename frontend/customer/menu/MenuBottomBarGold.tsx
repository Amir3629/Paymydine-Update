import { HandPlatter, NotebookPen, ReceiptText, ShoppingCart } from "lucide-react"
import { CustomerBottomBar } from "../components/CustomerBottomBar"
import { CustomerButton } from "../components/CustomerButton"

export function MenuBottomBarGold({ total, count, onCheckout, onOrder, orderCount, onWaiter, onNote }: { total: string; count: number; onCheckout: () => void; onOrder?: () => void; orderCount?: number; onWaiter?: () => void; onNote?: () => void }) {
  return (
    <CustomerBottomBar>
      <nav className="pmd-customer-menu-actions" aria-label="Customer actions">
        {onWaiter ? <CustomerButton className="pmd-customer-menu-action" variant="ghost" onClick={onWaiter}><HandPlatter aria-hidden="true" /> <span>Waiter</span></CustomerButton> : null}
        {onNote ? <CustomerButton className="pmd-customer-menu-action" variant="ghost" onClick={onNote}><NotebookPen aria-hidden="true" /> <span>Note</span></CustomerButton> : null}
        <CustomerButton className="pmd-customer-menu-action pmd-customer-menu-action--checkout" variant="primary" onClick={onCheckout} disabled={count <= 0}>
          <ShoppingCart aria-hidden="true" /> <span>Checkout</span>{count > 0 ? <small>{count} · {total}</small> : null}
        </CustomerButton>
        {onOrder ? <CustomerButton className="pmd-customer-menu-action" variant="secondary" onClick={onOrder}><ReceiptText aria-hidden="true" /> <span>Order</span>{orderCount ? <small>{orderCount}</small> : null}</CustomerButton> : null}
      </nav>
    </CustomerBottomBar>
  )
}
