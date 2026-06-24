import type { MenuItem } from "@/lib/data"
import type { CartItem } from "@/store/cart-store"
import type { CheckoutStep, PmdToolbarPricingSnapshot } from "@/features/checkout/types"

export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
export const KAZEN_JAPANESE_THEME_KEY = "kazen_japanese"
export const VELVET_TERRACOTTA_THEME_KEY = "velvet_terracotta"

export type PayPalPublicConfig = {
  enabled: boolean
  clientId: string
  currency: string
} | null

export type PaymentFormData = {
  email: string
  phone: string
  cardholderName?: string
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  tableInfo?: any;
  existingOrderId?: number | null;
  pendingSummary?: {
    orderTotal: number;
    settledAmount: number;
    remainingAmount: number;
  } | null;
  initialSubmittedOrder?: any | null;
  initialCheckoutStep?: CheckoutStep;
  preferPersonalReview?: boolean
  onOpenOrderUpdate?: (snapshot: any | null) => void;
  onCartPricingUpdate?: (snapshot: PmdToolbarPricingSnapshot | null) => void;
  checkoutVisualTheme?: "gold-luxury" | "organic_botanical_paper" | "modern_green" | "kazen_japanese" | "velvet_terracotta" | "neutral";
}

export interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const SPLIT_GUEST_PROFILES = [
  { name: "Luna", avatar: "L" },
  { name: "Milo", avatar: "M" },
  { name: "Zara", avatar: "Z" },
  { name: "Leo", avatar: "L" },
  { name: "Nova", avatar: "N" },
  { name: "Coco", avatar: "C" },
  { name: "Rio", avatar: "R" },
  { name: "Nala", avatar: "N" },
  { name: "Oscar", avatar: "O" },
  { name: "Bella", avatar: "B" },
]
