type Actions = {
  onWaiterClick?: () => void;
  onNoteClick?: () => void;
  onCartClick?: () => void;
  onTableOrderClick?: () => void;
  onValetClick?: () => void;
  onLanguageClick?: () => void;
  cartCount?: number;
  totalPrice?: number;
};
export function OrganicActionBar({ actions }: { actions?: Actions }) {
  return (
    <div className="ob-actions" aria-label="Organic Botanical actions">
      <button type="button" onClick={actions?.onWaiterClick}>
        Waiter
      </button>
      <button type="button" onClick={actions?.onNoteClick}>
        Note
      </button>
      <button type="button" onClick={actions?.onTableOrderClick}>
        Table
      </button>
      <button type="button" onClick={actions?.onValetClick}>
        Valet
      </button>
      {actions?.onLanguageClick && (
        <button type="button" onClick={actions.onLanguageClick}>
          Language
        </button>
      )}
      <button
        type="button"
        className="ob-checkout"
        onClick={actions?.onCartClick}
      >
        Cart {actions?.cartCount ? `(${actions.cartCount})` : ""}
      </button>
    </div>
  );
}
