import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { MenuItem } from "@/lib/data"

export type CartItem = {
  item: MenuItem
  quantity: number
}

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
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isCartOpen: false,
      tableInfo: null,
      addToCart: (item, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find((cartItem) => cartItem.item.id === item.id)
          if (existingItem) {
            const newQuantity = existingItem.quantity + quantity
            // Remove item if quantity would be 0 or less
            if (newQuantity <= 0) {
              return {
                items: state.items.filter((cartItem) => cartItem.item.id !== item.id)
              }
            }
            // Update quantity if item exists
            return {
              items: state.items.map((cartItem) =>
                cartItem.item.id === item.id ? { ...cartItem, quantity: newQuantity } : cartItem
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
          const existingItem = state.items.find((cartItem) => cartItem.item.id === item.id)
          if (existingItem && existingItem.quantity > 1) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.item.id === item.id ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem,
              ),
            }
          }
          return {
            items: state.items.filter((cartItem) => cartItem.item.id !== item.id),
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
    }),
    {
      name: "paymydine-cart-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

