/**
 * Modern Green theme — sample/demo data.
 *
 * This is DEMO DATA ONLY so the theme renders complete out of the box.
 * In the real app, the host should pass equivalent data through props
 * instead of importing from here.
 */

import type {
  CartLine,
  MenuCategory,
  MenuSection,
  OrderSummary,
  PaymentMethodOption,
  SplitGuest,
  TipOption,
} from "./types"

export const sampleCategories: MenuCategory[] = [
  { id: "all", label: "All" },
  { id: "starters", label: "Starters" },
  { id: "mains", label: "Mains" },
  { id: "desserts", label: "Desserts" },
  { id: "drinks", label: "Drinks" },
  { id: "sides", label: "Sides" },
]

export const sampleSections: MenuSection[] = [
  {
    id: "chefs-favorites",
    title: "Chef's Favorites",
    subtitle: "Hand-picked by our kitchen tonight",
    items: [
      {
        id: "scallops",
        name: "Seared Scallops",
        description: "Herb oil, microgreens, citrus reduction",
        price: 24,
        imageUrl: "/pmd-modern-green/images/hero-dish.png",
        badge: { label: "Bestseller", tone: "accent" },
        tags: ["Gluten-free"],
      },
      {
        id: "truffle-pasta",
        name: "Truffle Tagliatelle",
        description: "Fresh pasta, shaved black truffle, parmesan",
        price: 28,
        imageUrl: "/pmd-modern-green/images/dish-truffle-pasta.png",
        badge: { label: "Signature", tone: "accent" },
      },
    ],
  },
  {
    id: "starters",
    title: "Starters",
    items: [
      {
        id: "burrata",
        name: "Burrata & Heirloom",
        description: "Creamy burrata, tomatoes, basil, olive oil",
        price: 16,
        imageUrl: "/pmd-modern-green/images/dish-burrata.png",
        tags: ["Vegetarian"],
      },
      {
        id: "tartare",
        name: "Beef Tartare",
        description: "Hand-cut beef, quail egg, capers, herbs",
        price: 19,
        imageUrl: "/pmd-modern-green/images/dish-tartare.png",
        badge: { label: "New", tone: "accent" },
      },
    ],
  },
  {
    id: "mains",
    title: "Main Courses",
    items: [
      {
        id: "ribeye",
        name: "Grilled Ribeye",
        description: "Rosemary, roasted vegetables, red wine jus",
        price: 42,
        imageUrl: "/pmd-modern-green/images/dish-steak.png",
        badge: { label: "Chef's pick", tone: "accent" },
      },
      {
        id: "salmon",
        name: "Pan-Seared Salmon",
        description: "Asparagus, lemon butter, dill",
        price: 32,
        imageUrl: "/pmd-modern-green/images/dish-salmon.png",
        tags: ["Gluten-free"],
      },
    ],
  },
  {
    id: "desserts",
    title: "Desserts",
    items: [
      {
        id: "lava-cake",
        name: "Molten Lava Cake",
        description: "Warm chocolate, vanilla ice cream, mint",
        price: 12,
        imageUrl: "/pmd-modern-green/images/dish-lava-cake.png",
        badge: { label: "Bestseller", tone: "accent" },
      },
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    items: [
      {
        id: "garden-spritz",
        name: "Garden Spritz",
        description: "Gin, cucumber, elderflower, soda",
        price: 14,
        imageUrl: "/pmd-modern-green/images/dish-cocktail.png",
      },
    ],
  },
]

export const sampleCartLines: CartLine[] = [
  {
    id: "scallops",
    name: "Seared Scallops",
    unitPrice: 24,
    quantity: 1,
    imageUrl: "/pmd-modern-green/images/hero-dish.png",
  },
  {
    id: "ribeye",
    name: "Grilled Ribeye",
    unitPrice: 42,
    quantity: 1,
    imageUrl: "/pmd-modern-green/images/dish-steak.png",
    note: "Medium rare",
  },
  {
    id: "garden-spritz",
    name: "Garden Spritz",
    unitPrice: 14,
    quantity: 2,
    imageUrl: "/pmd-modern-green/images/dish-cocktail.png",
  },
]

export const sampleOrder: OrderSummary = {
  orderNumber: "#A-2048",
  tableLabel: "Table 07",
  status: "preparing",
  estimate: "15–20 min",
  lines: sampleCartLines,
  totals: {
    subtotal: 94,
    serviceCharge: 9.4,
    total: 103.4,
  },
}

export const samplePaymentMethods: PaymentMethodOption[] = [
  { id: "card", label: "Card", icon: "card" },
  { id: "apple", label: "Apple Pay", icon: "apple" },
  { id: "google", label: "Google Pay", icon: "google" },
  { id: "wero", label: "Wero", icon: "wero" },
  { id: "paypal", label: "PayPal", icon: "paypal" },
  { id: "cash", label: "Cash", icon: "cash" },
]

export const sampleTipOptions: TipOption[] = [
  { id: "tip-0", label: "0%", percent: 0 },
  { id: "tip-5", label: "5%", percent: 5 },
  { id: "tip-10", label: "10%", percent: 10 },
  { id: "tip-custom", label: "Custom", percent: null },
]

export const sampleSplitGuests: SplitGuest[] = [
  { id: "g1", label: "Guest 1", amount: 34.47, shares: 1 },
  { id: "g2", label: "Guest 2", amount: 34.47, shares: 1 },
  { id: "g3", label: "Guest 3", amount: 34.46, shares: 1 },
]

/** Default price formatter used by the demo. Host can override via props. */
export const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
