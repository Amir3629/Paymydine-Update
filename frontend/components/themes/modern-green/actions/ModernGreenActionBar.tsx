import {
  Bell,
  Car,
  ClipboardList,
  Languages,
  MessageSquare,
  ShoppingCart,
} from "lucide-react";

type Props = {
  cartCount: number;
  totalPrice: number;
  showTableOrder?: boolean;
  tableOrderCount?: number;
  onCheckout: () => void;
  onCallWaiter: () => void | Promise<void>;
  onOpenNote: () => void | Promise<void>;
  onOpenValet: () => void | Promise<void>;
  onTableOrder?: () => void | Promise<void>;
  onLanguage?: () => void | Promise<void>;
};

export function ModernGreenActionBar({
  cartCount,
  totalPrice,
  showTableOrder,
  tableOrderCount,
  onCheckout,
  onCallWaiter,
  onOpenNote,
  onOpenValet,
  onTableOrder,
  onLanguage,
}: Props) {
  return (
    <div className="mg-actions" aria-label="Modern Green actions">
      <button type="button" onClick={() => void onCallWaiter()}>
        <Bell size={18} /> Waiter
      </button>
      <button type="button" onClick={() => void onOpenNote()}>
        <MessageSquare size={18} /> Note
      </button>
      {showTableOrder && (
        <button type="button" onClick={() => void onTableOrder?.()}>
          <ClipboardList size={18} /> Table{" "}
          {tableOrderCount ? `(${tableOrderCount})` : ""}
        </button>
      )}
      <button type="button" onClick={() => void onOpenValet()}>
        <Car size={18} /> Valet
      </button>
      {onLanguage && (
        <button type="button" onClick={() => void onLanguage()}>
          <Languages size={18} /> Language
        </button>
      )}
      <button type="button" className="mg-checkout" onClick={onCheckout}>
        <ShoppingCart size={18} /> {cartCount} · ${totalPrice.toFixed(2)}
      </button>
    </div>
  );
}
