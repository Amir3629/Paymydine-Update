import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { MenuItem } from "@/lib/data"

export type CartItem = {
  item: MenuItem & { __pmdSelectedOptions?: Record<string, string> }
  quantity: number
}

const selectedOptionsKey = (item: MenuItem & { __pmdSelectedOptions?: Record<string, string> }) => {
  const selected = item.__pmdSelectedOptions || {}
  return JSON.stringify(Object.keys(selected).sort().reduce((acc: Record<string, string>, key) => {
    acc[key] = String(selected[key])
    return acc
  }, {}))
}

const sameCartItem = (a: MenuItem & { __pmdSelectedOptions?: Record<string, string> }, b: MenuItem & { __pmdSelectedOptions?: Record<string, string> }) =>
  a.id === b.id && selectedOptionsKey(a) === selectedOptionsKey(b)

export type TableInfo = {
  table_id: string
  table_no?: number
  table_name: string
  location_id: number
  qr_code: string | null
  path_table?: string
  is_cashier?: boolean
}

type CartState = {
  items: CartItem[]
  isCartOpen: boolean
  tableInfo: TableInfo | null
  addToCart: (item: MenuItem, quantity?: number) => void
  removeFromCart: (item: MenuItem) => void
  updateQuantity: (itemId: number, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (isOpen: boolean) => void
  setTableInfo: (tableInfo: TableInfo) => void
  clearTableContext: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isCartOpen: false,
      tableInfo: null,
      addToCart: (item, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find((cartItem) => sameCartItem(cartItem.item, item))
          if (existingItem) {
            const newQuantity = existingItem.quantity + quantity
            // Remove item if quantity would be 0 or less
            if (newQuantity <= 0) {
              return {
                items: state.items.filter((cartItem) => !sameCartItem(cartItem.item, item))
              }
            }
            // Update quantity if item exists
            return {
              items: state.items.map((cartItem) =>
                sameCartItem(cartItem.item, item) ? { ...cartItem, quantity: newQuantity } : cartItem
              )
            }
          }
          // Only add new item if quantity is positive
          if (quantity <= 0) return state
          return { 
            items: [...state.items, { item, quantity: quantity }] 
          }
        }),
      removeFromCart: (item) =>
        set((state) => {
          const existingItem = state.items.find((cartItem) => sameCartItem(cartItem.item, item))
          if (existingItem && existingItem.quantity > 1) {
            return {
              items: state.items.map((cartItem) =>
                sameCartItem(cartItem.item, item) ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem,
              ),
            }
          }
          return {
            items: state.items.filter((cartItem) => !sameCartItem(cartItem.item, item)),
          }
        }),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((cartItem) => (cartItem.item.id === itemId ? { ...cartItem, quantity } : cartItem))
            .filter((cartItem) => cartItem.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      setTableInfo: (tableInfo) => set({ tableInfo }),
      clearTableContext: () => set((state) => ({ tableInfo: null })),
    }),
    {
      name: "paymydine-cart-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

