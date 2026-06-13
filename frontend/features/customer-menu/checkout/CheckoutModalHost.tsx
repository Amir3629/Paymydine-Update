"use client"

import React, { useState, useEffect, useMemo } from "react"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { Elements, useStripe, useElements, PaymentRequestButtonElement } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Lock, Users, Check, Minus, CreditCard, ArrowLeft, CheckCircle, DollarSign, ReceiptText, ArrowRight, Link2, QrCode } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import type { MenuItem } from "@/lib/data"
import { type TranslationKey } from "@/lib/translations"
import { type PmdSocialPlatformId, useCmsStore } from "@/store/cms-store"
import { useCartStore, type CartItem } from "@/store/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { ApiClient, apiClient, type PaymentMethod, type TableOrderDraftResponse } from "@/lib/api-client"
import { iconForPayment } from "@/lib/payment-icons"
import { PayPalForm, WorldlineInlineCardForm } from "@/components/payment/secure-payment-form"
import { StripeCardPaymentSection } from "@/features/checkout/payment/StripeCardPaymentSection"
import SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout"
import { stickySearch } from "@/lib/sticky-query"
import {
  OrganicCheckoutScopedStyles,
  organicCheckoutBodyStyle,
  organicCheckoutHeaderStyle,
  organicCheckoutModalStyle,
  organicCheckoutPrimaryButtonStyle,
} from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"
import { CheckoutIconFrame, CheckoutStepCard, CheckoutSummaryCard, OrderStatusCard, PaymentCardFrame, PaymentMethodTile, SplitBillPanel, SplitMethodButton, ThemedButton, ThemedInput, TipCouponPanel } from "@/components/theme-ui"
import { buildTableOrderDraftContext, createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import {
  buildEvenSharePercents,
  calculateCheckoutTax,
  calculateSplitSubtotal,
  getOrderItemUnitAmount,
  groupOrderDisplayItems,
  tableOrderTotalByCode,
  tableOrderVatPercentage,
  toPositiveAmount,
} from "@/features/checkout/checkout-utils"
import {
  getCheckoutStepAfterBack,
  getCheckoutStepAfterDraftSubmit,
  getCheckoutStepAfterOrderSubmit,
  getCheckoutStepAfterPaymentSuccess,
  getCheckoutStepForSplitMethod,
  getCheckoutStepOnOpen,
  getInitialCheckoutStep,
  isSplitCheckoutStep,
  shouldForcePersonalReview,
} from "@/features/checkout/checkout-state-utils"
import {
  calculateCouponDiscount,
  calculateFinalTotal,
  calculateOrderStatusTotal,
  calculatePaidSnapshotTotals,
  calculatePayableTotal,
  calculatePaymentSummary,
  calculateSubmittedBaseTotal,
  calculateTipAmount,
} from "@/features/checkout/payment-summary-utils"
import {
  buildEqualSplitPeople,
  buildItemSplitPeople,
  buildShareSplitPeople,
  buildSplitGuestProfiles,
  calculateSplitConfirmationState,
  getActiveSplitPeople,
  getSelectedSplitPerson,
  getSplitGuestAvatar as getSplitGuestAvatarFromProfiles,
  normalizeSharePercentsForGuestCount,
  pruneItemAssignmentsForGuestCount,
} from "@/features/checkout/split-bill-utils"
import {
  canRenderPaymentMethodDetail,
  findPaymentMethod,
  getPaymentMethodProviderCode,
  getVisiblePaymentMethods,
  isPaymentMethodAvailable,
  isStripePaymentMethodForConfig,
  mapPaymentMethodsByCode,
} from "@/features/checkout/payment-method-utils"
import type {
  CheckoutStep,
  PmdToolbarPricingSnapshot,
  SplitBillItem,
  SplitMethod,
  SplitPerson,
  SplitSourceItem,
} from "@/features/checkout/types"

const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
const KAZEN_JAPANESE_THEME_KEY = "kazen_japanese"


const splitMethod = "equal" as const


/* WALLET_STRIPE_PAY_COMPONENT */
function WalletStripePay(props: {
  method: "apple_pay" | "google_pay";
  amount: number;
  currency: string;
  countryCode?: string;

  restaurantId: string | number;
  cartId?: string | number | null;
  userId?: string | number | null;
  items?: any[];
  customerInfo?: any;
  tableNumber?: string | number | null;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  try {
    if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
      (window as any).__PMD_WALLET_POST({
        level: "info",
        message: "PMD_WALLET_COMPONENT_MOUNT",
        data: {
          method: props.method,
          amount: props.amount,
          currency: props.currency,
          countryCode: props.countryCode || null,
          hasStripe: !!stripe,
          hasElements: !!elements,
          restaurantId: props.restaurantId,
          cartId: props.cartId ?? null,
          userId: props.userId ?? null,
          tableNumber: props.tableNumber ?? null,
          itemsLen: Array.isArray(props.items) ? props.items.length : null,
        }
      });
    }
  } catch {}

  const [ready, setReady] = (require('react') as typeof import('react')).useState(false);
  const [supported, setSupported] = (require('react') as typeof import('react')).useState<boolean | null>(null);
  const [loading, setLoading] = (require('react') as typeof import('react')).useState(false);
  const [msg, setMsg] = (require('react') as typeof import('react')).useState<string>("");

  (require('react') as typeof import('react')).useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (!stripe) return;

        // Stripe PaymentRequest API (drives Apple Pay / Google Pay buttons where available)
        const cur = (props.currency || "eur").toLowerCase();
        const countryForCurrency = (props.countryCode || "DE");
        (WalletStripePay as any)._paymentRequest = null;
        const pr = stripe.paymentRequest({
          country: countryForCurrency, // not critical for test; Stripe mainly uses currency + merchant.
          currency: cur,
          total: { label: props.method === "apple_pay" ? "Apple Pay" : "Google Pay", amount: Math.round(Number(props.amount || 0) * 100)},
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        try {
          if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
            (window as any).__PMD_WALLET_POST({
              level: "info",
              message: "PMD_CAN_MAKE_PAYMENT_RESULT",
              data: {
                method: props.method,
                result,
              }
            });
          }
        } catch {}
        if (cancelled) return;

        setSupported(!!result);
        setReady(true);

        if (!result) {
          try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "warn",
                message: "PMD_WALLET_NOT_SUPPORTED",
                data: {
                  method: props.method,
                }
              });
            }
          } catch {}
          setMsg(
            props.method === "apple_pay"
              ? "Apple Pay is not available on this browser/device (or wallet is not configured). Please try Safari on iPhone with Apple Pay enabled."
              : "Google Pay is not available on this browser/device (or wallet is not configured). Please try Chrome with Google Pay enabled."
          );
          return;
        }

        pr.on('paymentmethod', async (ev: any) => {
          try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "info",
                message: "PMD_PAYMENTMETHOD_EVENT",
                data: {
                  method: props.method,
                  paymentMethodId: ev?.paymentMethod?.id || null,
                  payerName: ev?.payerName || null,
                  payerEmail: ev?.payerEmail || null,
                }
              });
            }
          } catch {}
          try {
            setLoading(true);

            // 1) create PaymentIntent from our Next API
            const res = await fetch('/api/v1/payments/stripe/create-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: props.amount,
                currency: (props.currency || "eur").toLowerCase(),
                preferredMethod: props.method,
                restaurantId: String(props.restaurantId),
                cartId: props.cartId ? String(props.cartId) : null,
                userId: props.userId ? String(props.userId) : null,
                items: props.items || [],
                customerInfo: props.customerInfo || {},
                tableNumber: props.tableNumber || null,
              })
            });

            const data = await res.json()
      pmdForceKazenFrontendThemePayload(data);
            if (!res.ok || !data?.clientSecret) {
              throw new Error(data?.error || "Failed to create payment intent");
            }

            // 2) confirm PI using the wallet payment method from the event
            const { paymentIntent, error } = await stripe.confirmCardPayment(
              data.clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: true }
            );

            if (error) {
              ev.complete('fail');
              throw new Error(error.message || "Wallet payment failed");
            }

            ev.complete('success');

            if (paymentIntent?.status === 'succeeded') {
              props.onSuccess(paymentIntent.id);
            } else {
              throw new Error("Unexpected PI status: " + (paymentIntent?.status || "unknown"));
            }

          } catch (e: any) {
            try {
              if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
                (window as any).__PMD_WALLET_POST({
                  level: "error",
                  message: "PMD_WALLET_ONERROR",
                  data: {
                    method: props.method,
                    message: e?.message || String(e),
                  },
                });
              }
            } catch {}
          } finally {
            setLoading(false);
          }
        });

        // attach paymentRequest to button element via options below
        (WalletStripePay as any)._paymentRequest = pr;

      } catch (e: any) {
        if (cancelled) return;
        setSupported(false);
        setReady(true);
        try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "warn",
                message: "PMD_WALLET_NOT_SUPPORTED",
                data: {
                  method: props.method,
                }
              });
            }
          } catch {}
          setMsg(e?.message || String(e));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [stripe, props.currency, props.countryCode, props.amount]);

  if (!ready) {
    return (
      <div className="py-2 text-xs text-gray-500">Loading wallet…</div>
    );
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
        {msg || "Wallet not supported here."}
      </div>
    );
  }
  const __prKey = String((props.currency || "eur").toLowerCase()) + "-" + String((props.countryCode || "DE")) + "-" + String(props.amount);

  const pr = (WalletStripePay as any)._paymentRequest;
  return (
    <div className="space-y-3">
<div className="rounded-xl overflow-hidden">
        <PaymentRequestButtonElement key={__prKey}
          options={{
            paymentRequest: pr,
            style: {
              paymentRequestButton: {
                type: props.method === "apple_pay" ? "default" : "default",
                theme: "dark",
                height: "44px",
              },
            },
          }}
        />
      </div>

      {loading && <div className="text-xs text-gray-500">Processing…</div>}
    </div>
  );
}


type PayPalPublicConfig = {
  enabled: boolean
  clientId: string
  currency: string
} | null

type PaymentFormData = {
  email: string
  phone: string
}

interface PaymentModalProps {
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
  checkoutVisualTheme?: "gold-luxury" | "organic_botanical_paper" | "modern_green" | "kazen_japanese" | "neutral";
}


interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

const SPLIT_GUEST_PROFILES = [
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

function MenuRecommendationBadges({
  item,
  compact = false,
  settings = defaultMenuHighlightSettings,
  placement = 'card',
}: {
  item: MenuItem
  compact?: boolean
  settings?: MenuHighlightSettings
  placement?: 'card' | 'modal' | 'section'
}) {
  if (placement === 'card' && (!settings.show_card_badges || settings.badge_position === 'hidden')) return null
  if (placement === 'modal' && !settings.show_modal_badges) return null

  const candidates = [] as Array<{ key: string; label: string; icon: React.ReactNode; tone: 'gold' | 'emerald' }>
  if ((item as any).is_chef_recommended) {
    candidates.push({
      key: 'chef',
      label: settings.chef_label || "Chef’s Choice",
      icon: <ChefHat className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'emerald',
    })
  }
  if ((item as any).is_bestseller) {
    candidates.push({
      key: 'best',
      label: settings.bestseller_label || 'Best Seller',
      icon: <Trophy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'gold',
    })
  }
  const badges = settings.badge_display_mode === 'show_all' ? candidates : candidates.slice(0, 1)
  if (!badges.length) return null

  const showText = placement === 'modal' ? settings.show_badge_text_in_modal : settings.show_badge_text_on_cards
  const style = placement === 'modal' ? 'soft_pill' : settings.badge_style
  const cardCircle = style === 'minimal_circle'
  const cardRibbon = style === 'corner_ribbon' && placement === 'card'

  const classFor = (tone: 'gold' | 'emerald') => {
    const colors = tone === 'gold'
      ? 'border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]'
      : 'border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]'
    if (cardCircle) return `inline-flex h-8 w-8 items-center justify-center rounded-full border ${colors} shadow-sm`
    if (cardRibbon) return `inline-flex items-center gap-1 border ${colors} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm`
    if (style === 'luxury_label') return `inline-flex items-center gap-1.5 rounded-md border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm`
    return `inline-flex items-center gap-1.5 rounded-full border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] shadow-sm`
  }

  return (
    <div className={`pmd-menu-recommendation-badges flex flex-wrap items-center gap-1 ${cardRibbon ? 'max-w-[112px]' : ''}`} aria-label="Menu item highlights">
      {badges.map((badge) => (
        <span key={badge.key} className={classFor(badge.tone)} aria-label={badge.label} title={badge.label}>
          {badge.icon}
          {showText && !cardCircle && <span>{badge.label}</span>}
        </span>
      ))}
    </div>
  )
}

function MenuHighlightSection({
  title,
  subtitle,
  items,
  settings,
  onSelect,
  onFirstAdd,
  organic = false,
  onOrganicAdd,
}: {
  title: string
  subtitle: string
  items: MenuItem[]
  settings: MenuHighlightSettings
  onSelect: (item: MenuItem) => void
  onFirstAdd: (item: MenuItem) => void
  organic?: boolean
  onOrganicAdd?: (item: MenuItem, event: React.MouseEvent) => void
}) {
  if (!items.length) return null

  return (
    <section className={organic ? "organic-highlight-section relative mb-9 px-4" : "mb-8 px-4"} aria-label={title}>
      <div className={organic ? "mb-4 text-center" : "mb-3 flex items-end justify-between gap-3"}>
        <div>
          {organic && <div className="mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]" aria-hidden="true"><span className="h-px w-8 bg-current" /><span className="text-lg">☘</span><span className="h-px w-8 bg-current" /></div>}
          <h2 className={organic ? "font-serif text-3xl uppercase tracking-[0.16em] text-[var(--organic-text)]" : "font-serif text-2xl font-bold text-paydine-elegant-gray"}>{title}</h2>
          <p className={organic ? "mt-1 font-serif text-sm text-[var(--organic-muted)]" : "text-sm text-gray-500"}>{subtitle}</p>
        </div>
      </div>
      <div className={organic ? "flex gap-4 overflow-x-auto rounded-[2.4rem] border border-[#E5D8BF]/70 bg-[#FFF9EF]/42 p-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:grid md:grid-cols-2 md:overflow-visible" : "flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible"}>
        {items.map((item, index) => (
          <div key={`highlight-${title}-${item.id}`} className="min-w-[82vw] md:min-w-0">
            {organic ? (
              <OrganicBotanicalMenuCard
                item={item}
                onSelect={onSelect}
                onAdd={(event) => onOrganicAdd ? onOrganicAdd(item, event) : onFirstAdd(item)}
                highlightSettings={settings}
              />
            ) : (
              <ExpandingToolbarMenuItemCard
                item={item}
                onSelect={onSelect}
                onFirstAdd={() => onFirstAdd(item)}
                prioritizeImage={index < 2}
                highlightSettings={settings}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// Component for individual order item with expandable options
// PMD_QUANTITY_ICON_SOURCE_WHITE_FINAL_20260601
// PMD_QTY_SVG_REPLACED_WITH_TEXT_SYMBOLS_20260601
function OrderItemWithOptions({
  cartItem,
  addToCart,
  t,
  onOptionsChange,
  optionKey,
  unitLabel
}: {
  cartItem: CartItem;
  addToCart: (item: MenuItem, quantity: number) => void;
  t: (key: TranslationKey) => string;
  onOptionsChange?: (itemKey: string | number, options: Record<string, string>) => void;
  optionKey?: string;
  unitLabel?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  // Use real backend options from the menu item
  const itemOptions = cartItem.item.options || []
  const effectiveOptionKey = optionKey || String(cartItem.item.id)
  const itemDisplayName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
  const displayLabel = unitLabel || `${cartItem.quantity}x ${itemDisplayName}`

  const handleOptionChange = (optionType: string, optionId: string) => {
    const newOptions = {
      ...selectedOptions,
      [optionType]: optionId
    }
    setSelectedOptions(newOptions)

    // Notify parent component of option changes
    if (onOptionsChange) {
      onOptionsChange(effectiveOptionKey, newOptions)
    }
  }

  const getTotalPrice = () => {
    // Get adjusted price helper from parent scope (need to pass it or get from store)
    const { taxSettings } = useCmsStore.getState()
    const adjustPrice = (price: number): number => {
      if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
        return price * (1 + taxSettings.percentage / 100)
      }
      return price
    }

    let total = adjustPrice(cartItem.item.price || 0) * cartItem.quantity
    Object.values(selectedOptions).forEach(optionId => {
      // Find the option in all option types and add its price
      itemOptions.forEach(option => {
        const optionValue = option.values.find(val => val.id.toString() === optionId)
        if (optionValue) {
          total += adjustPrice(optionValue.price) * cartItem.quantity
        }
      })
    })
    return total
  }

  return (
    <div className="pmd-checkout-item-card border border-paydine-champagne/20 rounded-2xl overflow-hidden">
      {/* Main item row */}
      <div className="pmd-checkout-item-row flex justify-between items-center text-xs p-2">
        <span className="text-paydine-elegant-gray min-w-[120px]">
          {displayLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(cartItem.item, -1);
            }}
            className="quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors"
          >
            <span data-pmd-force-qty-symbol="minus" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "22px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>−</span>
          </button>
          <span className="pmd-checkout-item-price text-paydine-elegant-gray font-semibold min-w-[48px] text-center">
            {formatCurrency(getTotalPrice())}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(cartItem.item, 1);
            }}
            className="quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors"
          >
            <span data-pmd-force-qty-symbol="plus" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "22px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>+</span>
          </button>
        </div>
      </div>

      {/* Expandable options section - only show if there are options */}
      {itemOptions.length > 0 && (
        <div className="border-t border-paydine-champagne/10">
          <button
            type="button"
            data-pmd-customize-options-btn="1"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.62)",
              backgroundColor: "rgba(255, 255, 255, 0.62)",
              borderColor: "rgba(216, 185, 130, 0.45)",
              color: "#374151",
              WebkitTextFillColor: "#374151",
              boxShadow: "none",
              textShadow: "none",
            }}
          >
            <span>Customize Options</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              style={{ color: "#374151", stroke: "#374151" }}
            />
          </button>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-3 bg-paydine-rose-beige/5">
                {itemOptions.map((option) => (
                  <div key={option.id}>
                    <h4 className="text-xs font-medium text-paydine-elegant-gray mb-1">
                      {option.name} {option.required && '*'}
                    </h4>
                    <div className="space-y-1">
                      {option.values.map((value) => (
                        <label key={value.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type={option.display_type === 'radio' ? 'radio' : 'checkbox'}
                            name={`${option.name}-${effectiveOptionKey}`}
                            value={value.id.toString()}
                            checked={selectedOptions[option.name] === value.id.toString()}
                            onChange={() => {
                              if (option.display_type === 'radio') {
                                handleOptionChange(option.name, value.id.toString())
                              } else {
                                // For checkboxes, toggle the selection
                                const currentValue = selectedOptions[option.name]
                                handleOptionChange(option.name, currentValue === value.id.toString() ? '' : value.id.toString())
                              }
                            }}
                            className="w-3 h-3 pmd-customer-price"
                          />
                          <span className="text-paydine-elegant-gray">{value.value}</span>
                          {value.price > 0 && (() => {
                            const { taxSettings } = useCmsStore.getState()
                            const adjustPrice = (price: number): number => {
                              if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
                                return price * (1 + taxSettings.percentage / 100)
                              }
                              return price
                            }
                            return (
                              <span className="pmd-customer-price font-medium">
                                +{formatCurrency(adjustPrice(value.price))}
                              </span>
                            )
                          })()}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}


const KazenGoldCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-gold-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SKIN_GOLD_CHECKOUT_20260612 */

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal {
          --kgc-bg: #090705;
          --kgc-panel: #0f0c08;
          --kgc-panel-soft: #15110c;
          --kgc-ink: #f4e7c8;
          --kgc-muted: #c7b48b;
          --kgc-line: rgba(198,164,93,.36);
          --kgc-line-strong: rgba(198,164,93,.58);
          --kgc-red: #df685d;
          --kgc-green: #063f35;

          background:
            radial-gradient(circle at 84% 0%, rgba(120,38,30,.18), transparent 30%),
            linear-gradient(180deg, #0f0b08 0%, #070605 100%) !important;
          border: 1px solid var(--kgc-line-strong) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            0 34px 90px rgba(0,0,0,.64),
            inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] * {
          text-shadow: none !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub {
          background: rgba(8,7,5,.82) !important;
          border-bottom: 1px solid rgba(198,164,93,.20) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .26em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 700 !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0b0907 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          padding: 1rem !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface {
          background:
            linear-gradient(180deg, rgba(244,231,200,.045), rgba(244,231,200,.018)),
            rgba(14,11,8,.86) !important;
          border: 1px solid var(--kgc-line) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            inset 0 1px 0 rgba(244,231,200,.06),
            0 16px 34px rgba(0,0,0,.18) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div {
          color: var(--kgc-muted);
          -webkit-text-fill-color: currentColor;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"] {
          color: var(--kgc-red) !important;
          -webkit-text-fill-color: var(--kgc-red) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover {
          transform: translateY(-1px) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active {
          transform: translateY(0) scale(.985) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent {
          background: var(--kgc-green) !important;
          background-color: var(--kgc-green) !important;
          border-color: var(--kgc-green) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent),
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent) {
          background: rgba(8,7,5,.72) !important;
          border: 1px solid var(--kgc-line) !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea {
          background: rgba(244,231,200,.06) !important;
          border: 1px solid rgba(198,164,93,.32) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder {
          color: rgba(199,180,139,.58) !important;
          -webkit-text-fill-color: rgba(199,180,139,.58) !important;
        }
      `,
    }}
  />
)




const KazenSharedCheckoutNightPolishStyles = () => (
  <style
    data-pmd-kazen-checkout-night-polish="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_CHECKOUT_NIGHT_POLISH_20260612
           This is intentionally scoped only to Kazen shared checkout.
           It does not touch Gold, Modern Green, Organic, or the menu layout.
        */

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          width: min(94vw, 430px) !important;
          max-height: min(88vh, 820px) !important;
          border-radius: 0 !important;
          border: 1px solid rgba(198,164,93,.58) !important;
          background:
            radial-gradient(circle at 88% 0%, rgba(120,38,30,.22), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #070604 100%) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: 0 34px 100px rgba(0,0,0,.72), inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        [data-pmd-checkout-kazen-skin="1"] *,
        [data-pmd-checkout-kazen-skin="1"] *::before,
        [data-pmd-checkout-kazen-skin="1"] *::after {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child {
          min-height: 58px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid rgba(198,164,93,.26) !important;
          background: rgba(8,7,5,.92) !important;
          border-radius: 0 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 800 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.052) 1px, transparent 0),
            linear-gradient(180deg, #090705 0%, #060504 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          padding: 14px !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(198,164,93,.42) rgba(8,7,5,.62) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-flat-section,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] .surface,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:not(:first-child),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.055), rgba(244,231,200,.018)),
            rgba(15,12,8,.88) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.06), 0 14px 28px rgba(0,0,0,.18) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row {
          background: rgba(10,8,6,.58) !important;
          border: 1px solid rgba(198,164,93,.26) !important;
          border-radius: 0 !important;
          padding: .72rem .8rem !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] b,
        [data-pmd-checkout-kazen-skin="1"] .font-semibold,
        [data-pmd-checkout-kazen-skin="1"] .font-bold {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] p,
        [data-pmd-checkout-kazen-skin="1"] span,
        [data-pmd-checkout-kazen-skin="1"] label,
        [data-pmd-checkout-kazen-skin="1"] div,
        [data-pmd-checkout-kazen-skin="1"] .muted,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-helper-text {
          color: #cbb88d !important;
          -webkit-text-fill-color: #cbb88d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-status-title,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row span:first-child,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row span:first-child {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .10em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 30px rgba(0,0,0,.34) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          stroke: #fff6dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.62) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(244,231,200,.075) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(203,184,141,.72) !important;
          -webkit-text-fill-color: rgba(203,184,141,.72) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] img {
          filter: none !important;
          opacity: 1 !important;
        }

        @media (max-width: 520px) {
          [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
            width: min(94vw, 420px) !important;
            max-height: 86vh !important;
          }
          [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
            padding: 12px !important;
          }
        }
      `,
    }}
  />
)


const KazenSharedCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-shared-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SHARED_CHECKOUT_SKIN_20260612
           This is a skin only. It does not create checkout steps/cards/logic.
           Kazen uses the shared PaymentModal flow; these selectors target only
           data-pmd-checkout-kazen-skin="1" so other themes stay untouched.
        */

        [data-pmd-kazen-checkout-overlay="1"] {
          background:
            radial-gradient(circle at 75% 10%, rgba(128, 38, 31, .26), transparent 30%),
            rgba(2, 2, 2, .68) !important;
          backdrop-filter: blur(14px) saturate(.88) !important;
          -webkit-backdrop-filter: blur(14px) saturate(.88) !important;
          padding: 1.15rem !important;
        }

        [data-pmd-checkout-kazen-skin="1"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
          --pmd-checkout-shell-final: #080706 !important;
          --pmd-checkout-panel-final: #100d09 !important;
          --pmd-checkout-field-final: #15110c !important;
          --pmd-checkout-border-final: rgba(198, 164, 93, .36) !important;
          --pmd-checkout-shadow-final: 0 20px 44px rgba(0,0,0,.32) !important;
          --pmd-checkout-primary: #063f35 !important;
          --pmd-checkout-primary-2: #0a4c41 !important;
          --theme-text-primary: #f4e7c8 !important;
          --theme-text-muted: #c9b78f !important;
          --theme-border: rgba(198, 164, 93, .36) !important;
          --theme-surface: #100d09 !important;
          --theme-surface-sub: #15110c !important;
          --theme-primary: #df685d !important;
          --theme-primary-foreground: #fff5dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          background:
            radial-gradient(circle at 86% 0%, rgba(122, 38, 30, .20), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #080706 100%) !important;
          background-color: #080706 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          border-radius: 0 !important;
          box-shadow: 0 34px 90px rgba(0,0,0,.68), inset 0 1px 0 rgba(244,231,200,.08) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          max-height: min(92vh, 860px) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child {
          background: rgba(8, 7, 5, .92) !important;
          background-color: rgba(8, 7, 5, .92) !important;
          border-bottom: 1px solid rgba(198,164,93,.24) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-weight: 700 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0a0806 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-color: rgba(198,164,93,.58) rgba(8,7,5,.92) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .surface-sub,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.050), rgba(244,231,200,.018)),
            rgba(16, 13, 9, .90) !important;
          background-color: rgba(16, 13, 9, .90) !important;
          border-color: rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.055) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-table-order-item-row {
          background: transparent !important;
          background-color: transparent !important;
          border-color: rgba(198,164,93,.20) !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] b {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] p,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] span,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] label,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div {
          color: #c9b78f;
          -webkit-text-fill-color: currentColor;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border-color: rgba(198,164,93,.48) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.72) !important;
          background-color: rgba(8,7,5,.72) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(21,17,12,.92) !important;
          background-color: rgba(21,17,12,.92) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(201,183,143,.62) !important;
          -webkit-text-fill-color: rgba(201,183,143,.62) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-pmd-checkout-kazen-skin="1"] *,
          [data-pmd-checkout-kazen-skin="1"] button {
            transition: none !important;
            animation: none !important;
          }
        }
      `,
    }}
  />
)


// PMD_FORCE_ALL_PLUS_MINUS_SOURCE_WHITE_20260601
// Phase 2B: move PaymentModal orchestration into checkout feature components/hooks after pure helpers are stable.
export function PaymentModal({ isOpen, onClose, items: allItems, tableInfo, existingOrderId, pendingSummary, initialSubmittedOrder, initialCheckoutStep, preferPersonalReview = false, onOpenOrderUpdate, onCartPricingUpdate, checkoutVisualTheme = "neutral" }: PaymentModalProps) {

  // PMD_QUANTITY_ICON_FIRST_PAINT_FIX_20260601
  // Prevent checkout quantity plus/minus icons from flashing black before legacy runtime styles settle.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const fixQuantityIcons = () => {
      document
        .querySelectorAll('[role="dialog"] button svg.lucide-plus, [role="dialog"] button svg.lucide-minus, [data-pmd-gold-checkout-modal] button svg.lucide-plus, [data-pmd-gold-checkout-modal] button svg.lucide-minus')
        .forEach((svg) => {
          const nodes = [svg, ...Array.from(svg.querySelectorAll("*"))]
          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return
            ;(node as HTMLElement | SVGElement).style.setProperty("color", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("stroke", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
          })
        })
    }

    fixQuantityIcons()
    const timer = window.setInterval(fixQuantityIcons, 250)

    const observer = new MutationObserver(fixQuantityIcons)
    if (document.body) {
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])


  // PMD_HIDE_PAYMENT_BASE_AMOUNT_DUPLICATE_20260601
  // Hide duplicate "Base amount" row in payment UI when Payable total is already shown.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const hideBaseAmountRows = () => {
      const roots = document.querySelectorAll("[data-pmd-checkout-scroll], [role='dialog']")
      roots.forEach((root) => {
        root.querySelectorAll("span, p, div").forEach((node) => {
          const text = (node.textContent || "").trim()
          if (text !== "Base amount") return

          const row =
            node.closest("div.flex") ||
            node.closest("div[class*='justify-between']") ||
            node.parentElement

          if (row instanceof HTMLElement) {
            row.style.setProperty("display", "none", "important")
          }
        })
      })
    }

    hideBaseAmountRows()

    const timer = window.setInterval(hideBaseAmountRows, 350)
    const observer = new MutationObserver(hideBaseAmountRows)

    if (document.body) {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])


  // PMD_SPLIT_METHOD_RUNTIME_TEXT_FIX_20260601
  // Old frontend has runtime/theme rules that override split method button text.
  // This exact scoped fixer wins by setting active split text with inline !important.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const applySplitMethodTextFix = () => {
      document
        .querySelectorAll('button[data-pmd-split-method-real]')
        .forEach((button) => {
          const active = button.getAttribute("data-pmd-active") === "1"
          const color = active ? "#FFFFFF" : "#10201D"
          const nodes = [button, ...Array.from(button.querySelectorAll("*"))]

          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return
            node.style.setProperty("color", color, "important")
            node.style.setProperty("-webkit-text-fill-color", color, "important")
            node.style.setProperty("text-decoration-color", color, "important")
          })
        })
    }

    applySplitMethodTextFix()

    const timer = window.setInterval(applySplitMethodTextFix, 150)

    const observer = new MutationObserver(applySplitMethodTextFix)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-pmd-active", "class", "style"],
    })

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { paymentOptions, tipSettings, taxSettings, merchantSettings, loadVATSettings, loadMerchantSettings, appliedCoupon, validateCoupon, removeCoupon } = useCmsStore()
const { clearCart, addToCart, clearTableContext } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [paypalPublicConfig, setPaypalPublicConfig] = useState<{ enabled: boolean; clientId: string; currency: string } | null>(null)
  const [paypalConfigLoading, setPaypalConfigLoading] = useState(false)

  // Helper function to adjust price if VAT is included in menu prices
  const adjustPriceForVAT = (price: number): number => {
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // VAT is included in prices - increase price by VAT percentage
      return price * (1 + taxSettings.percentage / 100)
    }
    return price
  }
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, SplitBillItem>>({})
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal")
  const [splitGuestCount, setSplitGuestCount] = useState(2)
  const [itemAssignments, setItemAssignments] = useState<Record<string, number | null>>({})
  const [sharePercents, setSharePercents] = useState<number[]>([50, 50])
  const [selectedSplitPersonId, setSelectedSplitPersonId] = useState<string | null>(null)
  const [paidSplitPeople, setPaidSplitPeople] = useState<Record<string, boolean>>({})
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewSubmitStatus, setReviewSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("")
  const [invoiceDownloadStatus, setInvoiceDownloadStatus] = useState<"idle" | "loading" | "error">("idle")
  const [invoiceDownloadMessage, setInvoiceDownloadMessage] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, string>>>({})
  const [tipPercentage, setTipPercentage] = useState(0)
  const [customTip, setCustomTip] = useState("")
  const [splitPaymentTips, setSplitPaymentTips] = useState<Record<string, { percentage: number; custom: string }>>({})
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [cashCollectionConfirmed, setCashCollectionConfirmed] = useState(false)
  const [providerInlineError, setProviderInlineError] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // Debug (safe): expose key settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__CMS_STORE__ = { merchantSettings }
    }
  }, [merchantSettings])

  useEffect(() => {
    const detectDarkTheme = () => {
      const themeName = document.documentElement.getAttribute('data-theme') || 'clean-light'
      setIsDarkTheme(themeName === 'modern-dark')
    }

    detectDarkTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          detectDarkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const [loadingPayments, setLoadingPayments] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    email: "",
    phone: "",
  })
  const isOrganicCheckoutVisual = checkoutVisualTheme === ORGANIC_BOTANICAL_THEME_KEY
  const isModernGreenCheckoutVisual = checkoutVisualTheme === "modern_green"
  const isKazenJapaneseCheckoutVisual = checkoutVisualTheme === KAZEN_JAPANESE_THEME_KEY
  const isThemedCheckoutVisual = isOrganicCheckoutVisual || isModernGreenCheckoutVisual || isKazenJapaneseCheckoutVisual


  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(
    getInitialCheckoutStep(initialCheckoutStep, existingOrderId)
  )


  // PMD_ORDER_STATUS_PARENT_JUMP_LOCK_20260603_SAFE
  // Diagnostic showed orderStatusCard + ETA circle jump together by ~239px.
  // Their own size/top stayed stable, so the parent scroll/layout wrapper is moving.
  // useLayoutEffect runs before paint and locks the checkout scroll parent immediately.
  useLayoutEffect(() => {
    if (!isOpen || checkoutStep !== "submitted") return;

    const lockOrderStatusParent = () => {
      const scrollRoots = document.querySelectorAll<HTMLElement>('[data-pmd-checkout-scroll="1"]');

      scrollRoots.forEach((root) => {
        root.dataset.pmdOrderStatusStable = "1";
        root.style.scrollBehavior = "auto";
        root.style.overflowAnchor = "none";
        root.style.alignItems = "stretch";
        root.style.justifyContent = "flex-start";

        if (root.scrollTop !== 0) {
          root.scrollTop = 0;
        }
      });

      const card = document.querySelector<HTMLElement>('[data-pmd-order-status-card="1"]');
      if (card) {
        card.dataset.pmdOrderStatusStableCard = "1";
      }

      const eta = document.querySelector<HTMLElement>('[data-pmd-floating-eta-circle="1"]');
      if (eta) {
        eta.dataset.pmdEtaStable = "1";
      }
    };

    lockOrderStatusParent();
  }, [isOpen, checkoutStep]);
const [submittedSnapshot, setSubmittedSnapshot] = useState<any | null>(initialSubmittedOrder || null)
  // PMD_USE_LATEST_SUBMITTED_ORDER_ID_FOR_PAYMENT_20260612
  const pmdLatestSubmittedPaymentOrderIdRef = useRef<number | null>(null)
  // Phase 2B: table draft/order fetching and submit handlers should move into a shared checkout feature hook.
  const [tableDraft, setTableDraft] = useState<TableOrderDraftResponse | null>(null)
  const hasPersonalItems = allItems.length > 0
  const [draftLoading, setDraftLoading] = useState(false)

  const [stripeConfig, setStripeConfig] = useState<{
    publishableKey: string
    mode: string
    currency?: string
    countryCode?: string
    methods?: {
      card?: boolean
      apple_pay?: boolean
      google_pay?: boolean
    }
  } | null>(null)
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null)


  useEffect(() => {
    if (!isOpen) return
    setCheckoutStep((current) => getCheckoutStepOnOpen({
      initialCheckoutStep,
      existingOrderId,
      hasPersonalItems,
      preferPersonalReview,
      currentStep: current,
    }))
  }, [isOpen, existingOrderId, initialCheckoutStep, hasPersonalItems, preferPersonalReview])

  useEffect(() => {
    if (!initialSubmittedOrder) return
    if ((tableDraft as any)?.draft_id && !(tableDraft as any)?.order_id && !(tableDraft as any)?.orderId) return
    const tableDraftOrderId = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const initialOrderId = Number((initialSubmittedOrder as any)?.orderId || (initialSubmittedOrder as any)?.order_id || 0)
    if (tableDraftOrderId > 0 && initialOrderId > 0 && tableDraftOrderId !== initialOrderId) return
    setSubmittedSnapshot((prev: any) => {
      const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
      if (prevOrderId > 0 && tableDraftOrderId > 0 && prevOrderId === tableDraftOrderId && initialOrderId !== tableDraftOrderId) return prev
      return initialSubmittedOrder
    })
  }, [initialSubmittedOrder, (tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

  useEffect(() => {
    if (!(tableDraft as any)?.draft_id) return
    if ((tableDraft as any)?.order_id || (tableDraft as any)?.orderId) return
    setSubmittedSnapshot(null)
  }, [(tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

  const getTenantKey = () => {
    if (typeof window === 'undefined') return 'tenant'
    return window.location.host
  }
  const getTableKey = () => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const qTable = p?.get('table') || p?.get('table_id') || p?.get('table_no')
    const routeTable = typeof window !== 'undefined' ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null) : null
    return String(tableInfo?.table_id || tableInfo?.table_no || qTable || routeTable || 'delivery')
  }
  const ensureGuestSession = () => {
    if (typeof window === 'undefined') return ''
    const key = 'pmd_guest_session_id'
    let v = localStorage.getItem(key)
    if (!v) { v = `g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`; localStorage.setItem(key, v) }
    return v
  }

  const buildOpenOrderStorageKeys = () => {
    const tenant = getTenantKey()
    const tableKey = getTableKey()
    const guestSessionId = ensureGuestSession()
    return {
      sessionKey: `pmd_open_order:${tenant}:${tableKey}:${guestSessionId}`,
      legacyKey: `pmd_open_order:${tenant}:${tableKey}`,
      guestSessionId,
      tenant,
      tableKey,
    }
  }

  const effectivePayPalClientId =
    paypalPublicConfig?.enabled && paypalPublicConfig?.clientId
      ? paypalPublicConfig.clientId
      : ""

  const effectivePayPalCurrency =
    String(
      paypalPublicConfig?.currency ||
      merchantSettings?.currency ||
      "EUR"
    ).toUpperCase()

  const stripePromise = useMemo(
    () => (stripeConfig?.publishableKey ? loadStripe(stripeConfig.publishableKey) : null),
    [stripeConfig?.publishableKey]
  )

  const visiblePaymentMethods = useMemo(() => getVisiblePaymentMethods(paymentMethods), [paymentMethods])

  const methodByCode = useMemo(() => mapPaymentMethodsByCode(visiblePaymentMethods), [visiblePaymentMethods])

  useEffect(() => {
    if (!selectedPaymentMethod) return
    if (!isPaymentMethodAvailable(visiblePaymentMethods, selectedPaymentMethod)) {
      setSelectedPaymentMethod(null)
    }
  }, [selectedPaymentMethod, visiblePaymentMethods])

  useEffect(() => {
    const selected = selectedPaymentMethod ? methodByCode.get(selectedPaymentMethod) : null

    if (!isStripePaymentMethodForConfig(selected)) return

    let cancelled = false
    fetch("/api/v1/payments/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && data.publishableKey) {
          setStripeConfig({
            publishableKey: data.publishableKey,
            mode: data.mode || "test",
            currency: data.currency || "EUR",
            countryCode: data.countryCode || "DE",
            methods: {
              card: !!data?.methods?.card,
              apple_pay: !!data?.methods?.apple_pay,
              google_pay: !!data?.methods?.google_pay,
            },
          })
          setStripeConfigError(null)
        } else {
          setStripeConfig(null)
          setStripeConfigError(data?.error || "Stripe is not configured")
        }
      })
      .catch(() => {
        if (!cancelled) setStripeConfigError("Failed to load Stripe configuration")
      })

    return () => {
      cancelled = true
    }
  }, [selectedPaymentMethod, methodByCode])

  // Handle option changes from OrderItemWithOptions
  const handleOptionsChange = (itemKey: string | number, options: Record<string, string>) => {
    setSelectedOptions(prev => ({
      ...prev,
      [String(itemKey)]: options
    }))
  }

  // PMD_UNIT_OPTIONS_CHECKOUT_REVIEW_20260604_V4
  // Option-enabled items must be configurable per unit in checkout review.
  // Example: 4x Burger with sides becomes Burger · Item 1..4.
  // Simple items without options stay grouped, e.g. 3x Cola.
  const personalReviewItems = useMemo(() => {
    return allItems.flatMap((cartItem, cartIndex) => {
      const quantity = Math.max(1, Number(cartItem.quantity || 1))
      const hasOptions = Array.isArray((cartItem.item as any)?.options) && (cartItem.item as any).options.length > 0
      const itemId = String((cartItem.item as any)?.id || `item-${cartIndex}`)
      const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name

      if (!hasOptions) {
        return [{
          ...cartItem,
          __pmdOptionKey: itemId,
          __pmdUnitLabel: undefined,
        }]
      }

      if (quantity <= 1) {
        return [{
          ...cartItem,
          quantity: 1,
          __pmdOptionKey: `${itemId}-${cartIndex}-0`,
          __pmdUnitLabel: undefined,
          __pmdSourceQuantity: quantity,
        }]
      }

      return Array.from({ length: quantity }, (_, unitIndex) => ({
        ...cartItem,
        quantity: 1,
        __pmdOptionKey: `${itemId}-${cartIndex}-${unitIndex}`,
        __pmdUnitLabel: `${baseName} · Item ${unitIndex + 1}`,
        __pmdSourceQuantity: quantity,
      }))
    })
  }, [allItems, t])

  // Flatten allItems into individual item instances for split bill
  const allItemInstances = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price || 0,
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
      quantity: 1,
      orderMenuId: Number((cartItem.item as any).__order_menu_id || 0) || undefined,
      menuId: Number((cartItem.item as any).__menu_id || (cartItem.item as any).id || 0) || undefined,
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay = isSplitting
    ? Object.values(selectedItems)
    : personalReviewItems.map((cartItem: any) => ({
        item: cartItem.item,
        price: adjustPriceForVAT(cartItem.item.price || 0),
        quantity: Number(cartItem.quantity || 1),
        optionKey: String(cartItem.__pmdOptionKey || cartItem.item.id)
      }))

  const subtotal = useMemo(
    () => itemsToPay.reduce((acc, inst) => {
      let itemTotal = inst.price * (inst.quantity || 1)

      // Add option prices (with VAT adjustment if needed)
      const itemOptions = selectedOptions[String((inst as any).optionKey || inst.item.id)] || {}
      if (Object.keys(itemOptions).length > 0) {
        const menuItem = allItems.find(cartItem => cartItem.item.id === inst.item.id)
        if (menuItem && menuItem.item.options) {
          Object.values(itemOptions).forEach(optionId => {
            menuItem.item.options!.forEach(option => {
              const optionValue = option.values.find(val => val.id.toString() === optionId)
              if (optionValue) {
                itemTotal += adjustPriceForVAT(optionValue.price) * (inst.quantity || 1)
              }
            })
          })
        }
      }

      return acc + itemTotal
    }, 0),
    [itemsToPay, selectedOptions, allItems, taxSettings],
  )
  // Calculate VAT if enabled AND VAT should be applied on checkout (not already included in prices)
  // vat_menu_price: 0 = VAT included in menu price, 1 = apply VAT on checkout
  const taxAmount = useMemo(() => calculateCheckoutTax(subtotal, taxSettings), [subtotal, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])
  useEffect(() => {
    if (!onCartPricingUpdate) return
    if (!Array.isArray(allItems) || allItems.length === 0) {
      onCartPricingUpdate(null)
      return
    }

    const displayItems = personalReviewItems.map((cartItem: any) => {
      const optionKey = String(cartItem.__pmdOptionKey || cartItem.item.id)
      const selectedForUnit = selectedOptions[optionKey] || {}
      const optionDetails: Array<{ name: string; price: number }> = []

      Object.entries(selectedForUnit).forEach(([optionName, optionId]) => {
        const option = (cartItem.item.options || []).find((candidate: any) => String(candidate.name) === String(optionName))
        const value = option?.values?.find((candidate: any) => String(candidate.id) === String(optionId))
        if (value) optionDetails.push({ name: String(value.value || value.name || ''), price: Number(adjustPriceForVAT(Number(value.price || 0))) })
      })

      const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
      const optionSummary = optionDetails.map((option) => option.name).filter(Boolean).join(', ')
      const displayName = optionSummary ? `${baseName} — ${optionSummary}` : String(cartItem.__pmdUnitLabel || baseName)
      const unitPrice = Number(adjustPriceForVAT(cartItem.item.price || 0)) + optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
      const quantity = Number(cartItem.quantity || 1)

      return {
        ...cartItem,
        quantity,
        __pmdDisplayName: displayName,
        __pmdDisplayUnitPrice: unitPrice,
        __pmdDisplaySubtotal: unitPrice * quantity,
      }
    })

    onCartPricingUpdate({ items: displayItems, subtotal, tax: taxAmount, total: subtotal + taxAmount })
  }, [allItems, personalReviewItems, selectedOptions, subtotal, taxAmount, onCartPricingUpdate, t, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const submittedBaseTotal = useMemo(() => calculateSubmittedBaseTotal(submittedSnapshot, pendingSummary), [submittedSnapshot?.remainingAmount, submittedSnapshot?.total, submittedSnapshot?.orderTotal, pendingSummary?.remainingAmount])
  const isOrderStatusFlow = submittedBaseTotal > 0 && checkoutStep !== "review"
  const tipBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal
  const tipAmount = calculateTipAmount(tipBaseAmount, tipPercentage, customTip)
  const couponBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal

  // Calculate coupon discount
  const couponDiscount = useMemo(() => calculateCouponDiscount(appliedCoupon, couponBaseAmount), [appliedCoupon, couponBaseAmount])

  const finalTotal = calculateFinalTotal(subtotal, taxAmount, tipAmount, couponDiscount)
  const orderStatusTotal = calculateOrderStatusTotal(submittedBaseTotal, subtotal, taxAmount)

  // Phase 2B: split bill state transitions should move behind a shared checkout hook without changing this UI.
  const splitGuestProfiles = useMemo(() => buildSplitGuestProfiles(splitGuestCount, SPLIT_GUEST_PROFILES), [splitGuestCount])
  const splitGuestNames = useMemo(() => splitGuestProfiles.map((profile) => profile.name), [splitGuestProfiles])
  const getSplitGuestAvatar = (idx: number) => getSplitGuestAvatarFromProfiles(splitGuestProfiles, idx)

  const suggestedSplitGuestCount = useMemo(() => {
    const groupCount = Array.isArray(tableDraft?.groups)
      ? tableDraft.groups.filter((group: any) => Array.isArray(group?.items) && group.items.length > 0).length
      : 0
    const contributorIds = new Set<string>()
    const submittedItems = Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : []
    submittedItems.forEach((item: any) => {
      const contributor = String(item?.guest_session_id || item?.guestSessionId || item?.submitted_by || "").trim()
      if (contributor) contributorIds.add(contributor)
    })
    const itemContributorCount = contributorIds.size
    return Math.max(2, Math.min(10, groupCount || itemContributorCount || 2))
  }, [tableDraft?.groups, submittedSnapshot?.submittedItems])

  const addSplitGuest = () => {
    const nextCount = Math.min(10, splitGuestCount + 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  const removeSplitGuest = () => {
    const nextCount = Math.max(2, splitGuestCount - 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  useEffect(() => {
    setSharePercents((prev) => normalizeSharePercentsForGuestCount(prev, splitGuestCount, buildEvenSharePercents(splitGuestCount)))
    setItemAssignments((prev) => pruneItemAssignmentsForGuestCount(prev, splitGuestCount))
  }, [splitGuestCount])

  const splitSourceItems = useMemo<SplitSourceItem[]>(() => {
    const submittedItems = groupOrderDisplayItems(Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : [])
    if (submittedItems.length > 0) {
      return submittedItems.flatMap((item: any, itemIndex: number) => {
        const quantity = Math.max(1, Number(item?.quantity || 1))
        const unitAmount = getOrderItemUnitAmount(item)
        return Array.from({ length: quantity }, (_, unitIndex) => ({
          key: `submitted-${item?.order_menu_id || item?.menu_id || item?.id || itemIndex}-${unitIndex}`,
          name: String(item?.name || `Item ${itemIndex + 1}`),
          amount: Number.isFinite(unitAmount) ? unitAmount : 0,
          orderMenuId: Number(item?.order_menu_id || item?.id || 0) || undefined,
        }))
      })
    }

    return allItemInstances.map((instance, index) => ({
      key: instance.key,
      name: instance.item.nameKey ? t(instance.item.nameKey as TranslationKey) : (instance.item.name || `Item ${index + 1}`),
      amount: Number(adjustPriceForVAT(instance.price || 0)),
      orderMenuId: instance.orderMenuId,
    }))
  }, [submittedSnapshot?.submittedItems, allItemInstances, t, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const splitSubtotal = useMemo(() => calculateSplitSubtotal(splitSourceItems), [splitSourceItems])
  const splitGrandTotal = useMemo(() => submittedBaseTotal > 0 ? orderStatusTotal : finalTotal, [submittedBaseTotal, orderStatusTotal, finalTotal])
  const splitExtraAmount = Math.max(0, splitGrandTotal - splitSubtotal)

  const equalSplitPeople = useMemo(() => buildEqualSplitPeople({
    splitGrandTotal,
    splitGuestCount,
    splitGuestNames,
    splitGuestProfiles,
    splitSubtotal,
    splitExtraAmount,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGrandTotal, splitGuestCount, splitGuestNames, splitGuestProfiles, splitSubtotal, splitExtraAmount, paidSplitPeople, selectedSplitPersonId])

  const itemSplitPeople = useMemo(() => buildItemSplitPeople({
    splitGuestCount,
    splitSourceItems,
    itemAssignments,
    splitSubtotal,
    splitExtraAmount,
    couponDiscount,
    splitGuestNames,
    splitGuestProfiles,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGuestCount, splitSourceItems, itemAssignments, splitSubtotal, splitExtraAmount, couponDiscount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId])

  const shareSplitPeople = useMemo(() => buildShareSplitPeople({
    splitGuestCount,
    sharePercents,
    splitGrandTotal,
    splitSubtotal,
    splitExtraAmount,
    splitGuestNames,
    splitGuestProfiles,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGuestCount, sharePercents, splitGrandTotal, splitSubtotal, splitExtraAmount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId])

  const activeSplitPeople = getActiveSplitPeople({ splitMethod, equalSplitPeople, itemSplitPeople, shareSplitPeople })
  const selectedSplitPerson = getSelectedSplitPerson(activeSplitPeople, selectedSplitPersonId)
  const { unassignedSplitItems, sharePercentTotal, canConfirmSplitMethod } = calculateSplitConfirmationState({
    splitMethod,
    splitSourceItems,
    itemAssignments,
    sharePercents,
    splitGuestCount,
  })

  const splitPaymentTip = selectedSplitPersonId ? (splitPaymentTips[selectedSplitPersonId] || { percentage: 0, custom: "" }) : { percentage: 0, custom: "" }
  const paymentTipPercentage = selectedSplitPerson ? splitPaymentTip.percentage : tipPercentage
  const paymentCustomTip = selectedSplitPerson ? splitPaymentTip.custom : customTip
  const {
    paymentBaseAmount,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentPayableTotal,
    paymentSubtotalAmount,
    paymentVatAmount,
    paymentVatPercentage,
  } = calculatePaymentSummary({
    selectedSplitPerson,
    submittedBaseTotal,
    finalTotal,
    paymentCustomTip,
    paymentTipPercentage,
    couponDiscount,
    submittedSnapshot,
    taxPercentage: taxSettings?.percentage ?? 0,
  })
  const { paidTipAmount, paidCouponDiscount, paidAmountTotal } = calculatePaidSnapshotTotals({
    checkoutStep,
    submittedSnapshot,
    paymentTipAmount,
    tipAmount,
    paymentCouponDiscount,
    couponDiscount,
    orderStatusTotal,
    paymentPayableTotal,
  })

  const updatePaymentTipPercentage = (percentage: number) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev) => ({ ...prev, [selectedSplitPersonId]: { percentage, custom: "" } }))
      return
    }
    setTipPercentage(percentage)
    setCustomTip("")
  }

  const updatePaymentCustomTip = (value: string) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev) => ({ ...prev, [selectedSplitPersonId]: { percentage: 0, custom: value } }))
      return
    }
    setCustomTip(value)
    setTipPercentage(0)
  }

  const resetPaymentAdjustmentsAfterSuccess = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
    setTipPercentage(0)
    setCustomTip("")
  }

  const payableTotal = useMemo(() => calculatePayableTotal({ checkoutStep, paymentPayableTotal, orderStatusTotal, finalTotal }), [checkoutStep, paymentPayableTotal, orderStatusTotal, finalTotal])
  // PMD_PAYMENT_METHOD_SMOOTH_SCROLL_EFFECT
  useEffect(() => {
    if (checkoutStep !== "payment" || !selectedPaymentMethod) return

    const container = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    const detail = document.querySelector('[data-pmd-payment-selected-detail="1"]') as HTMLElement | null
    if (!container) return

    let raf = 0
    let cancelled = false

    const easeInOutCubic = (t: number) => (
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
    )

    const animateTo = (targetTop: number, duration = 760) => {
      const startTop = container.scrollTop
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
      const finalTop = Math.max(0, Math.min(targetTop, maxTop))
      const delta = finalTop - startTop
      const startTime = performance.now()

      const step = (now: number) => {
        if (cancelled) return
        const progress = Math.min(1, (now - startTime) / duration)
        container.scrollTop = startTop + (delta * easeInOutCubic(progress))
        if (progress < 1) {
          raf = window.requestAnimationFrame(step)
        }
      }

      raf = window.requestAnimationFrame(step)
    }

    const runSmoothScroll = () => {
      if (detail) {
        const buffer = 28
        const targetTop = detail.offsetTop + detail.offsetHeight - container.clientHeight + buffer
        animateTo(targetTop, 820)
      } else {
        animateTo(container.scrollHeight - container.clientHeight, 820)
      }
    }

    const t1 = window.setTimeout(runSmoothScroll, 50)
    const t2 = window.setTimeout(runSmoothScroll, 240)
    const t3 = window.setTimeout(runSmoothScroll, 520)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [checkoutStep, selectedPaymentMethod])

  // PMD_MARK_REAL_PAYMENT_PANELS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markRealPaymentPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const candidates = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalizedText = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scoreCandidate = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const text = normalizedText(el)
        return {
          el,
          text,
          area: rect.width * rect.height,
          length: text.length,
        }
      }

      const findSmallestPanel = (required: string[], forbidden: string[] = []) => {
        return candidates
          .map(scoreCandidate)
          .filter((row) => {
            if (row.area < 8000) return false
            if (row.length < 5) return false
            if (!required.every((word) => row.text.includes(word))) return false
            if (forbidden.some((word) => row.text.includes(word))) return false
            return true
          })
          .sort((a, b) => a.length - b.length || a.area - b.area)[0]?.el || null
      }

      const summaryPanel = findSmallestPanel(["Ready to pay?", "Base amount", "Payable total"], ["Payment Methods"])
      const tipCouponPanel = findSmallestPanel(["Add tip", "0%", "5%", "10%"], ["Payment Methods", "Card Information"])

      if (summaryPanel) {
        summaryPanel.setAttribute("data-pmd-payment-real-panel", "summary")
      }

      if (tipCouponPanel) {
        tipCouponPanel.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
      }

      ;[summaryPanel, tipCouponPanel].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")

        Array.from(el.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement
          childEl.style.setProperty("background-color", "transparent", "important")
          childEl.style.setProperty("background", "transparent", "important")
          childEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    markRealPaymentPanels()

    const t1 = window.setTimeout(markRealPaymentPanels, 60)
    const t2 = window.setTimeout(markRealPaymentPanels, 220)
    const t3 = window.setTimeout(markRealPaymentPanels, 700)

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markRealPaymentPanels)
    })

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_SEND_KITCHEN_BUTTON_MARKER_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll('button')) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        if (txt.includes("Send order to kitchen")) {
          btn.setAttribute("data-pmd-send-kitchen-btn", "1")

          const spans = btn.querySelectorAll("span")
          if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
          if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

          const svg = btn.querySelector("svg")
          if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")
        }
      })
    }

    apply()

    const t1 = window.setTimeout(apply, 40)
    const t2 = window.setTimeout(apply, 180)
    const t3 = window.setTimeout(apply, 700)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, selectedPaymentMethod, isSplitting, selectedSplitPersonId, couponDiscount, tipPercentage, customTip])


  // PMD_MARK_REAL_PAYMENT_PANELS_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const allDivs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalize = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scored = allDivs.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          el,
          txt: normalize(el),
          area: rect.width * rect.height,
          len: normalize(el).length,
        }
      })

      const pick = (required: string[], forbidden: string[] = []) => {
        return scored
          .filter((row) => row.area > 9000)
          .filter((row) => required.every((needle) => row.txt.includes(needle)))
          .filter((row) => !forbidden.some((needle) => row.txt.includes(needle)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const summary = pick(["Ready to pay?", "Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipCoupon = pick(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])

      if (summary) summary.setAttribute("data-pmd-payment-real-panel", "summary")
      if (tipCoupon) tipCoupon.setAttribute("data-pmd-payment-real-panel", "tip-coupon")

      const wrapper = pick(["Ready to pay?", "Add tip"], ["Card Information", "Payment Methods"])
      if (wrapper) wrapper.setAttribute("data-pmd-payment-adjustment-card", "1")
    }

    markPanels()

    const t1 = window.setTimeout(markPanels, 50)
    const t2 = window.setTimeout(markPanels, 220)
    const t3 = window.setTimeout(markPanels, 800)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markPanels)
    })

    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])

  // PMD_COMPACT_ACTIONS_REAL_PAYMENT_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const softCream = "#FAF9F3"

    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const setSoftCream = (el: HTMLElement | null) => {
      if (!el) return
      el.style.setProperty("background", softCream, "important")
      el.style.setProperty("background-color", softCream, "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const markTableOrderActions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = normalize(btn.textContent)

        if (txt.includes("Send order to kitchen")) {
          btn.setAttribute("data-pmd-send-kitchen-btn", "1")

          const spans = btn.querySelectorAll("span")
          if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
          if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

          const svg = btn.querySelector("svg")
          if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

          let parent = btn.parentElement as HTMLElement | null
          for (let i = 0; i < 6 && parent; i += 1) {
            const parentText = normalize(parent.textContent)
            const buttonCount = parent.querySelectorAll("button").length

            if (parentText.includes("Send order to kitchen") && parentText.includes("Continue ordering") && buttonCount >= 2) {
              parent.setAttribute("data-pmd-table-order-actions-row", "1")

              Array.from(parent.querySelectorAll("button")).forEach((rowButton) => {
                const rowBtn = rowButton as HTMLElement
                const rowText = normalize(rowBtn.textContent)

                if (rowText.includes("Continue ordering")) {
                  rowBtn.setAttribute("data-pmd-table-order-continue-btn", "1")
                }
              })

              break
            }

            parent = parent.parentElement as HTMLElement | null
          }
        }
      })
    }

    const markPaymentPanels = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const divs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const score = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const txt = normalize(el.textContent)
        return {
          el,
          txt,
          area: rect.width * rect.height,
          len: txt.length,
        }
      }

      const rows = divs.map(score)

      const pickSmallest = (required: string[], forbidden: string[] = []) => {
        return rows
          .filter((row) => row.area > 4000)
          .filter((row) => required.every((word) => row.txt.includes(word)))
          .filter((row) => !forbidden.some((word) => row.txt.includes(word)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const paymentHeader = root.querySelector('[data-pmd-payment-header-copy-row="1"]') as HTMLElement | null
      const summaryOnly = pickSmallest(["Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipOnly = pickSmallest(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])
      const fullAdjustment = pickSmallest(["Base amount", "Payable total", "Add tip"], ["Card Information", "Payment Methods"])

      if (paymentHeader) {
        paymentHeader.setAttribute("data-pmd-payment-soft-bg", "header")
        setSoftCream(paymentHeader)
      }

      if (summaryOnly) {
        summaryOnly.setAttribute("data-pmd-payment-real-panel", "summary")
        setSoftCream(summaryOnly)
      }

      if (tipOnly) {
        tipOnly.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
        // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
        // Do NOT paint the Add tip / coupon panel cream.
        // It must be transparent from the same writer that marks it,
        // otherwise another hook has to correct it after paint and the UI blinks.
        tipOnly.style.setProperty("background", "transparent", "important")
        tipOnly.style.setProperty("background-color", "transparent", "important")
        tipOnly.style.setProperty("background-image", "none", "important")
        tipOnly.style.setProperty("border-color", "transparent", "important")
        tipOnly.style.setProperty("box-shadow", "none", "important")
      }

      if (fullAdjustment) {
        fullAdjustment.setAttribute("data-pmd-payment-adjustment-shell", "1")
        fullAdjustment.setAttribute("data-pmd-payment-soft-bg", "shell")
        setSoftCream(fullAdjustment)

        Array.from(fullAdjustment.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement

          // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
          // Do not repaint Add tip / coupon inner rows.
          if (childEl.closest('[data-pmd-payment-real-panel="tip-coupon"]')) return

          setSoftCream(childEl)
        })
      }

      ;[paymentHeader, summaryOnly, tipOnly, fullAdjustment].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.querySelectorAll("input, textarea, select").forEach((input) => {
          const pmdKazenInputSkipTarget = input as HTMLElement
          if (pmdKazenInputSkipTarget.closest('[data-pmd-kazen-checkout-shell="1"] form[data-pmd-stripe-form="1"]')) return // PMD_SKIP_OLD_INPUT_STYLER_FOR_KAZEN_PAYMENT_20260612
          const inputEl = input as HTMLElement
          inputEl.style.setProperty("background", softCream, "important")
          inputEl.style.setProperty("background-color", softCream, "important")
          inputEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    const applyAll = () => {
      markTableOrderActions()
      markPaymentPanels()
    }

    applyAll()

    const t1 = window.setTimeout(applyAll, 40)
    const t2 = window.setTimeout(applyAll, 180)
    const t3 = window.setTimeout(applyAll, 520)
    const t4 = window.setTimeout(applyAll, 1100)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyAll)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      observer.disconnect()
    }
  }, [checkoutStep, selectedPaymentMethod, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, isSplitting, selectedSplitPersonId])

  // PMD_TABLE_ORDER_BUTTONS_LIKE_CONFIRM_EFFECT
  useEffect(() => {
    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const applyTableOrderButtonLayout = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const text = normalize(btn.textContent)

        if (!text.includes("Send order to kitchen")) return

        btn.setAttribute("data-pmd-table-order-confirm-like", "primary")
        btn.setAttribute("data-pmd-send-kitchen-btn", "1")

        const spans = Array.from(btn.querySelectorAll("span")) as HTMLElement[]
        if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
        if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

        const svg = btn.querySelector("svg") as SVGElement | null
        if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

        const readyRow = btn.parentElement as HTMLElement | null
        if (readyRow && normalize(readyRow.textContent).includes("Ready to send?")) {
          readyRow.setAttribute("data-pmd-table-order-ready-row", "1")
        }

        let shell = readyRow?.parentElement as HTMLElement | null
        for (let i = 0; i < 8 && shell; i += 1) {
          const shellText = normalize(shell.textContent)
          const shellButtons = Array.from(shell.querySelectorAll("button")) as HTMLElement[]

          if (
            shellText.includes("Ready to send?") &&
            shellText.includes("Send order to kitchen") &&
            shellText.includes("Continue ordering") &&
            shellButtons.length >= 2
          ) {
            shell.setAttribute("data-pmd-table-order-actions-shell", "1")

            shellButtons.forEach((candidate) => {
              const candidateText = normalize(candidate.textContent)
              if (candidateText.includes("Continue ordering")) {
                candidate.setAttribute("data-pmd-table-order-confirm-like", "secondary")
                candidate.setAttribute("data-pmd-table-order-continue-btn", "1")
              }
            })

            break
          }

          shell = shell.parentElement as HTMLElement | null
        }
      })
    }

    applyTableOrderButtonLayout()

    const t1 = window.setTimeout(applyTableOrderButtonLayout, 40)
    const t2 = window.setTimeout(applyTableOrderButtonLayout, 180)
    const t3 = window.setTimeout(applyTableOrderButtonLayout, 650)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyTableOrderButtonLayout)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, submittedSnapshot?.orderId, selectedPaymentMethod])

  // PMD_CARD_ACTION_BUTTONS_CONFIRM_SEND_CONTINUE_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 42%, var(--theme-border) 58%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const stylePrimary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Confirm") {
          btn.setAttribute("data-pmd-card-confirm-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Send to kitchen" || txt === "Send order to kitchen" || txt === "Sending...") {
          btn.setAttribute("data-pmd-card-send-kitchen-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Continue ordering") {
          btn.setAttribute("data-pmd-card-continue-btn", "1")
          styleSecondary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_PAY_SPLIT_REVIEW_BUTTONS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")

        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
          el.style.setProperty("fill", "none", "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("transition", "transform 180ms cubic-bezier(.2,0,0,1), box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease", "important")
    }

    const stylePrimary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt.includes("Pay in full")) {
          btn.setAttribute("data-pmd-card-pay-full-btn", "1")
          stylePrimary(btn)
        }

        if (txt.includes("Split bill")) {
          btn.setAttribute("data-pmd-card-split-bill-btn", "1")
          styleSecondary(btn)
        }

        if (txt === "Review split" || txt.includes("Review split")) {
          btn.setAttribute("data-pmd-card-review-split-btn", "1")
          stylePrimary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_NO_OBSERVER_BUTTON_STYLE_FINAL
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "primary")
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "secondary")
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }
      })
    }

    apply()
    const timers = [0, 80, 200, 500, 900, 1400].map((delay) => window.setTimeout(apply, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])

  // PMD_RENDER_SAFE_PLUS_CONFIRM_SEND_SPLIT_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", "1.5px solid color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const splitChoice = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-split-method", "1")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusButton = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-plus", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusButton(btn)
          return
        }

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }

        if (
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: Split equally */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By order items */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By shares */
        ) {
          splitChoice(btn)
          return
        }
      })
    }

    const w = window as any
    w.__pmdRenderSafeButtonSeq = (w.__pmdRenderSafeButtonSeq || 0) + 1
    const seq = w.__pmdRenderSafeButtonSeq

    const timers = [0, 40, 120, 260, 520, 900, 1400].map((delay) =>
      window.setTimeout(() => {
        if ((window as any).__pmdRenderSafeButtonSeq === seq) apply()
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  })

  // PMD_PLUS_WHITE_AND_SHARE_LINK_BUTTONS_FIX
  useEffect(() => {
    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondaryGreenFrame = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusWhite = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-plus-force-white", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusWhite(btn)
          return
        }

        if (txt.includes("Pay my share")) {
          primary(btn)
          return
        }

        if (
          txt.includes("Send payment link to others") ||
          txt.includes("Show QR/share link")
        ) {
          secondaryGreenFrame(btn)
          return
        }
      })
    }

    const timers = [0, 30, 80, 180, 350, 700, 1200, 1800].map((delay) =>
      window.setTimeout(apply, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])


// PMD_SELECT_PAYER_BUTTON_FRAME_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const applySelectPayerStyle = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Select payer") {
          btn.setAttribute("data-pmd-select-payer-btn", "1")
          btn.style.setProperty("min-height", "3.5rem", "important")
          btn.style.setProperty("height", "3.5rem", "important")
          btn.style.setProperty("width", "100%", "important")
          btn.style.setProperty("border-radius", "9999px", "important")
          btn.style.setProperty("display", "flex", "important")
          btn.style.setProperty("align-items", "center", "important")
          btn.style.setProperty("justify-content", "center", "important")
          btn.style.setProperty("padding", "0 1.25rem", "important")
          btn.style.setProperty("background", "#FAF9F3", "important")
          btn.style.setProperty("background-color", "#FAF9F3", "important")
          btn.style.setProperty("background-image", "none", "important")
          btn.style.setProperty("border", "1.5px solid #062F2A", "important")
          btn.style.setProperty("color", "#062F2A", "important")
          btn.style.setProperty("-webkit-text-fill-color", "#062F2A", "important")
          btn.style.setProperty("font-weight", "750", "important")
          btn.style.setProperty("font-size", "1rem", "important")
          btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
          btn.style.setProperty("text-shadow", "none", "important")
        }
      })
    }

    const timers = [0, 60, 160, 350, 700].map((delay) => window.setTimeout(applySelectPayerStyle, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep, selectedSplitPersonId, splitMethod])
  const estimatePrepMinutes = (items: Array<any>) => {
    const normalized = (items || []).map((item) => ({
      quantity: Math.max(1, Number(item?.quantity || 1)),
      prep: Math.max(0, Number(item?.prep_time_minutes ?? item?.item?.prep_time_minutes ?? 15) || 15),
    }))
    const quantity = normalized.reduce((acc, item) => acc + item.quantity, 0)
    const base = normalized.reduce((acc, item) => Math.max(acc, item.prep), 15)
    const buffer = Math.min(15, Math.max(0, (quantity - 1) * 2))
    return Math.max(10, Math.min(90, Math.round(base + buffer)))
  }
  const estimatedMinutes = useMemo(() => {
    const backendEta = Number(submittedSnapshot?.etaMinutes || submittedSnapshot?.estimated_prep_minutes || 0)
    if (backendEta > 0) return backendEta
    return estimatePrepMinutes(submittedSnapshot?.submittedItems || itemsToPay)
  }, [submittedSnapshot?.submittedItems, submittedSnapshot?.etaMinutes, submittedSnapshot?.estimated_prep_minutes, itemsToPay])
  // NOTE: Live status-based ETA text would require backend order-status polling/endpoint.
  const vatLabels = useMemo(() => {
    if (!taxSettings.enabled || taxSettings.percentage <= 0) {
      return { summary: "Order Summary", subtotal: "Subtotal", total: "Total", includedNote: "" }
    }

    if (taxSettings.menuPrice === 0) {
      const vatPct = Number.isInteger(taxSettings.percentage)
        ? String(taxSettings.percentage)
        : String(Number(taxSettings.percentage.toFixed(2)))

      return {
        summary: "Order Summary",
        subtotal: `Subtotal (incl. ${vatPct}% VAT)`,
        total: "Total",
        includedNote: `prices incl. ${vatPct}% VAT`,
      }
    }

    return { summary: "Order Summary", subtotal: "Subtotal", total: "Total", includedNote: "" }
  }, [taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  // PMD_TIP_COUPON_PANEL_INLINE_BG_FINAL_20260605
  // VISUAL ONLY: override only the inline background of Add tip / coupon panel.
  // No payment logic, no coupon logic, no cart logic, no plus/minus logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const clearTipCouponPanelBackground = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const panel = root.querySelector('[data-pmd-payment-real-panel="tip-coupon"]') as HTMLElement | null
      if (!panel) return

      const makeTransparent = (el: HTMLElement | null | undefined) => {
        if (!el) return
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("background-image", "none", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")
      }

      makeTransparent(panel)

      Array.from(panel.children).forEach((child) => {
        const childEl = child as HTMLElement
        makeTransparent(childEl)

        Array.from(childEl.children).forEach((grandChild) => {
          makeTransparent(grandChild as HTMLElement)
        })
      })
    }

    clearTipCouponPanelBackground()

    const t1 = window.setTimeout(clearTipCouponPanelBackground, 60)
    const t2 = window.setTimeout(clearTipCouponPanelBackground, 220)
    const t3 = window.setTimeout(clearTipCouponPanelBackground, 700)
    const t4 = window.setTimeout(clearTipCouponPanelBackground, 1400)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_FLATTEN_EXACT_CHECKOUT_FRAMES_SAFE_20260606
  // VISUAL ONLY: flatten only the exact checkout div frames found by audit.
  // Does NOT touch buttons, inputs, Pay, Send to kitchen, Split bill, quantity controls, or payment/order logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const flattenDiv = (el: HTMLElement | null | undefined) => {
      if (!el) return

      // Never touch controls or payment form internals.
      if (el.matches("button,input,textarea,select")) return
      if (el.closest('form[data-pmd-stripe-form="1"]')) return
      if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

      el.style.setProperty("background", "transparent", "important")
      el.style.setProperty("background-color", "transparent", "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("border-color", "transparent", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const exactSelectors = [
      '[data-pmd-payment-header-copy-row="1"]',
      '[data-pmd-split-guest-stepper="1"]',
      '.pmd-checkout-meta-row',
      '.pmd-checkout-total-card',
      '.pmd-checkout-flat-section',
      '.pmd-checkout-list-scroll',
      '.pmd-checkout-item-card',
      '.surface-sub.rounded-2xl.p-4.space-y-4',
      '.surface-sub.rounded-2xl.p-3.space-y-1',
      '.surface-sub.rounded-2xl.p-3.space-y-2',
      '.surface-sub.rounded-2xl.p-3.space-y-3',
      '.surface-sub.rounded-3xl.p-3.space-y-3',
      '.rounded-2xl.p-3.shadow-sm',
      '.rounded-2xl.border.p-3',
      '.flex.items-center.justify-between.rounded-2xl.border.p-3'
    ]

    for (const selector of exactSelectors) {
      root.querySelectorAll(selector).forEach((node) => {
        flattenDiv(node as HTMLElement)
      })
    }
  }, [checkoutStep, selectedPaymentMethod, splitMethod, splitGuestCount, couponDiscount, tipPercentage, customTip, appliedCoupon?.code])


  // PMD_HIDE_ORDER_TYPE_TABLE_NUMBER_20260606
  // VISUAL ONLY: hide Order type / Table number / Order Number rows inside checkout cards.
  // Does NOT touch buttons, inputs, payment logic, split logic, quantity controls, or order submit logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    const hideOrderMetaRows = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      // Main known row used for "Order type Delivery" / table context.
      root.querySelectorAll(".pmd-checkout-meta-row").forEach((node) => {
        const el = node as HTMLElement
        el.setAttribute("data-pmd-order-meta-hidden", "1")
        el.style.setProperty("display", "none", "important")
      })

      // Catch small direct rows such as "Order Number: 1606" or "Table number: 4"
      // without hiding large cards that contain totals.
      root.querySelectorAll("div").forEach((node) => {
        const el = node as HTMLElement

        if (el.matches("button,input,textarea,select")) return
        if (el.closest('form[data-pmd-stripe-form="1"]')) return
        if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

        const rect = el.getBoundingClientRect()
        if (rect.width < 80 || rect.height < 10 || rect.height > 80) return

        const text = (el.innerText || "").trim().replace(/\s+/g, " ")
        if (!text) return

        const firstChildText = ((el.children?.[0] as HTMLElement | undefined)?.innerText || "")
          .trim()
          .replace(/\s+/g, " ")

        const isMetaLabel =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?\s*$/i.test(firstChildText)

        const isMetaRow =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?/i.test(text)

        if (isMetaLabel || isMetaRow) {
          el.setAttribute("data-pmd-order-meta-hidden", "1")
          el.style.setProperty("display", "none", "important")
        }
      })
    }

    hideOrderMetaRows()

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const observer = new MutationObserver(() => hideOrderMetaRows())
    observer.observe(root, { childList: true, subtree: true })

    const t1 = window.setTimeout(hideOrderMetaRows, 50)
    const t2 = window.setTimeout(hideOrderMetaRows, 250)

    return () => {
      observer.disconnect()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [checkoutStep])









  const modalPrimaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
  const modalPrimaryBtnStyle: React.CSSProperties = isKazenJapaneseCheckoutVisual
    ? {
        background: "#17120e",
        color: "#f8f0df",
        WebkitTextFillColor: "#f8f0df",
        textShadow: "none",
        border: "1px solid rgba(125, 92, 48, .68)",
        borderRadius: 0,
        boxShadow: "none",
      }
    : isOrganicCheckoutVisual
      ? organicCheckoutPrimaryButtonStyle
      : {
          background: "#062F2A",
          color: "#FFFFFF",
          textShadow: "none",
          border: "1px solid #062F2A",
        }

  // PMD_PERMANENT_CONSOLE_TIP_COUPON_FIX_20260605
  // Narrow runtime visual fix for tip custom field + coupon/apply only.
  // This intentionally does NOT touch plus/minus buttons, cart buttons, Pay in full, Split bill, or payment logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const forceStyle = (el: HTMLElement | null | undefined, styles: Record<string, string>) => {
      if (!el) return
      Object.entries(styles).forEach(([key, value]) => {
        el.style.setProperty(key, value, "important")
      })
    }

    const applyTipCouponVisualFix = () => {
      const root =
        (document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null) ||
        (document.querySelector('[data-pmd-checkout-design-system="1"]') as HTMLElement | null)

      if (!root) return

      const custom = root.querySelector(
        'input[data-pmd-custom-tip-shows-selected-amount="1"]'
      ) as HTMLElement | null

      const customWrap = custom?.closest("div") as HTMLElement | null
      const euro = customWrap?.querySelector("span") as HTMLElement | null

      const coupon = root.querySelector('input[placeholder="Coupon code"]') as HTMLElement | null
      const applyButton = coupon?.parentElement?.querySelector("button") as HTMLElement | null

      forceStyle(customWrap, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
      })

      forceStyle(euro, {
        left: "20px",
        top: "50%",
        height: "46px",
        "line-height": "46px",
        display: "flex",
        "align-items": "center",
        transform: "translateY(-50%)",
        "font-size": "14px",
        "font-weight": "750",
        "z-index": "2",
        "pointer-events": "none",
      })

      forceStyle(custom, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "54px",
        "padding-right": "14px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(coupon, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "16px",
        "padding-right": "16px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(applyButton, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "1",
        "box-sizing": "border-box",
        "font-size": "14.72px",
        "font-weight": "750",
        "border-radius": "9999px",
      })
    }

    let rafId: number | null = null

    const scheduleFix = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        applyTipCouponVisualFix()
      })
    }

    applyTipCouponVisualFix()

    const observer = new MutationObserver(scheduleFix)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })

    const intervalId = window.setInterval(applyTipCouponVisualFix, 700)

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      observer.disconnect()
      window.clearInterval(intervalId)
    }
  }, [])

  const modalSecondaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2"
  const iconBackBtn = "h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"
  const toolbarIconBtnStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text-primary)",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
  }
  const draftContext = useMemo(() => buildTableOrderDraftContext(
    tableInfo,
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("qr") : null,
  ), [tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code])

  const getDraftContext = () => draftContext

  const refreshTableDraft = async () => {
    const context = getDraftContext()
    if (!context.table_id && !context.table_no && !context.qr) return null
    setDraftLoading(true)
    try {
      const latest = await apiClient.getTableOrderDraft(context)
      if (latest?.success) {
        setTableDraft(latest)
        console.info("PMD_TABLE_DRAFT_LOADED", { status: latest.status, draft_id: latest.draft_id ?? null, order_id: latest.order_id ?? null })
        if (latest.order_id && latest.status && latest.status !== "draft" && latest.status !== "empty") {
          const normalizedLatestSnapshot = createSubmittedTableOrderSnapshot(latest, tableInfo, taxSettings?.percentage || 0)
          setSubmittedSnapshot((prev: any) => {
            const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
            const latestOrderId = Number(normalizedLatestSnapshot.orderId || 0)
            return !prev || prevOrderId !== latestOrderId ? normalizedLatestSnapshot : { ...prev, ...normalizedLatestSnapshot }
          })
          console.info("PMD_TABLE_ORDER_PAYMENT_READY", { order_id: latest.order_id, status: latest.status })
        }
      }
      return latest
    } finally {
      setDraftLoading(false)
    }
  }


  const {
    isSubmittingDraft: submitDraftLoading,
    confirmTableDraftItems: confirmTableDraftItemsAction,
    submitTableDraft: submitTableDraftAction,
  } = useTableOrderActions({
    context: draftContext,
    getGuestSessionId: ensureGuestSession,
    refreshDraft: refreshTableDraft,
  })

  useEffect(() => {
    if (!isOpen) return
    void refreshTableDraft()
    const timer = window.setInterval(() => { void refreshTableDraft() }, 12000)
    const onFocus = () => { void refreshTableDraft() }
    window.addEventListener("focus", onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [isOpen, tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code])

  // PMD_PRICED_OPTIONS_DRAFT_PAYLOAD_20260604
  // Send option-enabled unit rows with priced options to backend.
  // Backend remains source of truth for VAT/order totals, but it needs the per-line option subtotal.
  const buildPersonalDraftItems = () => personalReviewItems.map((cartItem: any) => {
    const menuId = Number((cartItem.item as any)?.id || (cartItem.item as any)?.menu_id || 0)
    const baseName = String((cartItem.item as any)?.name || (cartItem.item as any)?.title || "Item")
    const quantity = Number(cartItem.quantity || 1)
    const optionKey = String((cartItem as any).__pmdOptionKey || (cartItem.item as any)?.id)
    const selectedForUnit = selectedOptions[optionKey] || {}
    const optionGroups = Array.isArray((cartItem.item as any)?.options) ? (cartItem.item as any).options : []

    const optionDetails = Object.entries(selectedForUnit)
      .map(([groupName, selectedValueId]) => {
        const group = optionGroups.find((opt: any) =>
          String(opt?.name || "") === String(groupName) ||
          String(opt?.id || "") === String(groupName)
        )
        const value = (Array.isArray(group?.values) ? group.values : []).find((val: any) =>
          String(val?.id) === String(selectedValueId)
        )
        if (!group || !value) return null

        return {
          group: String(group?.name || groupName),
          option_id: String(group?.id || ""),
          option_value_id: String(value?.id || selectedValueId),
          value: String(value?.value || value?.name || selectedValueId),
          price: Number(adjustPriceForVAT(Number(value?.price || 0))),
        }
      })
      .filter(Boolean) as Array<{ group: string; option_id: string; option_value_id: string; value: string; price: number }>

    const optionLabel = optionDetails.map((option) => option.value).filter(Boolean).join(", ")
    const unitBasePrice = Number(adjustPriceForVAT(cartItem.item.price || 0))
    const unitOptionPrice = optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
    const unitPrice = Number((unitBasePrice + unitOptionPrice).toFixed(4))
    const lineSubtotal = Number((unitPrice * quantity).toFixed(4))

    return {
      menu_id: menuId,
      name: optionLabel ? `${baseName} — ${optionLabel}` : baseName,
      base_name: baseName,
      quantity,
      price: unitPrice,
      base_price: Number(unitBasePrice.toFixed(4)),
      option_total: Number((unitOptionPrice * quantity).toFixed(4)),
      subtotal: lineSubtotal,
      options: Object.fromEntries(optionDetails.map((option) => [option.group, option.option_value_id])),
      option_details: optionDetails,
      option_summary: optionLabel,
    }
  }).filter((item) => item.menu_id > 0 && item.quantity > 0)

  const handleConfirmMyItems = async () => {
    const draftItems = buildPersonalDraftItems()
    if (draftItems.length === 0) {
      toast({ title: "No items selected", description: "Add items to your personal cart before confirming.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const result = await confirmTableDraftItemsAction(draftItems)
      setTableDraft(result)
      setSubmittedSnapshot(null)
      clearCart()
      console.info("PMD_TABLE_DRAFT_CONFIRMED_ITEMS", { draft_id: result.draft_id ?? null, count: draftItems.length })
      toast({ title: "Items confirmed", description: "Your items were added to the table order. Submit the table order when everyone is ready." })
      await refreshTableDraft()
      onOpenOrderUpdate?.(result)
    } catch (error) {
      toast({ title: "Could not confirm items", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitTableDraft = async () => {
    if (!tableDraft?.draft_id && tableDraft?.status !== "draft") return
    try {
      const result = await submitTableDraftAction({ draftId: tableDraft?.draft_id ?? null, refreshOnError: true })
      const pmdSubmittedOrderId = Number((result as any)?.order_id || (result as any)?.orderId || 0)
      if (Number.isFinite(pmdSubmittedOrderId) && pmdSubmittedOrderId > 0) {
        pmdLatestSubmittedPaymentOrderIdRef.current = pmdSubmittedOrderId
        try {
          sessionStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
          localStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
        } catch {}
      }
      setTableDraft(result)
      clearCart()
      const submittedTableSnapshot = createSubmittedTableOrderSnapshot(result, tableInfo, taxSettings?.percentage || 0)
      try {
        const { sessionKey, legacyKey } = buildOpenOrderStorageKeys()
        localStorage.removeItem(legacyKey)
        localStorage.setItem(sessionKey, JSON.stringify({ ...submittedTableSnapshot, tenant: getTenantKey(), tableKey: getTableKey(), guestSessionId: ensureGuestSession() }))
      } catch {}
      console.info("PMD_SUBMITTED_ORDER_SNAPSHOT_NORMALIZED", {
        order_id: submittedTableSnapshot.orderId,
        total: submittedTableSnapshot.total,
        remainingAmount: submittedTableSnapshot.remainingAmount,
        itemCount: Array.isArray(submittedTableSnapshot.submittedItems) ? submittedTableSnapshot.submittedItems.length : 0,
      })
      setSubmittedSnapshot(submittedTableSnapshot)
            // PMD_NO_DOUBLE_CARD_CLEAR_SUBMIT_LOADING: action hook clears the old Sending state before showing Order Status.
      setCheckoutStep(getCheckoutStepAfterDraftSubmit())
      console.info("PMD_TABLE_DRAFT_SUBMITTED", { draft_id: tableDraft?.draft_id ?? null, order_id: result.order_id ?? null })
      toast({ title: "Table order submitted", description: "The table order was sent to the kitchen. Payment is now available." })
      onOpenOrderUpdate?.(submittedTableSnapshot)
    } catch (error) {
      toast({ title: "Could not submit table order", description: error instanceof Error ? error.message : "Please refresh and try again.", variant: "destructive" })
    }
  }

  const markOpenOrderAsPaid = (orderIdLike?: string | number | null, paymentDetails?: { tipAmount?: number; couponDiscount?: number; paidTotal?: number; couponCode?: string | null }) => {
    try {
      const sessionKey = buildOpenOrderStorageKeys().sessionKey
      const raw = localStorage.getItem(sessionKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (orderIdLike && parsed?.orderId && String(parsed.orderId) !== String(orderIdLike)) return
      parsed.paymentStatus = "paid"
      parsed.status = "paid"
      parsed.paidAt = Date.now()
      if (paymentDetails) {
        parsed.paidTipAmount = Number(paymentDetails.tipAmount || 0)
        parsed.paidCouponDiscount = Number(paymentDetails.couponDiscount || 0)
        parsed.paidTotal = Number(paymentDetails.paidTotal || 0)
        parsed.paidCouponCode = paymentDetails.couponCode || null
      }
      setSubmittedSnapshot((prev: any) => prev ? { ...prev, paymentStatus: 'paid', status: 'paid', paidAt: parsed.paidAt, paidTipAmount: parsed.paidTipAmount, paidCouponDiscount: parsed.paidCouponDiscount, paidTotal: parsed.paidTotal, paidCouponCode: parsed.paidCouponCode } : parsed)
      localStorage.setItem(sessionKey, JSON.stringify(parsed))
      onOpenOrderUpdate?.(parsed)
    } catch {}
  }


  // PMD_BLOCK_DRAFT_ID_AS_ORDER_ID_20260612
  // PMD_IGNORE_STALE_EXISTING_ORDER_ID_20260612
  const resolveSubmittedPaymentOrderId = (): number | null => {
    const draftIdRaw = Number((tableDraft as any)?.draft_id || 0)
    const draftId = Number.isFinite(draftIdRaw) && draftIdRaw > 0 ? draftIdRaw : null

    const tableDraftOrderIdRaw = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const tableDraftOrderId = Number.isFinite(tableDraftOrderIdRaw) && tableDraftOrderIdRaw > 0 ? tableDraftOrderIdRaw : null

    // PMD_FIX_PAYMENT_REQUIRES_REAL_ORDER_ID_20260612
    // A confirmed table draft is not payable until it is submitted and the backend returns a real order_id.
    if (draftId && !tableDraftOrderId) {
      return null
    }

    let storedLatestSubmittedOrderId: number | null = null
    try {
      const storedRaw =
        (typeof window !== "undefined" && (
          sessionStorage.getItem("pmd:latest-submitted-payment-order-id") ||
          localStorage.getItem("pmd:latest-submitted-payment-order-id")
        )) ||
        ""
      const storedValue = Number(storedRaw || 0)
      storedLatestSubmittedOrderId =
        Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null
    } catch {}

    const snapshotOrderIdRaw = Number((submittedSnapshot as any)?.orderId || (submittedSnapshot as any)?.order_id || 0)
    const snapshotOrderId = Number.isFinite(snapshotOrderIdRaw) && snapshotOrderIdRaw > 0 ? snapshotOrderIdRaw : null
    const latestRefOrderId = pmdLatestSubmittedPaymentOrderIdRef.current
    const currentSubmittedOrderId = tableDraftOrderId || snapshotOrderId || latestRefOrderId || null
    const validatedStoredLatestOrderId =
      storedLatestSubmittedOrderId && (!currentSubmittedOrderId || storedLatestSubmittedOrderId === currentSubmittedOrderId)
        ? storedLatestSubmittedOrderId
        : null

    const existingOrderIdRaw = Number(existingOrderId || 0)
    const trustedExistingOrderId =
      Number.isFinite(existingOrderIdRaw) &&
      existingOrderIdRaw > 0 &&
      currentSubmittedOrderId &&
      existingOrderIdRaw === currentSubmittedOrderId
        ? existingOrderIdRaw
        : null

    const candidates = [
      currentSubmittedOrderId,
      tableDraftOrderId,
      snapshotOrderId,
      latestRefOrderId,
      validatedStoredLatestOrderId,
      trustedExistingOrderId,
    ]

    for (const raw of candidates) {
      const value = Number(raw || 0)
      if (!Number.isFinite(value) || value <= 0) continue

      // A table draft id is not a payable order id. Only allow the same number
      // if the backend explicitly returned it as tableDraft.order_id too.
      if (draftId && value === draftId && tableDraftOrderId !== value) continue

      return value
    }

    return null
  }

  const hasUnsubmittedPaymentDraft = (): boolean => {
    return Boolean((tableDraft as any)?.draft_id && !resolveSubmittedPaymentOrderId())
  }

  // PMD_USE_SUBMITTED_ORDER_AMOUNT_FOR_PAYMENT_20260612
  const pmdPositiveMoney = (value: any): number | null => {
    const amount = Number(value || 0)
    if (!Number.isFinite(amount) || amount <= 0) return null
    return Number(amount.toFixed(2))
  }

  const pmdSubmittedItemsSubtotal = (): number | null => {
    const rows =
      Array.isArray((submittedSnapshot as any)?.submittedItems) && (submittedSnapshot as any).submittedItems.length > 0
        ? (submittedSnapshot as any).submittedItems
        : (Array.isArray((tableDraft as any)?.items) ? (tableDraft as any).items : [])

    const total = rows.reduce((sum: number, row: any) => {
      const qty = Number(row?.quantity || row?.qty || 1)
      const direct =
        pmdPositiveMoney(row?.total) ??
        pmdPositiveMoney(row?.line_total) ??
        pmdPositiveMoney(row?.subtotal) ??
        null

      if (direct !== null) return sum + direct

      const price =
        pmdPositiveMoney(row?.price) ??
        pmdPositiveMoney(row?.unit_price) ??
        pmdPositiveMoney(row?.menu_price) ??
        pmdPositiveMoney(row?.item?.price) ??
        0

      return sum + (price * (Number.isFinite(qty) && qty > 0 ? qty : 1))
    }, 0)

    return pmdPositiveMoney(total)
  }

  const resolveSubmittedPaymentAmount = (): number => {
    const snapshot: any = submittedSnapshot || {}
    const draft: any = tableDraft || {}
    const draftTotals: any = draft?.totals || {}
    const initial: any = initialSubmittedOrder || {}
    const initialTotals: any = initial?.totals || {}

    if (selectedSplitPersonId && selectedSplitPerson) {
      return (
        pmdPositiveMoney(selectedSplitPerson.total) ??
        pmdPositiveMoney(paymentPayableTotal) ??
        0
      )
    }

    const candidates = [
      snapshot.remainingAmount,
      snapshot.orderTotal,
      snapshot.total,
      draftTotals.remainingAmount,
      draftTotals.orderTotal,
      draftTotals.total,
      pmdSubmittedItemsSubtotal(),
      initial.remainingAmount,
      initial.orderTotal,
      initial.total,
      initialTotals.remainingAmount,
      initialTotals.orderTotal,
      initialTotals.total,
      pendingSummary?.remainingAmount,
      pendingSummary?.orderTotal,
      pendingSummary?.total,
      paymentPayableTotal,
      payableTotal,
      finalTotal,
    ]

    for (const value of candidates) {
      const amount = pmdPositiveMoney(value)
      if (amount !== null) return amount
    }

    return 0
  }


  const handlePayment = async (
    stripePaymentIntentId?: string,
    forcedPaymentContext?: { method_code?: string | null; provider_code?: string | null }
  ) => {
    const effectiveMethodCode = forcedPaymentContext?.method_code || selectedPaymentMethod
    const selectedMethodForSubmit = visiblePaymentMethods.find(method => method.code === effectiveMethodCode)
    const selectedProviderCodeForSubmit =
      effectiveMethodCode === "cod"
        ? null
        : (forcedPaymentContext?.provider_code || (selectedMethodForSubmit as any)?.provider_code || null)
    const isStripeMethodForSubmit =
      selectedProviderCodeForSubmit === "stripe" &&
      (effectiveMethodCode === "card" || effectiveMethodCode === "apple_pay" || effectiveMethodCode === "google_pay" || effectiveMethodCode === "wero")

    if (isStripeMethodForSubmit && !stripePaymentIntentId) {
      toast({
        title: "Payment Failed",
        description: "Stripe payment confirmation is missing. Please try again.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      const isCashier = tableInfo?.is_codier || false

      const routeTableId =
        typeof window !== "undefined"
          ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
          : null

      const queryTableId =
        typeof window !== "undefined"
          ? (
              new URLSearchParams(window.location.search).get("table") ||
              new URLSearchParams(window.location.search).get("table_id") ||
              new URLSearchParams(window.location.search).get("table_no") ||
              null
            )
          : null

      const rawResolvedTableId =
        tableInfo?.table_id ??
        routeTableId ??
        queryTableId ??
        null

      const numericResolvedTableId =
        rawResolvedTableId !== null &&
        rawResolvedTableId !== undefined &&
        String(rawResolvedTableId).trim() !== "" &&
        !Number.isNaN(Number(rawResolvedTableId))
          ? Number(rawResolvedTableId)
          : null

      const resolvedTableName =
        (tableInfo?.table_name && String(tableInfo.table_name).trim() !== "")
          ? String(tableInfo.table_name)
          : (numericResolvedTableId ? `Table ${numericResolvedTableId}` : "Delivery")

      const resolvedLocationId = Number(tableInfo?.location_id || 1)

      const normalizedItemsForOrder = itemsToPay.map((item, index) => {
        const menuIdCandidate = Number((item as any)?.item?.id ?? (item as any)?.item?.menu_id ?? 0)
        const quantityCandidate = Number((item as any)?.quantity || 1)
        const priceCandidate = Number((item as any)?.price ?? (item as any)?.item?.price ?? 0)
        const nameCandidate = String((item as any)?.item?.name ?? (item as any)?.item?.title ?? "").trim()

        return {
          menu_id: Number.isFinite(menuIdCandidate) ? menuIdCandidate : 0,
          name: nameCandidate !== "" ? nameCandidate : `Item ${index + 1}`,
          quantity: Number.isFinite(quantityCandidate) && quantityCandidate > 0 ? quantityCandidate : 1,
          price: Number.isFinite(priceCandidate) && priceCandidate >= 0 ? priceCandidate : 0,
          special_instructions: "",
          options: Object.fromEntries(
            Object.entries(selectedOptions[String((item as any)?.optionKey || (item as any)?.item?.id)] || {})
              .map(([key, value]) => [String(key), String(value ?? "")])
              .filter(([, value]) => value !== "")
          ),
        }
      })

      const orderData = {
        table_id: isCashier ? "cashier" : (numericResolvedTableId != null ? String(numericResolvedTableId) : null),
        table_name: String(isCashier ? "Cashier" : resolvedTableName),
        location_id: resolvedLocationId,
        is_codier: Boolean(isCashier),
        items: normalizedItemsForOrder,
        customer_name: String(
          isCashier
            ? "Cashier Customer"
            : `${resolvedTableName} Customer`
        ),
        customer_phone: String(paymentFormData.phone || ""),
        customer_email: String(paymentFormData.email || ""),
        payment_method: (
          effectiveMethodCode === "cod"
            ? "cash"
            : effectiveMethodCode === "paypal"
              ? "paypal"
              : "card"
        ) as 'cash' | 'paypal' | 'card',
        payment_method_raw: effectiveMethodCode || undefined,
        payment_provider: selectedProviderCodeForSubmit || undefined,
        payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : undefined,
        stripe_payment_intent_id: (isStripeMethodForSubmit && stripePaymentIntentId) ? String(stripePaymentIntentId) : undefined,
        total_amount: Number(checkoutStep === "payment" ? payableTotal : finalTotal),
        tip_amount: Number(checkoutStep === "payment" ? paymentTipAmount : tipAmount),
        coupon_code: (checkoutStep === "payment" && selectedSplitPersonId) ? null : (appliedCoupon?.code ? String(appliedCoupon.code) : null),
        coupon_discount: Number(checkoutStep === "payment" ? paymentCouponDiscount : couponDiscount),
        guest_session_id: ensureGuestSession(),
        special_instructions: "",
      }

      const existingLocalOrder = !hasUnsubmittedPaymentDraft() && initialSubmittedOrder?.paymentStatus !== "paid" ? initialSubmittedOrder : null
      if (existingLocalOrder?.orderId) {
        ;(orderData as any).existing_order_id = Number(existingLocalOrder.orderId)
        ;(orderData as any).append_to_order = true
      }
      const paymentOrderIdCandidate = resolveSubmittedPaymentOrderId()
      console.info("PMD_PAYMENT_ORDER_ID_RESOLVED", {
        paymentOrderIdCandidate,
        latestRef: pmdLatestSubmittedPaymentOrderIdRef.current,
        submittedSnapshotOrderId: (submittedSnapshot as any)?.orderId || (submittedSnapshot as any)?.order_id || null,
        tableDraftOrderId: (tableDraft as any)?.order_id || (tableDraft as any)?.orderId || null,
        existingOrderId,
      })
      if (checkoutStep === "payment" && !paymentOrderIdCandidate) {
        setIsLoading(false)
        toast({
          title: "Order not found",
          description: "Please send the table order to the kitchen first.",
          variant: "destructive",
        })
        return
      }
      const isQrPayLaterSubmittedOrder = String(tableDraft?.payment || submittedSnapshot?.payment || "").toLowerCase() === "qr_pay_later"
      const shouldUsePayExisting = !!(checkoutStep === "payment" && paymentOrderIdCandidate && (pendingSummary || isQrPayLaterSubmittedOrder))
      if (checkoutStep === "payment" && paymentOrderIdCandidate && !shouldUsePayExisting) {
        try {
          const started = await apiClient.startExistingOrderPayment({
            order_id: Number(paymentOrderIdCandidate),
            payment_method: String(effectiveMethodCode || "card"),
            provider: selectedProviderCodeForSubmit || undefined,
            guest_session_id: ensureGuestSession(),
            table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
            table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
            source: "menu_existing_submitted",
          })
          if (String(effectiveMethodCode || "") === "cod") {
            setIsLoading(false)
            toast({ title: "Cash collection requested", description: started?.message || "Staff will collect payment shortly." })
            return
          }
          if (isStripeMethodForSubmit) {
            if (!stripePaymentIntentId) {
              throw new Error("Stripe payment confirmation is missing")
            }
            await apiClient.finalizeExistingOrderPayment({
              order_id: Number(paymentOrderIdCandidate),
              payment_intent_id: String(stripePaymentIntentId),
              payment_method: String(effectiveMethodCode || "card"),
              provider: selectedProviderCodeForSubmit || "stripe",
            })
          }
          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`,
          })
          return
        } catch (e) {
          setIsLoading(false)
          toast({
            title: "Payment unavailable",
            description: "Payment could not be started. Please ask staff or try again.",
            variant: "destructive",
          })
          return
        }
      }
      if (shouldUsePayExisting && paymentOrderIdCandidate) {
        const paidMethod = orderData.payment_method
        const selectedItemsPayload = selectedSplitPersonId && splitMethod === "items"
          ? splitSourceItems.reduce<Array<{ order_menu_id: number; quantity: number }>>((acc, item) => {
              const guestIndex = Number(String(selectedSplitPersonId).replace("guest-", ""))
              if (itemAssignments[item.key] !== guestIndex) return acc
              const orderMenuId = Number(item.orderMenuId || 0)
              if (!orderMenuId) return acc
              const existing = acc.find((row) => row.order_menu_id === orderMenuId)
              if (existing) existing.quantity += 1
              else acc.push({ order_menu_id: orderMenuId, quantity: 1 })
              return acc
            }, [])
          : undefined

        const existingOrderAmount = checkoutStep === "payment"
          ? resolveSubmittedPaymentAmount()
          : (selectedSplitPerson?.total
            ? Number(selectedSplitPerson.total.toFixed(2))
            : (isSplitting
              ? null
              : (toPositiveAmount(pendingSummary?.remainingAmount) ?? toPositiveAmount(submittedSnapshot?.total) ?? null)))

        console.info("PMD_PAYMENT_AMOUNT_RESOLVED", {
          order_id: paymentOrderIdCandidate,
          amount: existingOrderAmount,
          payableTotal,
          paymentPayableTotal,
          submittedSnapshotTotal: (submittedSnapshot as any)?.total ?? null,
          submittedSnapshotRemaining: (submittedSnapshot as any)?.remainingAmount ?? null,
          tableDraftTotal: (tableDraft as any)?.totals?.total ?? null,
          submittedItemsSubtotal: pmdSubmittedItemsSubtotal(),
        })

        const payExistingPayload = {
          payment_method: String(paidMethod),
          payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : null,
          amount: existingOrderAmount,
          tip_amount: checkoutStep === "payment" ? Number(paymentTipAmount.toFixed(2)) : 0,
          coupon_discount: checkoutStep === "payment" ? Number(paymentCouponDiscount.toFixed(2)) : 0,
          coupon_code: checkoutStep === "payment" && appliedCoupon?.code ? String(appliedCoupon.code) : null,
          selected_items: selectedItemsPayload,
          table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
          table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
          qr: tableInfo?.qr_code ? String(tableInfo.qr_code) : null,
        }
        console.info("PMD_PAY_EXISTING_PAYLOAD", { order_id: paymentOrderIdCandidate, ...payExistingPayload })
        const paidResponse = await apiClient.payExistingQrOrder(paymentOrderIdCandidate, payExistingPayload)

        if (paidResponse?.success) {
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`
          })

          const orderId = String(paymentOrderIdCandidate)
          localStorage.setItem("lastOrderId", orderId)

          const returnUrl =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/menu"

          const params = new URLSearchParams()
          params.set("order_id", orderId)
          params.set("return_url", returnUrl)

          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          return
        }
      }

      const response = await apiClient.submitOrder(orderData)

      if (response.success) {
        setIsLoading(false)
        toast({
          title: t("paymentSuccessful"),
          description: `Order #${response.order_id} submitted successfully!`
        })

        const orderId = response.order_id ? String(response.order_id) : ""

        // Save order ID for status tracking
        if (orderId) {
          localStorage.setItem("lastOrderId", orderId)
        }

        const returnUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/menu"

        const params = new URLSearchParams()
        if (orderId) params.set("order_id", orderId)
        params.set("return_url", returnUrl)

        try {
          const guestSessionId = ensureGuestSession()
          const tenant = getTenantKey()
          const tableKey = getTableKey()
          const sessionKey = buildOpenOrderStorageKeys().sessionKey
          const orderIdVal = response.order_id ? String(response.order_id) : ''
          const responseTotals = Array.isArray((response as any)?.order_totals) ? (response as any).order_totals : []
          const getTotalByCode = (code: string) => {
            const found = responseTotals.find((row: any) => String(row?.code || '') === code)
            const amount = Number(found?.value ?? 0)
            return Number.isFinite(amount) ? amount : 0
          }
          const responseItems = Array.isArray((response as any)?.items) ? (response as any).items : []
          const combinedSubmittedItems = responseItems.length > 0
            ? responseItems.map((item: any) => ({
                id: Number(item?.menu_id || item?.id || 0),
                name: String(item?.name || 'Item'),
                quantity: Number(item?.quantity || 0),
                price: Number(item?.price || 0),
                subtotal: Number(item?.subtotal || (Number(item?.quantity || 0) * Number(item?.price || 0))),
              }))
            : normalizedItemsForOrder
          const settlement = (response as any)?.settlement || {}
          const serverOrderTotal = Number((response as any)?.order_total ?? (response as any)?.total ?? 0)
          const snapshot = {
            guestSessionId, tenant, tableKey,
            tableNumber: tableInfo?.table_no || tableInfo?.table_id || null,
            orderId: orderIdVal || null,
            status: 'submitted',
            paymentStatus: 'unpaid',
            subtotal: Number(getTotalByCode('subtotal') || subtotal || 0),
            vatAmount: Number(getTotalByCode('tax') || taxAmount || 0),
            vatPercentage: Number(taxSettings?.percentage || 0),
            total: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            orderTotal: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            settledAmount: Number(settlement?.settledAmount || 0),
            remainingAmount: Number(settlement?.remainingAmount ?? (serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0))),
            settlementStatus: String(settlement?.settlementStatus || 'unpaid'),
            etaMinutes: Number((response as any)?.eta_minutes ?? (response as any)?.estimated_prep_minutes ?? estimatedMinutes),
            showCustomerEta: Boolean((response as any)?.show_customer_eta ?? true),
            currency: String(merchantSettings?.currency || 'EUR'),
            submittedItems: combinedSubmittedItems,
            createdAt: Date.now()
          }
          localStorage.setItem(sessionKey, JSON.stringify(snapshot))
          setSubmittedSnapshot(snapshot)
          onOpenOrderUpdate?.(snapshot)
        } catch {}
        clearCart()
        if (checkoutStep === "payment") {
          markOpenOrderAsPaid(orderId || submittedSnapshot?.orderId || null, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
          resetPaymentAdjustmentsAfterSuccess()
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        } else {
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        }
        return
      } else {
        throw new Error('Order submission failed')
      }
    } catch (error) {
    setIsLoading(false)
      console.error('Order submission error:', error)
      const normalizedMessage =
        error instanceof Error && /given data was invalid|unprocessable|amount|selected items amount mismatch/i.test(error.message)
          ? "Payment could not be started. Please ask staff or try again."
          : null
      const validationDetails = (error as any)?.details as Record<string, string[]> | undefined
      const firstValidationMessage = validationDetails
        ? Object.values(validationDetails).flat().find(Boolean)
        : null
      toast({
        title: "Order Failed",
        description: normalizedMessage || firstValidationMessage || (error instanceof Error ? error.message : "Failed to submit order. Please try again."),
        variant: "destructive"
      })
    }
  }

  // Toggle selection for individual item instance
  const toggleItemSelection = (instance: SplitBillItem) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev }
      if (newSelection[instance.key]) {
        delete newSelection[instance.key]
      } else {
        newSelection[instance.key] = instance
      }
      return newSelection
    })
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setProviderInlineError(null)

    // Apple Pay / Google Pay must remain their own methods.
    // Do NOT reroute them to Stripe card fields.
    if (methodId === "card") {
      try {
        (globalThis as any).__stripePreferred = "card"
      } catch {}
    }
    setSelectedPaymentMethod(methodId)
  }
  const handleBackToMethods = () => {
    setProviderInlineError(null)
    setSelectedPaymentMethod(null)
    setCashCollectionConfirmed(false)
  }

  const handleFormChange = (field: keyof PaymentFormData, value: string) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4)
    }
    return v
  }

  useEffect(() => {
    const api = new ApiClient();
    api.getPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false));
  }, [])

  useEffect(() => {
    let cancelled = false
    setPaypalConfigLoading(true)

    fetch('/api/v1/payments/config-public')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setPaypalPublicConfig({
          enabled: !!data?.paypalEnabled,
          clientId: data?.paypalClientId || "",
          currency: data?.currency || "EUR",
        })
      })
      .catch(() => {
        if (!cancelled) {
          setPaypalPublicConfig({
            enabled: false,
            clientId: "",
            currency: "EUR",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setPaypalConfigLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    // Load VAT settings from backend on mount
    loadVATSettings()
  }, [loadVATSettings])

  const stripeUrlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null

  const stripePathTableId =
    typeof window !== "undefined"
      ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
      : null

  const stripeResolvedTableIdRaw =
    tableInfo?.table_id ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    stripeUrlParams?.get("table_no") ??
    stripePathTableId ??
    null

  const stripeResolvedDisplayTableRaw =
    (tableInfo as any)?.table_no ??
    stripeUrlParams?.get("table_no") ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    tableInfo?.table_id ??
    stripePathTableId ??
    null

  const stripeResolvedTableNumber =
    stripeResolvedDisplayTableRaw !== null &&
    stripeResolvedDisplayTableRaw !== undefined &&
    String(stripeResolvedDisplayTableRaw).trim() !== "" &&
    !Number.isNaN(Number(stripeResolvedDisplayTableRaw))
      ? Number(stripeResolvedDisplayTableRaw)
      : null

  const stripeResolvedTableName =
    tableInfo?.table_name && String(tableInfo.table_name).trim() !== ""
      ? String(tableInfo.table_name)
      : (stripeResolvedTableNumber ? `Table ${stripeResolvedTableNumber}` : "Delivery")

  const stripeResolvedLocationId = Number(tableInfo?.location_id || 1)

  const stripeResolvedRestaurantId = String(
    tableInfo?.location_id ??
    (tableInfo as any)?.merchant_id ??
    merchantSettings?.accountId ??
    "default"
  )

  const selectedMethod = findPaymentMethod(visiblePaymentMethods, selectedPaymentMethod)
  const selectedProviderCode = getPaymentMethodProviderCode(selectedMethod)

  const stripePaymentData = {
    amount: resolveSubmittedPaymentAmount(),
    currency: (stripeConfig?.currency || merchantSettings?.currency || "EUR"),
    items: itemsToPay.map((item: any) => ({
      id: String(item.item.id),
      name: item.item.name,
      price: item.price,
      quantity: item.quantity || 1,
      restaurantId: stripeResolvedRestaurantId,
    })),
    customerInfo: {
      name: paymentFormData.cardholderName || "",
      email: paymentFormData.email || "",
      phone: paymentFormData.phone || "",
    },
    restaurantId: stripeResolvedRestaurantId,
    tableNumber: stripeResolvedTableNumber || 0,
  }

  const startHostedRedirectCheckout = async () => {
    if (!selectedMethod || !["card", "wero", "paypal", "apple_pay", "google_pay"].includes(selectedMethod.code)) return
    if (!(resolveSubmittedPaymentAmount() > 0)) {
      setProviderInlineError("Order total is still updating. Please reopen My Order.")
      toast({
        title: "Order total unavailable",
        description: "Order total is still updating. Please reopen My Order.",
        variant: "destructive",
      })
      return
    }
    const existingSubmittedOrderIdForGuard =
      checkoutStep === "payment" && !pendingSummary
        ? resolveSubmittedPaymentOrderId()
        : null

    if (checkoutStep === "payment" && !pendingSummary && !existingSubmittedOrderIdForGuard && hasUnsubmittedPaymentDraft()) {
      setProviderInlineError("Please submit the table order first, then start payment.")
      toast({
        title: "Submit order first",
        description: "Please submit the table order first, then start payment.",
        variant: "destructive",
      })
      return
    }

    setProviderInlineError(null)
    setIsLoading(true)
    let shouldFallbackFromWero = false
    try {
      let existingOrderStart: any = null
      const existingSubmittedOrderId =
        checkoutStep === "payment" && !pendingSummary
          ? resolveSubmittedPaymentOrderId()
          : null
      if (existingSubmittedOrderId) {
        existingOrderStart = await apiClient.startExistingOrderPayment({
          order_id: Number(existingSubmittedOrderId),
          payment_method: String(selectedMethod.code),
          provider: String((selectedMethod as any)?.provider_code || ""),
          guest_session_id: ensureGuestSession(),
          table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
          table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
          source: "menu_existing_submitted",
        })
      }
      const selectedProviderCodeForCheckout = String((selectedMethod as any)?.provider_code || "").toLowerCase()
      const providerCode = selectedMethod.code === "wero"
        ? (selectedProviderCodeForCheckout === "worldline" ? "worldline" : (selectedProviderCodeForCheckout === "vr_payment" ? "vr_payment" : "stripe"))
        : (selectedProviderCodeForCheckout || "unknown")
      const providerReturnCode = providerCode === "worldline" ? "worldline" : (providerCode === "vr_payment" ? "vr_payment" : "wero")
      const merchantReference = `PMD-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${window.location.search ? `${window.location.search}&` : "?"}payment_return_provider=${encodeURIComponent(providerReturnCode)}`
          : "/menu"
      const cancelUrl =
        typeof window !== "undefined"
          ? window.location.href
          : "/menu"

      const vrEndpointByMethod: Record<string, string> = {
        card: "/api/v1/payments/vr-payment/card/create-session",
        paypal: "/api/v1/payments/vr-payment/paypal/create-session",
        wero: "/api/v1/payments/vr-payment/wero/create-session",
        apple_pay: "/api/v1/payments/vr-payment/apple-pay/create-session",
        google_pay: "/api/v1/payments/vr-payment/google-pay/create-session",
      }
      const checkoutEndpoint = providerCode === "vr_payment"
        ? (vrEndpointByMethod[selectedMethod.code] || "/api/v1/payments/vr-payment/card/create-session")
        : selectedMethod.code === "wero"
          ? (selectedProviderCodeForCheckout === "worldline"
            ? "/api/v1/payments/worldline/wero/create-session"
            : "/api/v1/payments/wero/create-session")
          : "/api/v1/payments/card/create-session"
      console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
        selected_method: selectedMethod.code,
        backend_selected_provider: providerCode,
        endpoint: checkoutEndpoint,
        flow_mode: "primary",
      })
      const res = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(existingOrderStart?.amount || resolveSubmittedPaymentAmount()),
          currency: String(existingOrderStart?.currency || merchantSettings?.currency || "EUR"),
          return_url: returnUrl,
          cancel_url: cancelUrl,
          customer_email: paymentFormData.email || "",
          merchant_reference: merchantReference,
          order_id: existingSubmittedOrderId ? Number(existingSubmittedOrderId) : undefined,
          items: itemsToPay.map((item: any) => ({
            id: String(item.item.id),
            name: item.item.name,
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
          })),
        }),
      })

      const rawBody = await res.text()
      let json: any = null
      try {
        json = rawBody ? JSON.parse(rawBody) : null
      } catch {
        json = null
      }

      if (!res.ok || !json?.success || !json?.redirect_url) {
        const providerLabel = providerCode === "worldline"
          ? "Worldline"
          : providerCode === "vr_payment"
            ? "VR Payment"
            : providerCode === "sumup"
              ? "SumUp"
              : providerCode === "square"
                ? "Square"
                : "Stripe"
        const resolvedErrorCode = String(json?.resolved_error_code || json?.error_code || "").toLowerCase()
        const fallbackAllowedByCode = [
          "worldline_invalid_credentials_or_entitlement",
          "worldline_session_unavailable",
        ].includes(resolvedErrorCode)
        const fallbackAllowed = Boolean(json?.allow_fallback) || fallbackAllowedByCode
        const normalizedErrorMessage = json?.error
          || (rawBody && rawBody.length < 1000 ? rawBody : "")
          || `${providerLabel} checkout failed with HTTP ${res.status}`

        if (
          selectedMethod.code === "wero" &&
          (json?.error_code === "wero_not_supported" || json?.error_code === "wero_unavailable")
        ) {
          shouldFallbackFromWero = true
          throw new Error("Wero is currently unavailable. Please choose another payment method.")
        }
        if (selectedMethod.code === "wero") {
          if (providerCode === "worldline" && fallbackAllowed) {
            const fallbackReturnUrl = returnUrl.includes("payment_return_provider=")
              ? returnUrl.replace(/payment_return_provider=[^&]*/i, "payment_return_provider=wero")
              : `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}payment_return_provider=wero`
            const fallbackRes = await fetch("/api/v1/payments/wero/create-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: resolveSubmittedPaymentAmount(),
                currency: (merchantSettings?.currency || "EUR"),
                return_url: fallbackReturnUrl,
                cancel_url: cancelUrl,
                customer_email: paymentFormData.email || "",
                fallback_method: "ideal",
                fallback_from_worldline: true,
                items: itemsToPay.map((item: any) => ({
                  id: String(item.item.id),
                  name: item.item.name,
                  quantity: Number(item.quantity || 1),
                  price: Number(item.price || 0),
                })),
              }),
            })
            const fallbackRawBody = await fallbackRes.text()
            let fallbackJson: any = null
            try {
              fallbackJson = fallbackRawBody ? JSON.parse(fallbackRawBody) : null
            } catch {
              fallbackJson = null
            }

            if (fallbackRes.ok && fallbackJson?.success && fallbackJson?.redirect_url) {
              console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
                selected_method: "wero",
                original_provider: "worldline",
                backend_selected_provider: String(fallbackJson?.provider || "stripe"),
                fallback_provider: String(fallbackJson?.fallback_provider || "stripe"),
                fallback_method: String(fallbackJson?.fallback_method || "ideal"),
                resolved_error_code: resolvedErrorCode,
                endpoint: "/api/v1/payments/wero/create-session",
                flow_mode: "fallback",
                redirect_url_type: typeof fallbackJson?.redirect_url,
                has_session_id: Boolean(fallbackJson?.session_id),
              })
              if (typeof window !== "undefined" && fallbackJson?.session_id) {
                localStorage.setItem("pmd_wero_pending_checkout", JSON.stringify({
                  session_id: String(fallbackJson.session_id),
                  method_code: "wero",
                  provider_code: "stripe",
                  created_at: Date.now(),
                }))
              }
              if (typeof window !== "undefined") {
                window.location.href = String(fallbackJson.redirect_url)
              }
              return
            }
          }

          throw new Error(
            `${providerLabel} Wero error${resolvedErrorCode ? ` (${resolvedErrorCode})` : ""}: ${normalizedErrorMessage}`
          )
        }
        throw new Error(normalizedErrorMessage || "Unable to start hosted checkout")
      }

      if (typeof window !== "undefined") {
        if (providerCode === "worldline" && json?.hosted_checkout_id) {
          localStorage.setItem("pmd_worldline_pending_checkout", JSON.stringify({
            hosted_checkout_id: String(json.hosted_checkout_id),
            method_code: selectedMethod.code,
            provider_code: providerCode,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "sumup" && json?.checkout_id) {
          localStorage.setItem("pmd_sumup_pending_checkout", JSON.stringify({
            checkout_id: String(json.checkout_id),
            created_at: Date.now(),
          }))
        }
        if (providerCode === "square" && json?.payment_link_id) {
          localStorage.setItem("pmd_square_pending_checkout", JSON.stringify({
            payment_link_id: String(json.payment_link_id),
            order_id: json?.order_id ? String(json.order_id) : null,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "stripe" && json?.session_id) {
          localStorage.setItem("pmd_wero_pending_checkout", JSON.stringify({
            session_id: String(json.session_id),
            method_code: selectedMethod.code,
            provider_code: providerCode,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "vr_payment" && json?.session_id) {
          localStorage.setItem("pmd_vr_payment_pending_checkout", JSON.stringify({
            session_id: String(json.session_id),
            merchant_reference: merchantReference,
            method_code: selectedMethod.code,
            provider_code: "vr_payment",
            created_at: Date.now(),
          }))
        }
      }

      if (typeof window !== "undefined") {
        console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
          selected_method: selectedMethod.code,
          backend_selected_provider: String(json?.provider || providerCode),
          endpoint: checkoutEndpoint,
          flow_mode: Boolean(json?.fallback) ? "fallback" : "primary",
          redirect_url_type: typeof json?.redirect_url,
          has_session_id: Boolean(json?.session_id),
          has_hosted_checkout_id: Boolean(json?.hosted_checkout_id),
        })
        window.location.href = json.redirect_url
      }
    } catch (error) {
      if (shouldFallbackFromWero) {
        setSelectedPaymentMethod(null)
      }
      setIsLoading(false)
      setProviderInlineError(error instanceof Error ? error.message : "Unable to start checkout")
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Unable to start checkout",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const provider = params.get("payment_return_provider")
      if (!["worldline", "sumup", "square", "wero", "vr_payment"].includes(provider || "")) return

      const pendingKey = provider === "worldline"
        ? "pmd_worldline_pending_checkout"
        : provider === "sumup"
          ? "pmd_sumup_pending_checkout"
          : provider === "square"
            ? "pmd_square_pending_checkout"
            : provider === "vr_payment"
              ? "pmd_vr_payment_pending_checkout"
              : "pmd_wero_pending_checkout"
      const pendingRaw = localStorage.getItem(pendingKey)
      if (!pendingRaw) return
      let pending: any = null
      try {
        pending = JSON.parse(pendingRaw)
      } catch {
        return
      }

      const verificationPayload = provider === "worldline"
        ? { hosted_checkout_id: String(pending?.hosted_checkout_id || "") }
        : provider === "sumup"
          ? { checkout_id: String(pending?.checkout_id || params.get("checkout_id") || "") }
          : provider === "square"
            ? { payment_link_id: String(pending?.payment_link_id || "") }
            : provider === "vr_payment"
              ? {
                  session_id: String(pending?.session_id || params.get("session_id") || ""),
                  transaction_id: String(params.get("transaction_id") || ""),
                  provider_reference: String(params.get("provider_reference") || ""),
                  merchant_reference: String(pending?.merchant_reference || ""),
                }
            : { session_id: String(pending?.session_id || params.get("session_id") || "") }
      const verificationUrl = provider === "worldline"
        ? "/api/v1/payments/worldline/checkout-status"
        : provider === "sumup"
          ? "/api/v1/payments/sumup/checkout-status"
          : provider === "square"
            ? "/api/v1/payments/square/checkout-status"
            : provider === "vr_payment"
              ? "/api/v1/payments/vr-payment/return-status"
            : "/api/v1/payments/wero/checkout-status"

      const hasReference = Object.values(verificationPayload).some((value) => String(value || "").trim() !== "")
      if (!hasReference) return

      try {
        const res = await fetch(verificationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verificationPayload),
        })
        const json = await res.json()
      pmdForceKazenFrontendThemePayload(json);
        if (res.ok && json?.success && json?.is_paid) {
          localStorage.removeItem(pendingKey)
          const fallbackReference = String(
            (verificationPayload as any)?.session_id
            || (verificationPayload as any)?.transaction_id
            || (verificationPayload as any)?.provider_reference
            || ""
          )
          const txId = String(
            json?.payment_intent_id
            || json?.payment_id
            || json?.transaction_code
            || json?.order_id
            || fallbackReference
          )
          const forcedMethodCode = pending?.method_code
            ? String(pending.method_code)
            : (provider === "wero" ? "wero" : "card")
          const forcedProviderCode = pending?.provider_code
            ? String(pending.provider_code)
            : String(json?.provider || (provider === "wero" ? "stripe" : provider))
          await handlePayment(txId, {
            method_code: forcedMethodCode,
            provider_code: forcedProviderCode,
          })
          params.delete("payment_return_provider")
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
          window.history.replaceState({}, "", next)
          return
        }

        if (res.ok && json?.success && json?.status === "pending") {
          setProviderInlineError("Your payment is still pending confirmation. Please refresh in a moment.")
          return
        }

        if (res.ok && json?.success && (json?.status === "cancelled" || json?.status === "expired")) {
          localStorage.removeItem(pendingKey)
          setProviderInlineError("Payment was cancelled. Please choose another method to continue.")
          return
        }

        toast({
          title: "Payment Not Confirmed",
          description: `${provider} payment is not confirmed yet. Please check your payment status and retry.`,
          variant: "destructive",
        })
      } catch {
        toast({
          title: "Payment Verification Failed",
          description: `Could not verify ${provider} payment status.`,
          variant: "destructive",
        })
      }
    }

    void run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const renderPaymentForm = () => {
    try {
      if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
        (window as any).__PMD_WALLET_POST({
          level: "info",
          message: "PMD_RENDER_PAYMENT_FORM_STATE",
          data: {
            selectedPaymentMethod,
            selectedMethod: selectedMethod ? {
              code: (selectedMethod as any).code,
              name: (selectedMethod as any).name,
            } : null,
            stripePromise: !!stripePromise,
            hasStripeConfig: !!stripeConfig,
            stripeCurrency: stripeConfig?.currency || null,
            stripeCountryCode: stripeConfig?.countryCode || null,
          }
        });
      }
    } catch {}

    if (!selectedMethod) return null

    if (checkoutStep === "payment" && hasUnsubmittedPaymentDraft()) {
      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Submit order first</div>
          <div className="mt-1">Please send the table order to the kitchen first. Payment starts only after the backend creates a real order ID.</div>
          <Button
            type="button"
            onClick={() => setCheckoutStep("review")}
            className="mt-3 w-full rounded-xl bg-amber-700 text-white hover:bg-amber-800"
          >
            Back to order review
          </Button>
        </div>
      )
    }

    switch (selectedMethod.code) {
      case "card":
        if (selectedProviderCode === "paypal") {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBackToMethods} className="p-2 h-9 w-9 pmd-v2-action-circle">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-paydine-elegant-gray" />
                  <span className="font-semibold text-paydine-elegant-gray">Card (via PayPal)</span>
                </div>
              </div>

              {paypalConfigLoading ? (
                <div className="rounded-xl p-4 border text-sm text-gray-600">
                  Loading PayPal...
                </div>
              ) : !effectivePayPalClientId ? (
                <div className="rounded-xl p-4 border text-sm text-gray-600">
                  PayPal card checkout is not configured for this restaurant.
                </div>
              ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: effectivePayPalClientId,
                    currency: effectivePayPalCurrency,
                    intent: "capture",
                    components: "buttons",
                    disableFunding: "sepa",
                  }}
                >
                  <PayPalForm
                    paypalFundingSource="card"
                    paymentData={{
                      amount: resolveSubmittedPaymentAmount(),
                      payment_method: "card",
                      currency: effectivePayPalCurrency.toLowerCase(),
                      items: itemsToPay.map((item: any) => ({
                        id: String(item.item.id),
                        name: item.item.name,
                        price: item.price,
                        quantity: item.quantity || 1,
                        restaurantId: stripeResolvedRestaurantId,
                      })),
                      customerInfo: {
                        name: (paymentFormData as any)?.cardholderName || "",
                        email: (paymentFormData as any)?.email || "",
                        phone: (paymentFormData as any)?.phone || "",
                      },
                      restaurantId: stripeResolvedRestaurantId,
                      tableNumber: stripeResolvedTableNumber,
                    } as any}
                    onPaymentComplete={(result: any) => {
                      if (result?.success && result?.transactionId) {
                        handlePayment(result.transactionId)
                      }
                    }}
                    onPaymentError={(message: string) => {
                      toast({
                        title: "Payment Failed",
                        description: message,
                        variant: "destructive",
                      })
                    }}
                  />
                </PayPalScriptProvider>
              )}
            </motion.div>
          )
        }

        if (selectedProviderCode && selectedProviderCode !== "stripe") {
          if (selectedProviderCode === "worldline") {
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="mb-2">
                  <span className="font-semibold text-paydine-elegant-gray">Worldline card payment</span>
                </div>
                <WorldlineInlineCardForm
                  paymentData={{
                    amount: resolveSubmittedPaymentAmount(),
                    payment_method: "card",
                    currency: (merchantSettings?.currency || "EUR"),
                    items: itemsToPay.map((item: any) => ({
                      id: String(item.item.id),
                      name: item.item.name,
                      price: item.price,
                      quantity: item.quantity || 1,
                      restaurantId: stripeResolvedRestaurantId,
                    })),
                    customerInfo: {
                      name: (paymentFormData as any)?.cardholderName || "",
                      email: (paymentFormData as any)?.email || "",
                      phone: (paymentFormData as any)?.phone || "",
                    },
                    restaurantId: stripeResolvedRestaurantId,
                    tableNumber: stripeResolvedTableNumber,
                  } as any}
                  currency={(merchantSettings?.currency || "EUR")}
                  countryCode={(stripeConfig?.countryCode || "DE")}
                  onPaymentComplete={(result: any) => {
                    if (result?.success && result?.transactionId) {
                      handlePayment(result.transactionId)
                    }
                  }}
                  onPaymentError={(message: string) => {
                    toast({
                      title: "Worldline Payment Failed",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                />
              </motion.div>
            )
          }
          if (selectedProviderCode === "sumup") {
            const sumupReturnUrl = typeof window !== "undefined"
              ? `${window.location.origin}/payment/sumup/complete`
              : "/payment/sumup/complete"
            const sumupCancelUrl = typeof window !== "undefined" ? window.location.href : "/menu"
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <SumUpHostedCheckout
                  amount={payableTotal}
                  currency={merchantSettings?.currency || "EUR"}
                  description="PayMyDine SumUp checkout"
                  successUrl={sumupReturnUrl}
                  cancelUrl={sumupCancelUrl}
                  className="w-full"
                />
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </motion.div>
            )
          }
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="mb-2">
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod?.name || "Card Payment"}</span>
              </div>
              <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                {selectedProviderCode === "vr_payment"
                  ? "You will be redirected to a secure VR Payment checkout page."
                  : `Your card details will be completed in a secure embedded ${selectedProviderCode.toUpperCase()} frame.`}
              </div>
              <Button
                type="button"
                onClick={startHostedRedirectCheckout}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                {isLoading ? "Opening secure form..." : `Pay with ${selectedProviderCode === "vr_payment" ? "VR Payment" : selectedProviderCode.toUpperCase()}`}
              </Button>
              {providerInlineError && (
                <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                  {providerInlineError}
                </div>
              )}
            </motion.div>
          )
        }

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StripeCardPaymentSection
              methodName={selectedMethod?.name}
              stripeConfigError={stripeConfigError}
              stripePromise={stripePromise}
              cardEnabled={stripeConfig?.methods?.card !== false}
              paymentData={stripePaymentData}
              onPaymentSuccess={handlePayment}
              onPaymentError={(message: string) => {
                toast({
                  title: "Payment Failed",
                  description: message,
                  variant: "destructive",
                })
              }}
            />
          </motion.div>
        )

      case "paypal":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            {selectedProviderCode === "vr_payment" ? (
              <>
                <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                  You will be redirected to a secure VR Payment PayPal checkout page.
                </div>
                <Button
                  type="button"
                  onClick={startHostedRedirectCheckout}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  {isLoading ? "Opening PayPal..." : "Pay with PayPal"}
                </Button>
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </>
            ) : paypalConfigLoading ? (
              <div className="rounded-xl p-4 border text-sm text-gray-600">
                Loading PayPal...
              </div>
            ) : !effectivePayPalClientId ? (
              <div className="rounded-xl p-4 border text-sm text-gray-600">
                PayPal is not configured for this restaurant.
              </div>
            ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: effectivePayPalClientId,
                    currency: effectivePayPalCurrency,
                    intent: "capture",
                    components: "buttons",
                    disableFunding: "card,sepa",
                  }}
                >
                  <PayPalForm
                    paypalFundingSource="paypal"
                    paymentData={{
                      amount: resolveSubmittedPaymentAmount(),
                      payment_method: "paypal",
                      currency: effectivePayPalCurrency.toLowerCase(),
                    items: itemsToPay.map((item: any) => ({
                      id: String(item.item.id),
                      name: item.item.name,
                      price: item.price,
                      quantity: item.quantity || 1,
                      restaurantId: stripeResolvedRestaurantId,
                    })),
                    customerInfo: {
                      name: (paymentFormData as any)?.cardholderName || "",
                      email: (paymentFormData as any)?.email || "",
                      phone: (paymentFormData as any)?.phone || "",
                    },
                    restaurantId: stripeResolvedRestaurantId,
                    tableNumber: stripeResolvedTableNumber,
                  } as any}
                  onPaymentComplete={(result: any) => {
                    if (result?.success && result?.transactionId) {
                      handlePayment(result.transactionId)
                    }
                  }}
                  onPaymentError={(message: string) => {
                    toast({
                      title: "Payment Failed",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                />
              </PayPalScriptProvider>
            )}
          </motion.div>
        )

      case "apple_pay":
      case "google_pay":
        if (!selectedPaymentMethod) return null
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            {selectedProviderCode === "vr_payment" ? (
              <>
                <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                  You will be redirected to a secure VR Payment checkout page.
                </div>
                <Button
                  type="button"
                  onClick={startHostedRedirectCheckout}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  {isLoading ? "Opening wallet..." : `Pay with ${selectedPaymentMethod === "apple_pay" ? "Apple Pay" : "Google Pay"}`}
                </Button>
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </>
            ) : stripeConfig?.methods?.[selectedPaymentMethod as "apple_pay" | "google_pay"] ? (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <WalletStripePay
                    method={selectedPaymentMethod as "apple_pay" | "google_pay"}
                    amount={payableTotal}
                    currency={(stripeConfig?.currency || merchantSettings?.currency || "EUR")}
                    countryCode={(stripeConfig?.countryCode || "DE")}
                    restaurantId={stripeResolvedRestaurantId || "1"}
                    cartId={(stripePaymentData as any)?.cartId || null}
                    userId={(stripePaymentData as any)?.userId || null}
                    items={(stripePaymentData as any)?.items || []}
                    customerInfo={(stripePaymentData as any)?.customerInfo || {}}
                    tableNumber={(stripePaymentData as any)?.tableNumber || null}
                    onSuccess={(piId: string) => {
                      handlePayment(piId)
                    }}
                    onError={(message: string) => {
                      toast({
                        title: "Payment Failed",
                        description: message,
                        variant: "destructive",
                      })
                    }}
                  />
                </Elements>
              ) : (
                <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
                  Stripe is still loading. Please wait a few seconds and try again.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
                {selectedPaymentMethod === "apple_pay"
                  ? "Apple Pay is not enabled for this restaurant."
                  : "Google Pay is not enabled for this restaurant."}
              </div>
            )}
          </motion.div>
        )

      case "wero":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >

            <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
              {selectedProviderCode === "worldline"
                ? "You will be redirected to a secure Wero checkout powered by Worldline."
                : selectedProviderCode === "vr_payment"
                  ? "You will be redirected to a secure Wero checkout powered by VR Payment."
                  : "You will be redirected to a secure Wero checkout powered by Stripe."}
            </div>
            <Button
              type="button"
              onClick={startHostedRedirectCheckout}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              {isLoading ? "Opening Wero..." : "Pay with Wero"}
            </Button>
            {providerInlineError && (
              <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                {providerInlineError}
              </div>
            )}
          </motion.div>
        )

case "cod":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm font-medium text-paydine-elegant-gray mb-2">Total due</div>
                <div className="text-lg font-bold text-paydine-elegant-gray">
                  {formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}
                </div>
              </div>
              <Button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  setCashCollectionConfirmed(true)
                  await handlePayment(undefined, { method_code: "cod", provider_code: null })
                }}
                className="w-full"
                style={modalPrimaryBtnStyle}
              >
                {isLoading ? "Submitting..." : "Confirm cash payment"}
              </Button>
              {cashCollectionConfirmed && (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-primary)", background: "var(--theme-surface)" }}>
                  Please have the exact amount ready when the waiter comes to collect payment.
                </div>
              )}
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  const tableDisplayName = tableDraft?.table_name || tableInfo?.table_name || (tableDraft?.table_no || tableInfo?.table_no ? `Table ${tableDraft?.table_no || tableInfo?.table_no}` : "Delivery")
  const isTableContext = Boolean(tableInfo?.table_id || tableInfo?.table_no || tableDraft?.table_id || tableDraft?.table_no)
  const orderContextLabel = isTableContext ? "Table" : "Order type"
  const orderContextValue = isTableContext ? tableDisplayName : "Delivery"
  const submittedContextLabel = submittedSnapshot?.tableNumber || isTableContext ? "Table" : "Order type"
  const submittedContextValue = submittedSnapshot?.tableNumber ? `Table ${submittedSnapshot.tableNumber}` : orderContextValue

  // PMD_FINAL_REVIEW_INVOICE_ACTIONS_20260605
  const activeReviewSharePlatforms = useMemo(() => {
    const platformMeta: Array<{ id: PmdSocialPlatformId; label: string; icon: typeof Star }> = [
      { id: "trustpilot", label: "Trustpilot", icon: Star },
      { id: "instagram", label: "Instagram", icon: Link2 },
      { id: "google", label: "Google Reviews", icon: QrCode },
      { id: "website", label: "Website", icon: Link2 },
      { id: "reviews", label: "Reviews page", icon: MessageSquare },
    ]

    return platformMeta.filter(({ id }) => {
      const platform = merchantSettings.reviewSocial?.platforms?.[id]
      return Boolean(platform?.enabled && platform?.url)
    })
  }, [merchantSettings.reviewSocial])

  const canSubmitReview = reviewRating > 0 || reviewComment.trim().length > 0

  const handleSubmitReview = async () => {
    if (!canSubmitReview || reviewSubmitStatus === "loading") return
    setReviewSubmitStatus("loading")
    setReviewSubmitMessage("")
    try {
      const orderId = submittedSnapshot?.orderId || submittedSnapshot?.order_id || initialSubmittedOrder?.orderId || existingOrderId || null
      await apiClient.submitReview({ order_id: orderId, rating: reviewRating, review: reviewComment.trim(), public_share_consent: null })
      setReviewSubmitStatus("success")
      setReviewSubmitMessage("Thank you — your review was sent to the restaurant.")
    } catch (error) {
      setReviewSubmitStatus("error")
      setReviewSubmitMessage(error instanceof Error ? error.message : "Could not submit your review. Please try again.")
    }
  }

  const handleDownloadBusinessInvoice = async () => {
    const orderId = submittedSnapshot?.orderId || submittedSnapshot?.order_id || initialSubmittedOrder?.orderId || existingOrderId || null
    if (!orderId || invoiceDownloadStatus === "loading") {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage("Order number is not available yet.")
      return
    }
    setInvoiceDownloadStatus("loading")
    setInvoiceDownloadMessage("")
    try {
      const blob = await apiClient.downloadBusinessInvoice(orderId)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `business-invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setInvoiceDownloadStatus("idle")
    } catch (error) {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage(error instanceof Error ? error.message : "Could not download the business invoice.")
    }
  }


  const checkoutTitle: Record<CheckoutStep, string> = {
    review: "My Order",
    submitted: "Order Status",
    split: "Split bill",
    "split-items": "Assign items",
    "split-shares": "Set shares",
    "split-review": "Review split",
    payment: "Payment",
    paid: "Order complete",
  }
    // PMD_FORCE_PERSONAL_CART_REVIEW_WHEN_CHECKOUT_HAS_ITEMS
  useEffect(() => {
    if (!isOpen) return

    // If the customer has just added new items and pressed Checkout,
    // the modal must show the personal review card first.
    // Existing table/order status must not steal this flow.
    if (shouldForcePersonalReview({ hasPersonalItems, initialCheckoutStep, currentStep: checkoutStep })) {
      setCheckoutStep("review")
    }
  }, [isOpen, hasPersonalItems, initialCheckoutStep, checkoutStep])

// PMD_FREEZE_MODAL_TEXT_BUTTONS_FIRST_PAINT
useLayoutEffect(() => {
  if (!isOpen || typeof document === "undefined") return

  let cleanupTimer: number | undefined
  let retryTimer: number | undefined

  const applyFreeze = () => {
    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return false

    root.setAttribute("data-pmd-step-freeze", "1")

    cleanupTimer = window.setTimeout(() => {
      root.setAttribute("data-pmd-step-freeze", "0")
      root.removeAttribute("data-pmd-step-freeze")
    }, 850)

    return true
  }

  if (!applyFreeze()) {
    retryTimer = window.setTimeout(applyFreeze, 16)
  }

  return () => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer)
    if (retryTimer) window.clearTimeout(retryTimer)
  }
}, [isOpen, checkoutStep])


  // PMD_SUBMITTED_TABLE_DRAFT_SHOULD_SHOW_STATUS
  const isSubmittedTableDraftForStatus = Boolean(
    tableDraft?.order_id ||
    tableDraft?.orderId ||
    ["submitted", "submitted_unpaid", "partially_paid", "paid"].includes(String(tableDraft?.status || "").toLowerCase())
  )
  const checkoutListViewKey = `${checkoutStep}:${hasPersonalItems ? "personal" : "shared"}:${isSubmittedTableDraftForStatus ? "status" : "draft"}`

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined" || typeof document === "undefined") return

    const resetCheckoutScrollPositions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (root) root.scrollTop = 0
      document.querySelectorAll<HTMLElement>('.pmd-checkout-list-scroll').forEach((list) => {
        list.scrollTop = 0
      })
    }

    resetCheckoutScrollPositions()
    const raf = window.requestAnimationFrame(resetCheckoutScrollPositions)
    return () => window.cancelAnimationFrame(raf)
  }, [isOpen, checkoutListViewKey])


  // PMD_DIRECT_ORDER_STATUS_AFTER_SEND_20260603
  useEffect(() => {
    if (!isOpen) return
    if (checkoutStep !== "review") return
    if (hasPersonalItems || preferPersonalReview) return
    if (!isSubmittedTableDraftForStatus) return

    if (tableDraft) {
      const normalizedTableDraftSnapshot = createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)
      setSubmittedSnapshot((prev: any) => {
        const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
        const nextOrderId = Number(normalizedTableDraftSnapshot.orderId || 0)
        return !prev || prevOrderId !== nextOrderId ? normalizedTableDraftSnapshot : { ...prev, ...normalizedTableDraftSnapshot }
      })
    }

    setCheckoutStep(getCheckoutStepAfterDraftSubmit())
  }, [
    isOpen,
    checkoutStep,
    hasPersonalItems,
    preferPersonalReview,
    isSubmittedTableDraftForStatus,
    tableDraft,
    tableInfo?.table_no,
    tableInfo?.table_id,
  ])

const modalTitle = checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !hasPersonalItems && !preferPersonalReview
    ? "Table Order"
    : checkoutTitle[checkoutStep]

  const startSplitFlow = (method: SplitMethod = splitMethod) => {
    const isStartingSplit = !isSplitting && !selectedSplitPersonId
    if (isStartingSplit) {
      setSplitGuestCount(suggestedSplitGuestCount)
      setSharePercents(buildEvenSharePercents(suggestedSplitGuestCount))
    }
    setIsSplitting(true)
    setSplitMethod(method)
    setSelectedPaymentMethod(null)
    setSelectedSplitPersonId(null)
    setCheckoutStep(getCheckoutStepForSplitMethod(method))
  }

  const chooseSplitMethod = (method: SplitMethod) => {
    setSplitMethod(method)
    startSplitFlow(method)
  }

  const goToSplitReview = () => {
    if (!canConfirmSplitMethod) return
    setIsSplitting(true)
    setSelectedSplitPersonId((current) => current || activeSplitPeople[0]?.id || null)
    setCheckoutStep("split-review")
  }

  const renderPaymentButton = () => {
    if (!selectedMethod) return null

    // IMPORTANT:
    // For Stripe-like methods, do NOT allow the fixed bottom button
    // to submit/place the order directly.
    // Payment must happen only through StripeCardForm:
    // create-intent -> confirmCardPayment -> onPaymentComplete -> handlePayment(transactionId)
    if (["card", "wero", "paypal"].includes(selectedMethod.code)) {
      return null
    }

    const isFormValid = () => {
      switch (selectedMethod.code) {
        case "card":
          return true
        case "paypal":
          return paymentFormData.email
        case "apple_pay":
        case "google_pay":
          return true
        case "cod":
          return true
        default:
          return false
      }
    }

    const getButtonText = () => {
      switch (selectedMethod.code) {
        case "card":
  return `Pay ${formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}`
        case "paypal":
          return "Pay with PayPal"
        case "apple_pay":
        case "google_pay":
          return `Pay with ${selectedMethod.name}`
        case "cod":
          return "Confirm Cash Payment"
        default:
          return "Pay"
      }
    }

    if (selectedPaymentMethod === "apple_pay" || selectedPaymentMethod === "google_pay" || selectedPaymentMethod === "wero") {
      return null
    }

    return (
      <ThemedButton
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !isFormValid()}
        variant="primary"
        fullWidth
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {getButtonText()}
          </div>
        )}
      </ThemedButton>
    )
  }

  const modernGreenTableDraftItems = groupOrderDisplayItems(Array.isArray(tableDraft?.items) ? tableDraft.items : [])
  const modernGreenTableDraftTotal = Number(
    tableDraft?.totals?.total ??
    tableDraft?.totals?.orderTotal ??
    tableDraft?.total ??
    tableOrderTotalByCode(tableDraft, "total") ??
    tableOrderTotalByCode(tableDraft, "subtotal") ??
    0
  )
  const modernGreenSubmittedItems = groupOrderDisplayItems(Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : [])
  const modernGreenPersonalItems = personalReviewItems.map((cartItem: any) => {
    const optionKey = String(cartItem.__pmdOptionKey || cartItem.item.id)
    const selectedForUnit = selectedOptions[optionKey] || {}
    const optionDetails: Array<{ name: string; price: number }> = []

    Object.entries(selectedForUnit).forEach(([optionName, optionId]) => {
      const option = (cartItem.item.options || []).find((candidate: any) => String(candidate.name) === String(optionName))
      const value = option?.values?.find((candidate: any) => String(candidate.id) === String(optionId))
      if (value) optionDetails.push({ name: String(value.value || value.name || ''), price: Number(adjustPriceForVAT(Number(value.price || 0))) })
    })

    const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
    const optionSummary = optionDetails.map((option) => option.name).filter(Boolean).join(', ')
    const displayName = optionSummary ? `${baseName} — ${optionSummary}` : String(cartItem.__pmdUnitLabel || baseName)
    const unitPrice = Number(adjustPriceForVAT(cartItem.item.price || 0)) + optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
    const quantity = Number(cartItem.quantity || 1)

    return {
      ...cartItem,
      quantity,
      __pmdDisplayName: displayName,
      __pmdDisplaySubtotal: unitPrice * quantity,
    }
  })

  const handleModernGreenApplyCoupon = async () => {
    if (!couponCode.trim()) return
    if (selectedSplitPerson) {
      setCouponError("Coupon validation for split payments is coming soon.")
      return
    }
    setCouponLoading(true)
    setCouponError(null)
    try {
      const result = await validateCoupon(couponCode.trim(), paymentBaseAmount)
      if (!result.success) setCouponError(result.message || "Coupon will be checked at payment.")
      else {
        setCouponCode("")
        toast({ title: "Coupon applied", description: "Your coupon was added to this payment." })
      }
    } catch {
      setCouponError("Coupon validation coming soon.")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleModernGreenRemoveCoupon = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
  }

  if (!isOpen) return null


  if (isKazenJapaneseCheckoutVisual) {
    return (
      <KazenJapaneseCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value: string) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  if (isModernGreenCheckoutVisual) {
    return (
      <ModernGreenCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  return (
    <div data-pmd-kazen-checkout-overlay={isKazenJapaneseCheckoutVisual ? "1" : undefined} className={cn("fixed inset-0 z-50 flex items-center justify-center", isModernGreenCheckoutVisual ? "bg-transparent backdrop-blur-md" : "bg-black/30")}>
      {/* PMD_KAZEN_SKIN_GOLD_CHECKOUT_RENDER_20260612 */}
      {/* PMD_KAZEN_INLINE_CHECKOUT_SKINS_DISABLED_20260612 */}
      {isOrganicCheckoutVisual && <OrganicCheckoutScopedStyles />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-pmd-checkout-theme-root="1"
        data-pmd-checkout-theme={checkoutVisualTheme}
        data-pmd-checkout-design-system="1"
        data-pmd-checkout-visual-theme={checkoutVisualTheme}
        data-pmd-checkout-kazen-skin={isKazenJapaneseCheckoutVisual ? "1" : undefined}
        className="pmd-checkout-modal w-full max-w-md surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={isOrganicCheckoutVisual ? organicCheckoutModalStyle : undefined}
      >
        {/* Header with close button */}
        <div className="p-4 pb-2 surface-sub flex justify-between items-center rounded-2xl" style={isOrganicCheckoutVisual ? organicCheckoutHeaderStyle : undefined}>
          <Button
              data-pmd-order-status-back="1"
            variant="ghost"
            size="sm"
            onClick={() => {
              const previousStep = getCheckoutStepAfterBack(checkoutStep, Boolean(selectedSplitPersonId))
              if (previousStep) setCheckoutStep(previousStep)
              else onClose()
            }}

              className={iconBackBtn}
              style={{
                background: "#062F2A",
                backgroundColor: "#062F2A",
                color: "#FFFFFF",
                WebkitTextFillColor: "#FFFFFF",
                borderColor: "#062F2A",
                outlineColor: "#062F2A",
                textDecoration: "none",
              }}
            >
            <ArrowLeft className="h-5 w-5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
          </Button>
          <h2 className="pmd-checkout-modal-title">{modalTitle}</h2>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Order Summary (prices incl. VAT) & Payment - Scrollable Content */}
        <div data-pmd-checkout-scroll="1" className="pmd-checkout-body p-4 pb-8 space-y-4 overflow-y-auto flex-1" style={isOrganicCheckoutVisual ? organicCheckoutBodyStyle : undefined}>
          {false && checkoutStep === "payment" && pendingSummary && (
            <div className="pmd-checkout-flat-section rounded-2xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="muted">Total</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.orderTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Already paid</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.settledAmount || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="muted">Remaining</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.remainingAmount || 0)}</span>
              </div>
            </div>
          )}
          {/* Split Bill Toggle */}
          {false && checkoutStep === "payment" && <div className="flex items-center justify-between p-3 surface-sub rounded-2xl">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" style={{ color: 'var(--theme-secondary)' }} />
              <span className="text-xs muted">{t("splitBill")}</span>
            </div>
            <Button
              variant={isSplitting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitting(!isSplitting)}
              className={clsx(
                "text-xs",
                isSplitting
                  ? "icon-btn--accent"
                  : "icon-btn"
              )}
            >
              {isSplitting ? "ON" : "OFF"}
            </Button>
          </div>}

          {/* Items List */}
          {false && (checkoutStep === "review" || checkoutStep === "payment") && (isSplitting && checkoutStep === "payment" ? (
            <div className="pmd-checkout-flat-section rounded-2xl p-3 overflow-hidden">
              <h3 className="mb-2 text-xs">{t("selectItemsToPay")}</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allItemInstances.map((instance) => (
                  <div
                    key={instance.key}
                    className="flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => toggleItemSelection(instance)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                          selectedItems[instance.key] ? "icon-btn--accent" : "icon-btn",
                        )}
                      >
                        {selectedItems[instance.key] && <Check className="w-3 h-3" />}
                      </div>
                      <span>
                        {instance.item.nameKey ? t(instance.item.nameKey as TranslationKey) : instance.item.name}
                      </span>
                    </div>
                    <span className="font-semibold">
            {formatCurrency(instance.price ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pmd-checkout-flat-section rounded-2xl p-3">
              <div className="mb-2"><h3 className="text-xs font-semibold">{vatLabels.summary}</h3>{vatLabels.includedNote && <p className="mt-0.5 text-[11px] font-medium opacity-70">{vatLabels.includedNote}</p>}</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allItems.map((cartItem) => (
                  <OrderItemWithOptions
                    key={cartItem.item.id}
                    cartItem={cartItem}
                    addToCart={addToCart}
                    t={t}
                    onOptionsChange={handleOptionsChange}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Tip Section */}
          {false && checkoutStep === "payment" && tipSettings.enabled && (
            <div className="pmd-checkout-flat-section rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative h-4 w-4 flex items-center justify-center">
                  <svg
                    className="absolute h-4 w-4"
                    style={{ color: 'var(--theme-secondary)' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <DollarSign className="h-2.5 w-2.5 absolute" style={{ color: 'var(--theme-background)' }} strokeWidth="3" />
                </div>
                <h3 className="text-xs">{t("addTip")}</h3>
              </div>
              <div className="flex gap-2">
                {tipSettings.percentages.map((p) => (
                  <Button
                    key={p}
                    variant={tipPercentage === p && !customTip ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTipPercentage(p)
                      setCustomTip("")
                    }}
                    className={clsx(
                      "text-xs",
                      tipPercentage === p && !customTip
                        ? "tip-pill--active"
                        : "tip-pill"
                    )}
                  >
                    {p}%
                  </Button>
                ))}
                <div className="relative flex-grow">
                  <Input
                    type="number"
                    placeholder={t("custom")}
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value)
                      setTipPercentage(0)
                    }}
                    className="pl-6 text-xs h-8"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 muted text-xs">€</span>
                </div>
              </div>
            </div>
          )}

          {/* Coupon Code Input */}
          {false && checkoutStep === "payment" && <div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-2">
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError(null)
                  }}
                  placeholder={t("couponCode") || "Coupon Code"}
                  className="flex-1 px-3 py-2 border rounded-lg text-xs"
                  style={{ borderColor: 'var(--theme-border)' }}
                  disabled={couponLoading}
                />
                <Button
                  onClick={async () => {
                    if (!couponCode.trim()) {
                      setCouponError("Please enter a coupon code")
                      return
                    }
                    setCouponLoading(true)
                    setCouponError(null)
                    const result = await validateCoupon(couponCode.trim(), subtotal)
                    if (!result.success) {
                      setCouponError(result.message || "Invalid coupon code")
                    } else {
                      setCouponCode("")
                      // Wait a bit for state to update, then show toast
                      setTimeout(() => {
                        const { appliedCoupon: currentCoupon } = useCmsStore.getState()
                        toast({
                          title: "Coupon Applied",
                          description: `${currentCoupon?.name || 'Coupon'} applied successfully!`,
                        })
                      }, 100)
                    }
                    setCouponLoading(false)
                  }}
                  disabled={couponLoading || !couponCode.trim()}
                  size="sm"
                  className="icon-btn--accent text-xs"
                >
                  {couponLoading ? "..." : t("apply") || "Apply"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    {appliedCoupon.name} ({appliedCoupon.code})
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-500">
                    -{formatCurrency(couponDiscount)}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    removeCoupon()
                    setCouponCode("")
                    setCouponError(null)
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-base font-bold"
                >
                  ✕
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>
            )}
          </div>}


          <AnimatePresence mode="wait" initial={false}>
          {checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !isSubmittedTableDraftForStatus && !hasPersonalItems && !preferPersonalReview && (
            <motion.div key="table-order-draft" layout initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="surface-sub rounded-2xl p-4 space-y-4" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)" }}>

              <div className="pmd-checkout-list-scroll space-y-3 max-h-64 overflow-y-auto pr-1">
                {(tableDraft.groups && tableDraft.groups.length > 0 ? tableDraft.groups : [{ guest_session_id: null, items: tableDraft.items || [], subtotal: tableDraft.totals?.subtotal || 0 }]).map((group: any, groupIndex: number) => (
                  <div key={`${group.guest_session_id || 'table'}-${groupIndex}`} className="rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)" }}>
                    {(tableDraft.groups || []).length > 1 && (
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span>{group.guest_session_id ? `Guest ${groupIndex + 1}` : "Table"}</span>
                      <span>{formatCurrency(Number(group.subtotal || 0))}</span>
                    </div>
                    )}
                    <div className="space-y-1">
                      {groupOrderDisplayItems(group.items || []).map((item: any, idx: number) => (
                        <motion.div layout key={`${item.id || item.order_menu_id || item.menu_id || item.name}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row pmd-table-order-item-row flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{Number(item.quantity || 1)}x {String(item.name || `Item ${idx + 1}`)}</span>
                          <span className="font-semibold">{formatCurrency(Number(item.subtotal ?? (Number(item.price || 0) * Number(item.quantity || 1))))}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              {isTableContext && <p className="pmd-checkout-helper-text text-xs muted">Shared table order</p>}
              {Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0) > 0 && (
                <div className="space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="muted">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.subtotal ?? tableOrderTotalByCode(tableDraft, 'subtotal') ?? 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="muted">VAT {tableOrderVatPercentage(tableDraft, taxSettings?.percentage || 0)}%</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0))}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                <span className="font-semibold">Order Total</span>
                <span className="text-base font-bold">{formatCurrency(Number(tableDraft.totals?.orderTotal || tableDraft.totals?.total || 0))}</span>
              </div>
              {tableDraft.status === "draft" ? (
                <div className="space-y-3" data-pmd-clean-table-actions="1">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      disabled={submitDraftLoading || draftLoading || Number(tableDraft.totals?.total || 0) <= 0}
                      onClick={handleSubmitTableDraft}
                      whileHover={{ y: submitDraftLoading ? 0 : -1 }}
                      whileTap={{ scale: submitDraftLoading ? 1 : 0.985 }}
                      aria-label="Send order to kitchen"
                      data-pmd-clean-send-kitchen="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        background: "#062F2A",
                        backgroundColor: "#062F2A",
                        backgroundImage: "none",
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        border: "1px solid #062F2A",
                        boxShadow: "0 10px 22px rgba(0, 0, 0, 0.24)",
                        textShadow: "none",
                      }}
                    >
                      <span
                        style={{
                          color: "#FFFFFF",
                          WebkitTextFillColor: "#FFFFFF",
                          textShadow: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {submitDraftLoading ? "Sending..." : "Send to kitchen"}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={onClose}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-clean-continue-ordering="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent"
                    >
                      Continue ordering
                    </motion.button>
                  </div>
                </div>
              ) : tableDraft.order_id ? (
                <button type="button" onClick={() => { setSubmittedSnapshot(createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)); setCheckoutStep(getCheckoutStepAfterDraftSubmit()) }} className={modalSecondaryBtn}>
                  View order status
                </button>
              ) : null}
            </motion.div>
          )}

{checkoutStep === "review" && hasPersonalItems && (<motion.div key="personal-cart-review" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0 }} className="space-y-4"><div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-3">{/* PMD_REMOVED_YOUR_ITEMS_TITLE_20260604 */}<div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">{personalReviewItems.map((cartItem: any, idx) => (<OrderItemWithOptions key={String((cartItem as any).__pmdOptionKey || `${cartItem.item.id}-${idx}`)} cartItem={cartItem} optionKey={String((cartItem as any).__pmdOptionKey || cartItem.item.id)} unitLabel={(cartItem as any).__pmdUnitLabel} addToCart={addToCart as any} t={t} onOptionsChange={handleOptionsChange} />))}</div></div>

          {/* Totals */}
          {checkoutStep === "review" && hasPersonalItems && <div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{vatLabels.subtotal}</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1 && (
            <div className="flex justify-between text-xs">
                <span>{t("tax")} {taxSettings.percentage}%</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
            </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>{t("tip")}</span>
          <span className="font-semibold">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                <span>{t("coupon") || "Coupon"} ({appliedCoupon.code})</span>
                <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center divider pt-2 mt-2">
              <span className="text-base">{vatLabels.total}</span>
          <span className="text-base font-bold">{formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}</span>
            </div>
          </div>}

          {checkoutStep === "review" && hasPersonalItems && (
            <div className="mt-3 space-y-3">
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  data-pmd-review-submit="true"
                  aria-label="Confirm items"
                  disabled={isLoading || allItems.length === 0}
                  onClick={handleConfirmMyItems}
                  className={modalPrimaryBtn} style={modalPrimaryBtnStyle}
                >
                  {isLoading ? "Confirming..." : "Confirm"}
                </button>

                <button
                  type="button"
                  data-pmd-review-continue="true"
                  onClick={onClose}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>
            </div>
          )}
          </motion.div>)}
          </AnimatePresence>

          {isSplitCheckoutStep(checkoutStep) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SplitBillPanel className="pmd-checkout-flat-section rounded-3xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs muted">Share {formatCurrency(splitGrandTotal)} your way.</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ["equal", "Split equally"],
                    ["items", "By order items"],
                    ["shares", "By shares"],
                  ] as Array<[SplitMethod, string]>).map(([method, label]) => (
                    <button
                      data-pmd-split-method-real={method}
                      data-pmd-active={splitMethod === method ? "1" : "0"}
                      data-pmd-split-method-polished="1"
                      key={method}
                      type="button"
                      onClick={() => chooseSplitMethod(method)}
                      className={cn(
                        "group rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150 focus:outline-none",
                        splitMethod === method ? "text-white" : ""
                      )}
                      style={{
                        boxShadow: "none",
                        outline: "none",
                      }}
                    >
                      <span
                        data-pmd-split-label="1"
                        className="inline-block transition-transform duration-150 ease-out"
                        style={{ willChange: "transform" }}
                      >
                        {label === "By order items" ? <>By order<br />items</> : label}
                      </span>
                    </button>
                  ))}
                </div>
              </SplitBillPanel>

              {checkoutStep !== "split-review" && (
                <div className="pmd-checkout-flat-section rounded-3xl p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold">People</span>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] muted">Split across {splitGuestCount} guests{suggestedSplitGuestCount > 2 ? ` · ${suggestedSplitGuestCount} detected` : ""}.</p>

                          <div
                            data-pmd-split-guest-stepper="1"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full"
                          >
                            <button
                              type="button"
                              data-pmd-split-guest-count-control="remove"
                              aria-label="Remove guest"
                              disabled={splitGuestCount <= 2}
                              onClick={removeSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Minus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>

                            <span
                              className="min-w-5 text-center text-sm font-semibold"
                              style={{ color: "var(--theme-text-primary)" }}
                              aria-label={`${splitGuestCount} guests`}
                            >
                              {splitGuestCount}
                            </span>

                            <button
                              type="button"
                              data-pmd-split-guest-count-control="add"
                              aria-label="Add guest"
                              disabled={splitGuestCount >= 10}
                              onClick={addSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Plus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {splitGuestProfiles.map((guest, idx) => (
                      <span key={`${guest.name}-${idx}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)", background: "color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)", color: "#062F2A" }}>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ background: "color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)" }}>{guest.avatar}</span>
                        {guest.name}
                      </span>
                    ))}
                  </div>

                  {splitMethod === "equal" && (
                    <div className="space-y-2">
                      {equalSplitPeople.map((person, idx) => (
                        <div key={person.id} className="flex items-center justify-between rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                            <span className="truncate text-sm font-medium">{person.name}{idx === 0 ? " (rounding)" : ""}</span>
                          </div>
                          <span className="shrink-0 font-semibold">{formatCurrency(person.total)}</span>
                        </div>
                      ))}
                      <p className="rounded-full px-3 py-2 text-[11px] muted" style={{ background: "color-mix(in srgb, #b88940 12%, var(--theme-surface) 88%)" }}>Odd cents go to the first payer so totals match exactly.</p>
                    </div>
                  )}

                  {splitMethod === "items" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="muted">Tap items to assign guests.</span>
                        <span className={cn("rounded-full px-2 py-1 font-semibold", unassignedSplitItems > 0 ? "text-red-700" : "") } style={{ background: unassignedSplitItems > 0 ? "#FEE2E2" : "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" }}>{unassignedSplitItems} unassigned</span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {splitSourceItems.map((item: SplitSourceItem) => {
                          const assignedIndex = itemAssignments[item.key]
                          const nextLabel = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : splitGuestNames[assignedIndex]
                          return (
                            <button key={item.key} type="button" className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }} onClick={() => setItemAssignments((prev) => ({ ...prev, [item.key]: assignedIndex === undefined || assignedIndex === null ? 0 : assignedIndex >= splitGuestCount - 1 ? null : assignedIndex + 1 }))}>
                              <span className="truncate text-sm font-medium">{item.name}</span>
                              <span className="shrink-0 text-right text-xs"><span className="font-semibold">{formatCurrency(item.amount)}</span><br /><span className={assignedIndex === undefined || assignedIndex === null ? "text-red-700" : "muted"}>{nextLabel}</span></span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="space-y-3">
                      {sharePercents.slice(0, splitGuestCount).map((percent, idx) => (
                        <div key={idx} className="rounded-2xl p-3 shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2 font-medium"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{getSplitGuestAvatar(idx)}</span><span className="truncate">{splitGuestNames[idx]}</span></span>

                            <div
                              data-pmd-share-edit-group="1"
                              className="flex shrink-0 items-center gap-1.5"
                            >
                              <label className="sr-only" htmlFor={`share-percent-${idx}`}>Share percentage for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <input
                                  id={`share-percent-${idx}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(Number(percent || 0))}
                                  onChange={(event) => {
                                    const nextPercent = Math.max(0, Math.min(100, Number(event.target.value || 0)))
                                    setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? nextPercent : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-percent-input"
                                  inputMode="decimal"
                                />
                                <span className="pmd-share-input-suffix">%</span>
                              </div>

                              <span className="pmd-share-dot">·</span>

                              <label className="sr-only" htmlFor={`share-amount-${idx}`}>Share amount for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <span className="pmd-share-input-prefix">€</span>
                                <input
                                  id={`share-amount-${idx}`}
                                  type="number"
                                  min={0}
                                  max={Math.max(0, Number(splitGrandTotal || 0))}
                                  step={0.01}
                                  value={(splitGrandTotal * (Number(percent || 0) / 100)).toFixed(2)}
                                  onChange={(event) => {
                                    const nextAmount = Math.max(0, Number(event.target.value || 0))
                                    const nextPercent = Number(splitGrandTotal || 0) > 0 ? Math.max(0, Math.min(100, (nextAmount / Number(splitGrandTotal || 0)) * 100)) : 0
                                    setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Math.round(nextPercent) : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-amount-input"
                                  inputMode="decimal"
                                />
                              </div>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Number(event.target.value) : value))} className="pmd-split-slider w-full" />
                        </div>
                      ))}
                      <div className="flex justify-center">
                        <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", sharePercentTotal === 100 ? "" : "text-red-700")} style={{ background: sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" : "#FEF2F2", border: `1px solid ${sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 18%, var(--theme-border) 82%)" : "#FCA5A5"}` }}>
                          {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
                        </span>
                      </div>
                    </div>
                  )}

                  <ThemedButton type="button" disabled={!canConfirmSplitMethod} onClick={goToSplitReview} variant="primary" fullWidth className={cn(!canConfirmSplitMethod && "cursor-not-allowed")}>
                    Review split
                  </ThemedButton>
                </div>
              )}

              {checkoutStep === "split-review" && (
                <div className="space-y-3">
                  {activeSplitPeople.map((person) => (
                    <div key={person.id} className="rounded-3xl p-3 space-y-2 shadow-sm" style={{ border: `1px solid ${selectedSplitPersonId === person.id ? "#b88940" : "color-mix(in srgb, var(--theme-border) 70%, transparent)"}`, background: "var(--theme-surface)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                          <h4 className="truncate font-semibold">{person.name}</h4>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: person.status === "Paid" ? "#DCFCE7" : "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: person.status === "Paid" ? "#166534" : "#5A3512" }}>{person.status}</span>
                      </div>
                      <div className="space-y-1 text-xs muted">
                        {person.items.map((item, idx) => <div key={`${person.id}-${idx}`} className="flex justify-between gap-2"><span className="truncate">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>)}
                        {person.tax > 0 && <div className="flex justify-between"><span>Proportional service/tax</span><span>{formatCurrency(person.tax)}</span></div>}
                      </div>
                      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}><span className="font-semibold">Total</span><span className="font-bold">{formatCurrency(person.total)}</span></div>
                      {selectedSplitPersonId === person.id ? (
                        <ThemedButton type="button" onClick={() => setCheckoutStep("payment")} variant="primary" fullWidth>Pay my share</ThemedButton>
                      ) : (
                        <ThemedButton type="button" onClick={() => setSelectedSplitPersonId(person.id)} variant="secondary" fullWidth>Select payer</ThemedButton>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })} className={modalSecondaryBtn}><Link2 className="h-4 w-4" /> Send payment link to others</button>
                    <button type="button" onClick={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })} className={modalSecondaryBtn}><QrCode className="h-4 w-4" /> Show QR/share link</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(checkoutStep === "submitted" || checkoutStep === "paid") && submittedSnapshot && (
            <motion.div
              data-pmd-order-status-card="1"
              className="relative mt-7 space-y-3"
            >
              <OrderStatusCard className="pt-7 space-y-3">
              {(submittedSnapshot?.showCustomerEta ?? true) && (
                <div
                  data-pmd-floating-eta-circle="1"
                  className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  aria-label={`Estimated time ${estimatedMinutes} minutes`}
                  style={{
                    width: "4.45rem",
                    height: "4.45rem",
                    background: "#062F2A",
                    backgroundColor: "#062F2A",
                    border: "2px solid #b88940",
                    boxShadow: "0 16px 34px rgba(6, 47, 42, 0.24)",
                    color: "#FFFFFF",
                    WebkitTextFillColor: "#FFFFFF",
                  }}
                >
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span
                      className="font-extrabold tracking-tight"
                      style={{
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        fontSize: "1.45rem",
                        lineHeight: 1,
                      }}
                    >
                      {Math.max(1, Math.round(Number(estimatedMinutes) || 0))}
                    </span>
                    <span
                      className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color: "rgba(255,255,255,0.92)",
                        WebkitTextFillColor: "rgba(255,255,255,0.92)",
                      }}
                    >
                      mins
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <CheckoutIconFrame
                  data-pmd-order-received-icon="1"
                  className="pmd-order-received-icon rounded-full"
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </CheckoutIconFrame>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="pmd-checkout-status-title text-base font-semibold">{checkoutStep === "paid" ? "Payment confirmed" : "We received your order"}</p>

                  </div>
                  {checkoutStep === "paid" && <p className="text-xs muted">Your order is confirmed and being prepared.</p>}
                </div>
              </div>

              <div className="pmd-checkout-total-card surface-sub rounded-2xl p-3 space-y-2 text-sm" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)", border: "1px solid var(--theme-border)" }}>
                {submittedSnapshot?.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Order Number:</span>
                    <span className="font-semibold text-[15px]">{submittedSnapshot.orderId}</span>
                  </div>
                )}
                {Number(submittedSnapshot?.vatAmount ?? 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">Subtotal:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.subtotal ?? 0))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">VAT {Number(submittedSnapshot?.vatPercentage ?? taxSettings?.percentage ?? 0)}%:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.vatAmount ?? 0))}</span>
                    </div>
                  </>
                )}
                {(paidTipAmount > 0 || paidCouponDiscount > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Items total:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(submittedBaseTotal || Number(submittedSnapshot?.total ?? 0))}</span>
                  </div>
                )}
                {paidTipAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Tip:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(paidTipAmount)}</span>
                  </div>
                )}
                {paidCouponDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Coupon {String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code || "") ? `(${String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code)})` : ""}:</span>
                    <span className="font-semibold text-[15px]" style={{ color: "#166534" }}>-{formatCurrency(paidCouponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? "Amount paid:" : "Order Total:"}</span>
                  <span className="font-semibold text-[15px]">{formatCurrency(checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? paidAmountTotal : orderStatusTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{submittedContextLabel}:</span>
                  <span className="font-semibold text-[15px]">{submittedContextValue}</span>
                </div>
                {vatLabels.includedNote && (
                  <div className="flex items-center justify-between pt-1 text-xs opacity-75">
                    <span className="muted font-medium">VAT:</span>
                    <span className="font-medium">{vatLabels.includedNote}</span>
                  </div>
                )}
              </div>

              <div className="pmd-checkout-flat-section rounded-2xl p-3">
                <h3 className="mb-2 text-sm font-semibold">{vatLabels.summary}</h3>
                <div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">
                  {groupOrderDisplayItems(submittedSnapshot?.submittedItems || []).map((item: any, idx: number) => (
                    <motion.div layout key={`${item?.menu_id || item?.order_menu_id || item?.name || idx}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{Number(item?.quantity || 1)}x {String(item?.name || `Item ${idx + 1}`)}</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(item?.subtotal ?? (Number(item?.price || 0) * Number(item?.quantity || 1))))}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {checkoutStep !== "paid" && <div className="space-y-3">
                {checkoutStep === "submitted" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => { setIsSplitting(false); setSelectedSplitPersonId(null); setCheckoutStep('payment') }}
                      className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition" style={modalPrimaryBtnStyle}
                    >
                      Pay in full <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF" }} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-split-bill-stable="1"
                      onClick={() => startSplitFlow("equal")}
                      className="pmd-split-bill-stable-button group flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                      style={{
                        border: "1.5px solid #D8B982",
                        borderColor: "#D8B982",
                        color: "#10201D",
                        WebkitTextFillColor: "#10201D",
                        background: "rgba(255, 255, 255, 0.74)",
                        backgroundColor: "rgba(255, 255, 255, 0.74)",
                        backgroundImage: "none",
                        boxShadow: "0 8px 18px rgba(17, 24, 39, 0.04)",
                        textShadow: "none",
                        opacity: 1,
                        transition: "none",
                      }}
                    >
                      <Users className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#b88940", stroke: "#b88940" }} /> Split bill
                    </motion.button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenOrderUpdate?.(submittedSnapshot || initialSubmittedOrder || null)
                    onClose()
                  }}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>}
              {checkoutStep === "paid" && (
                <div className="pmd-order-complete-content space-y-3">
                  <div className="rounded-2xl border p-3 space-y-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: "#b88940" }} />
                      <h3 className="text-sm font-semibold">Rate your visit</h3>
                    </div>
                    <p className="text-xs muted">Thank you — a quick note for the restaurant.</p>
                    <div className="flex gap-1" aria-label="Restaurant rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" aria-label={`${star} star${star > 1 ? "s" : ""}`} onClick={() => { setReviewRating(star); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} className="rounded-full p-1">
                          <Star className="h-6 w-6" style={{ color: "#b88940", fill: reviewRating >= star ? "#b88940" : "transparent" }} />
                        </button>
                      ))}
                    </div>
                    <Textarea value={reviewComment} onChange={(event) => { setReviewComment(event.target.value); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} placeholder="Optional comment for the restaurant" className="min-h-[78px] rounded-2xl" />
                    {/* PMD_FINAL_REVIEW_SUBMIT_BUTTON_20260605 */}
                    <button
                      type="button"
                      data-pmd-submit-review="1"
                      disabled={!canSubmitReview || reviewSubmitStatus === "loading" || reviewSubmitStatus === "success"}
                      onClick={handleSubmitReview}
                      className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold transition"
                      style={{ border: "1px solid #062F2A", background: canSubmitReview && reviewSubmitStatus !== "success" ? "#062F2A" : "rgba(6, 47, 42, 0.18)", color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", boxShadow: canSubmitReview ? "0 14px 28px rgba(0, 0, 0, 0.24)" : "none", opacity: !canSubmitReview || reviewSubmitStatus === "success" ? 0.72 : 1 }}
                    >
                      {reviewSubmitStatus === "loading" ? "Submitting..." : reviewSubmitStatus === "success" ? "Review submitted" : "Submit review"}
                    </button>
                    {reviewSubmitMessage && <p className="text-xs" style={{ color: reviewSubmitStatus === "error" ? "#B42318" : "#166534" }}>{reviewSubmitMessage}</p>}
                    {reviewSubmitStatus === "success" && merchantSettings.reviewSocial?.sharePromptEnabled && activeReviewSharePlatforms.length > 0 && (
                      <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(216, 185, 130, 0.42)", background: "rgba(255, 249, 239, 0.78)" }}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: "#10201D" }}>Would you like to share your review publicly?</p>
                        <div className="flex flex-wrap gap-2">
                          {activeReviewSharePlatforms.map(({ id, label, icon: Icon }) => (
                            <a key={id} href={merchantSettings.reviewSocial.platforms[id].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "rgba(6, 47, 42, 0.18)", color: "#062F2A", background: "rgba(255,255,255,0.72)" }}>
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button type="button" onClick={handleDownloadBusinessInvoice} disabled={invoiceDownloadStatus === "loading"} className="min-h-10 w-full max-w-[280px] rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", color: "#062F2A", background: "transparent", opacity: invoiceDownloadStatus === "loading" ? 0.72 : 1 }}>{invoiceDownloadStatus === "loading" ? "Preparing invoice..." : "Download business invoice"}</button>
                  </div>
                  {invoiceDownloadMessage && <p className="text-center text-xs" style={{ color: "#B42318" }}>{invoiceDownloadMessage}</p>}
                  <div className="flex justify-center pt-1">
                    <img src="/assets/media/uploads/Paymydinelogo.png" alt="PayMyDine" className="max-h-7 max-w-[120px] opacity-70" />
                  </div>
                  <button type="button" onClick={onClose} className={modalSecondaryBtn}>Back to menu</button>
                </div>
              )}
              </OrderStatusCard>
            </motion.div>
          )}

          {checkoutStep === "payment" && (
            <>
              <motion.div key="payment-card-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="space-y-3">
                <PaymentCardFrame className="pmd-checkout-payment-card surface-sub">
                <div
                  data-pmd-payment-header-copy-row="1"
                  className="flex items-center gap-3 rounded-2xl p-4"
                  style={{
                    background: "var(--theme-surface)",
                    color: "var(--theme-text-primary)",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  <CheckoutIconFrame
                    data-pmd-payment-header-icon="1"
                    className="rounded-full"
                  >
                    <CreditCard className="h-5 w-5" />
                  </CheckoutIconFrame>
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: "var(--theme-text-muted)",
                      WebkitTextFillColor: "var(--theme-text-muted)",
                    }}
                  >
                    Ready to pay?
                  </p>
                </div>
                {selectedSplitPerson && (
                  <CheckoutStepCard variant="subtle" className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-2"><span className="pmd-checkout-avatar-frame inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">{selectedSplitPerson.avatar}</span><span className="text-xs font-semibold">{selectedSplitPerson.name}'s share</span></div>
                    <span className="text-sm font-bold">{formatCurrency(selectedSplitPerson.total)}</span>
                  </CheckoutStepCard>
                )}
                </PaymentCardFrame>
              </motion.div>
              {pendingSummary && (
                <div className="pmd-checkout-flat-section rounded-2xl p-3 text-xs">
                  <div className="flex justify-between"><span className="muted">Total</span><span className="font-semibold">{formatCurrency(pendingSummary.orderTotal || 0)}</span></div>
                  <div className="flex justify-between"><span className="muted">Already paid</span><span className="font-semibold">{formatCurrency(pendingSummary.settledAmount || 0)}</span></div>
                  <div className="flex justify-between mt-1"><span className="muted">Remaining</span><span className="font-semibold">{formatCurrency(pendingSummary.remainingAmount || 0)}</span></div>
                </div>
              )}
              <motion.div className="space-y-3">
                <CheckoutSummaryCard className="pmd-checkout-total-card space-y-3">
                <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                  <span className="muted">{orderContextLabel}</span>
                  <span className="font-semibold">{orderContextValue}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {paymentVatAmount > 0 && !selectedSplitPerson && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="muted">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(paymentSubtotalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="muted">VAT {paymentVatPercentage}%</span>
                        <span className="font-semibold">{formatCurrency(paymentVatAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="muted">{selectedSplitPerson ? "Share amount" : "Items total"}</span>
                    <span className="font-semibold">{formatCurrency(paymentBaseAmount)}</span>
                  </div>
                  {paymentTipAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Tip</span>
                      <span className="font-semibold">{formatCurrency(paymentTipAmount)}</span>
                    </div>
                  )}
                  {paymentCouponDiscount > 0 && appliedCoupon && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Coupon {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <span className="font-semibold" style={{ color: "#166534" }}>-{formatCurrency(paymentCouponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}>
                    <span className="font-semibold">Payable total</span>
                    <span className="text-base font-bold" style={{ color: "#b88940" }}>{formatCurrency(paymentPayableTotal)}</span>
                  </div>
                </div>
                {tipSettings.enabled && (
                  <TipCouponPanel data-pmd-payment-real-panel="tip-coupon">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</span>
                      {paymentTipAmount > 0 && <span className="text-xs font-semibold" style={{ color: "#b88940" }}>{formatCurrency(paymentTipAmount)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(tipSettings.percentages || []).map((p) => (
                        <SplitMethodButton key={p} selected={paymentTipPercentage === p && !paymentCustomTip} onClick={() => updatePaymentTipPercentage(p)}>{p}%</SplitMethodButton>
                      ))}
                      <div className="relative min-w-[96px] flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs muted">€</span>
                        <ThemedInput
                    data-pmd-custom-tip-shows-selected-amount="1"
                    step="0.01"
                    value={customTip || (Number(tipAmount) > 0 ? Number(tipAmount).toFixed(2) : "")} type="number" min="0" onChange={(event) => updatePaymentCustomTip(event.target.value)} placeholder="Custom" className="h-9 w-full pl-7 pr-3 text-xs font-semibold" />
                      </div>
                    </div>
                  </TipCouponPanel>
                )}
                <TipCouponPanel>
                  {!appliedCoupon || selectedSplitPerson ? (
                    <div className="flex gap-2">
                      <ThemedInput type="text" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponError(null) }} placeholder="Coupon code" className="h-9 min-w-0 flex-1 px-3 text-xs font-semibold" disabled={couponLoading} />
                      <ThemedButton type="button" disabled={couponLoading || !couponCode.trim()} onClick={async () => {
                        if (!couponCode.trim()) return
                        if (selectedSplitPerson) {
                          setCouponError("Coupon validation for split payments is coming soon.")
                          return
                        }
                        setCouponLoading(true)
                        setCouponError(null)
                        try {
                          const result = await validateCoupon(couponCode.trim(), paymentBaseAmount)
                          if (!result.success) setCouponError(result.message || "Coupon will be checked at payment.")
                          else {
                            setCouponCode("")
                            toast({ title: "Coupon applied", description: "Your coupon was added to this payment." })
                          }
                        } catch {
                          setCouponError("Coupon validation coming soon.")
                        } finally {
                          setCouponLoading(false)
                        }
                      }} className="h-9 px-4 text-xs font-semibold disabled:opacity-50" variant="secondary">{couponLoading ? "Checking..." : "Apply"}</ThemedButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #062F2A 10%, var(--theme-surface) 90%)" }}>
                      <span className="font-semibold">{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <button type="button" onClick={() => { removeCoupon(); setCouponCode(""); setCouponError(null) }} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition" style={{ borderColor: "color-mix(in srgb, #b88940 45%, var(--theme-border) 55%)", color: "#062F2A", background: "var(--theme-surface)" }}>Remove</button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-700">{couponError}</p>}
                </TipCouponPanel>
                </CheckoutSummaryCard>
              </motion.div>
          {/* Payment Methods */}
          <AnimatePresence initial={false} mode="wait">
            {checkoutStep === "payment" ? (
              <motion.div
                key="payment-methods"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 pt-2"
              >
                <PaymentCardFrame className="pmd-checkout-payment-methods-card">
                <h3 className="text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {loadingPayments ? (
                    <div className="text-sm muted">Loading payment methods...</div>
                  ) : visiblePaymentMethods.length === 0 ? (
                    <div className="text-sm muted">No payment methods available</div>
                  ) : (
                    visiblePaymentMethods.map((method) => (
                      <motion.div key={method.code}>
                        <PaymentMethodTile
                          label={method.name}
                          selected={selectedPaymentMethod === method.code}
                          onClick={() => {
                            try {
                              if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
                                (window as any).__PMD_WALLET_POST({
                                  level: "info",
                                  message: "PMD_PAYMENT_METHOD_CLICK",
                                  data: {
                                    clickedCode: method.code,
                                    clickedName: method.name,
                                    selectedPaymentMethodBefore: selectedPaymentMethod ?? null,
                                    selectedMethodBefore: selectedMethod ? {
                                      code: (selectedMethod as any).code,
                                      name: (selectedMethod as any).name,
                                    } : null,
                                    stripePromise: !!stripePromise,
                                    stripeConfig: stripeConfig ? {
                                      currency: stripeConfig?.currency || null,
                                      countryCode: stripeConfig?.countryCode || null,
                                      applePayEnabled: (stripeConfig as any)?.applePayEnabled ?? null,
                                      googlePayEnabled: (stripeConfig as any)?.googlePayEnabled ?? null,
                                    } : null,
                                    ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
                                  }
                                });
                              }
                            } catch {}
                            handlePaymentMethodSelect(method.code)
                          }}
                        >
                          {method.code === "card" ? (
                            <img
                              src={isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg"}
                              alt={method.name}
                              width={40}
                              height={22}
                              className="object-contain"
                            />
                          ) : (
                            <img
                              src={
                                method.code === "paypal"
                                  ? "/images/payments/paypal.png"
                                  : method.code === "google_pay"
                                    ? "/images/payments/google_pay.png"
                                    : iconForPayment(method.code)
                              }
                              alt={method.name}
                              width={method.code === "wero" ? 50 : method.code === "cod" ? 30 : method.code === "paypal" ? 30 : method.code === "apple_pay" || method.code === "google_pay" ? 50 : 42}
                              height={method.code === "wero" ? 29 : method.code === "apple_pay" || method.code === "google_pay" ? 28 : 24}
                              className="object-contain"
                            />
                          )}
                        </PaymentMethodTile>
                      </motion.div>
                    ))
                  )}
                </div>
                {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
                  <div data-pmd-payment-selected-detail="1" className="pmd-checkout-payment-detail pt-2">
                    {renderPaymentForm()}
                  </div>
                )}
                </PaymentCardFrame>
              </motion.div>
            ) : null}
          </AnimatePresence>
            </>
          )}
</div>
      </motion.div>
    </div>
  )
}

