import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { MenuItem } from "@/lib/data"

export type CartItem = {
  item: MenuItem
  quantity: number
  selectedOptions?: Record<string, string> // Track selected sides/options
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
  addToCart: (item: MenuItem, quantity?: number, selectedOptions?: Record<string, string>) => void
  removeFromCart: (item: MenuItem) => void
  updateQuantity: (itemId: number, quantity: number) => void
  updateItemOptions: (itemId: number, selectedOptions: Record<string, string>) => void
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
      addToCart: (item, quantity = 1, selectedOptions = {}) =>
        set((state) => {
          const hasOptions = item.options && item.options.length > 0
          
          if (hasOptions) {
            // For items with sides, always add as individual items
            const newItems = Array.from({ length: quantity }).map(() => ({
              item,
              quantity: 1,
              selectedOptions
            }))
            return { items: [...state.items, ...newItems] }
          } else {
            // For items without sides, group by quantity
            const existingItem = state.items.find(cartItem => 
              cartItem.item.id === item.id && 
              JSON.stringify(cartItem.selectedOptions || {}) === JSON.stringify(selectedOptions)
            )
            
            if (existingItem) {
              return {
                items: state.items.map(cartItem =>
                  cartItem === existingItem 
                    ? { ...cartItem, quantity: cartItem.quantity + quantity }
                    : cartItem
                )
              }
            } else {
              return { items: [...state.items, { item, quantity, selectedOptions }] }
            }
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
      updateItemOptions: (itemId, selectedOptions) =>
        set((state) => ({
          items: state.items.map((cartItem) =>
            cartItem.item.id === itemId ? { ...cartItem, selectedOptions } : cartItem
          ),
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

