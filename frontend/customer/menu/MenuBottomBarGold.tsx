import { CustomerBottomBar } from "../components/CustomerBottomBar"
import { CustomerButton } from "../components/CustomerButton"

export function MenuBottomBarGold({ total, count, onCheckout }: { total: string; count: number; onCheckout: () => void }) {
  return (
    <CustomerBottomBar>
      <div className="pmd-customer-menu-bottom"><span>{count} items</span><strong>{total}</strong><CustomerButton variant="primary" onClick={onCheckout}>Checkout</CustomerButton></div>
    </CustomerBottomBar>
  )
}
