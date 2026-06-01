type CustomerQuantityControlProps = {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  decrementLabel?: string
  incrementLabel?: string
}

export function CustomerQuantityControl({ value, onIncrement, onDecrement, decrementLabel = "Decrease", incrementLabel = "Increase" }: CustomerQuantityControlProps) {
  return (
    <div className="pmd-customer-qty">
      <button type="button" className="pmd-customer-qty__button" onClick={onDecrement} aria-label={decrementLabel}>−</button>
      <span className="pmd-customer-qty__value">{value}</span>
      <button type="button" className="pmd-customer-qty__button" onClick={onIncrement} aria-label={incrementLabel}>+</button>
    </div>
  )
}
