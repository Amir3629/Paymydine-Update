"use client"

import React from "react"
import { CheckCircle, CreditCard, Link2, Minus, Plus, QrCode } from "lucide-react"

import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import type { PaymentMethod } from "@/lib/api-client"
import type { CheckoutStep, SplitMethod, SplitPerson, SplitSourceItem } from "@/features/checkout/types"

type DisplayItem = {
  item?: { name?: string; nameKey?: string; price?: number }
  name?: string
  quantity?: number
  price?: number
  amount?: number
  total?: number
  subtotal?: number
  __pmdDisplayName?: string
  __pmdDisplaySubtotal?: number
}

type ModernGreenCheckoutShellProps = {
  checkoutStep: CheckoutStep
  onClose: () => void
  hasPersonalItems: boolean
  personalItems: DisplayItem[]
  tableDraft: any | null
  tableDraftItems: any[]
  tableDraftTotal: number
  submittedSnapshot: any | null
  submittedItems: any[]
  estimatedMinutes: number
  subtotal: number
  finalTotal: number
  payableTotal: number
  paymentBaseAmount: number
  paymentPayableTotal: number
  paymentTipAmount: number
  paymentCouponDiscount: number
  paymentTipPercentage: number
  paymentCustomTip: string
  tipPercentages: number[]
  tipEnabled: boolean
  couponCode: string
  setCouponCode: (value: string) => void
  appliedCoupon: any | null
  couponError: string | null
  couponLoading: boolean
  onApplyCoupon: () => void
  onRemoveCoupon: () => void
  visiblePaymentMethods: PaymentMethod[]
  loadingPayments: boolean
  selectedPaymentMethod: string | null
  onPaymentMethodSelect: (methodCode: string) => void
  renderPaymentForm: () => React.ReactNode
  renderPaymentButton: () => React.ReactNode
  handleConfirmMyItems: () => void | Promise<void>
  handleSubmitTableDraft: () => void | Promise<void>
  handlePayment: () => void | Promise<void>
  setCheckoutStep: (step: CheckoutStep) => void
  startSplitFlow: (method?: SplitMethod) => void
  chooseSplitMethod: (method: SplitMethod) => void
  goToSplitReview: () => void
  splitGuestCount: number
  addSplitGuest: () => void
  removeSplitGuest: () => void
  splitMethod: SplitMethod
  splitGuestProfiles: Array<{ name: string; avatar?: string }>
  equalSplitPeople: SplitPerson[]
  activeSplitPeople: SplitPerson[]
  selectedSplitPersonId: string | null
  setSelectedSplitPersonId: (personId: string | null) => void
  selectedSplitPerson: SplitPerson | null
  splitSourceItems: SplitSourceItem[]
  itemAssignments: Record<string, number | null>
  setItemAssignments: React.Dispatch<React.SetStateAction<Record<string, number | null>>>
  sharePercents: number[]
  setSharePercents: React.Dispatch<React.SetStateAction<number[]>>
  sharePercentTotal: number
  canConfirmSplitMethod: boolean
  splitGrandTotal: number
  updatePaymentTipPercentage: (percentage: number) => void
  updatePaymentCustomTip: (value: string) => void
  onPaymentLinks: () => void
  onQrShare: () => void
  isDarkTheme: boolean
}

const getItemName = (item: any, fallback = "Item") =>
  String(item?.__pmdDisplayName || item?.name || item?.item?.name || item?.menu_name || item?.item_name || fallback)

const getQuantity = (item: any) => Math.max(1, Number(item?.quantity || item?.qty || 1))

const getAmount = (item: any) => {
  const quantity = getQuantity(item)
  const explicitTotal = Number(item?.__pmdDisplaySubtotal ?? item?.subtotal ?? item?.total ?? item?.amount)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal
  const unit = Number(item?.price ?? item?.unit_price ?? item?.item?.price ?? 0)
  return Number.isFinite(unit) ? unit * quantity : 0
}

const methodIconSize = (code: string) => ({
  width: code === "wero" || code === "apple_pay" || code === "google_pay" ? 50 : code === "cod" || code === "paypal" ? 30 : 42,
  height: code === "wero" ? 29 : code === "apple_pay" || code === "google_pay" ? 28 : 24,
})

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`min-h-12 w-full rounded-full bg-[#31c98b] px-5 py-3 text-sm font-extrabold text-[#02110c] shadow-[0_18px_34px_rgba(49,201,139,.22)] transition disabled:opacity-50 ${props.className || ""}`} />
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`min-h-12 w-full rounded-full border border-[#31c98b]/40 bg-transparent px-5 py-3 text-sm font-bold text-[#e7fff3] transition hover:bg-[#31c98b]/10 disabled:opacity-50 ${props.className || ""}`} />
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-[#31c98b]/18 bg-[#082118]/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,.36)] backdrop-blur-xl ${className}`}>{children}</section>
}

function SplitMethodTabs({ splitMethod, chooseSplitMethod }: Pick<ModernGreenCheckoutShellProps, "splitMethod" | "chooseSplitMethod">) {
  const methods: Array<[SplitMethod, string]> = [["equal", "Split equally"], ["items", "By order items"], ["shares", "By shares"]]
  return (
    <div className="grid grid-cols-3 gap-2">
      {methods.map(([method, label]) => (
        <button key={method} type="button" onClick={() => chooseSplitMethod(method)} className={`rounded-full border px-2 py-2 text-[11px] font-extrabold transition ${splitMethod === method ? "border-[#31c98b] bg-[#31c98b] text-[#02110c]" : "border-[#31c98b]/25 bg-transparent text-[#dfffee]"}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function PeopleStepper({ splitGuestCount, addSplitGuest, removeSplitGuest }: Pick<ModernGreenCheckoutShellProps, "splitGuestCount" | "addSplitGuest" | "removeSplitGuest">) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-[#31c98b]/16 bg-[#04130f]/70 px-3 py-2">
      <span className="text-sm font-bold text-[#f4fff8]">People</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35"><Minus className="h-4 w-4" /></button>
        <span className="min-w-6 text-center text-base font-black text-[#f4fff8]">{splitGuestCount}</span>
        <button type="button" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export function ModernGreenCheckoutShell(props: ModernGreenCheckoutShellProps) {
  const {
    checkoutStep, onClose, hasPersonalItems, personalItems, tableDraft, tableDraftItems, tableDraftTotal, submittedSnapshot, submittedItems,
    estimatedMinutes, subtotal, finalTotal, paymentBaseAmount, paymentPayableTotal, paymentTipAmount, paymentCouponDiscount, paymentTipPercentage,
    paymentCustomTip, tipPercentages, tipEnabled, couponCode, setCouponCode, appliedCoupon, couponError, couponLoading, onApplyCoupon, onRemoveCoupon,
    visiblePaymentMethods, loadingPayments, selectedPaymentMethod, onPaymentMethodSelect, renderPaymentForm, renderPaymentButton, handleConfirmMyItems,
    handleSubmitTableDraft, setCheckoutStep, startSplitFlow, chooseSplitMethod, goToSplitReview, splitGuestCount, addSplitGuest, removeSplitGuest,
    splitMethod, splitGuestProfiles, activeSplitPeople, selectedSplitPersonId, setSelectedSplitPersonId, selectedSplitPerson, splitSourceItems,
    itemAssignments, setItemAssignments, sharePercents, setSharePercents, sharePercentTotal, canConfirmSplitMethod, splitGrandTotal,
    updatePaymentTipPercentage, updatePaymentCustomTip, onPaymentLinks, onQrShare, isDarkTheme,
  } = props

  const orderTotal = Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.orderTotal ?? submittedSnapshot?.total ?? tableDraftTotal ?? finalTotal ?? 0)

  const renderRows = (items: any[]) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${getItemName(item)}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2">
          <span className="min-w-0 truncate text-sm font-semibold text-[#f4fff8]">{getQuantity(item)}x {getItemName(item, `Item ${index + 1}`)}</span>
          <span className="shrink-0 text-sm font-black text-[#31c98b]">{formatCurrency(getAmount(item))}</span>
        </div>
      ))}
    </div>
  )

  const renderGuests = () => (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {splitGuestProfiles.map((guest, idx) => <span key={`${guest.name}-${idx}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#31c98b]/20 bg-[#31c98b]/10 px-2 py-1 text-[11px] font-bold text-[#e7fff3]"><span>{guest.avatar}</span>{guest.name}</span>)}
    </div>
  )

  let content: React.ReactNode = null

  if (checkoutStep === "review" && hasPersonalItems) {
    content = <Card className="space-y-4"><h2 className="text-2xl font-black text-[#f4fff8]">My Order</h2>{renderRows(personalItems)}<div className="space-y-2 border-t border-[#31c98b]/14 pt-3"><div className="flex justify-between text-sm text-[#c9f6df]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-base font-black text-[#f4fff8]"><span>Total</span><span className="text-[#31c98b]">{formatCurrency(finalTotal)}</span></div></div><div className="space-y-2"><PrimaryButton onClick={handleConfirmMyItems}>Confirm</PrimaryButton><SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton></div></Card>
  } else if (checkoutStep === "review" && tableDraft) {
    content = <Card className="space-y-4"><h2 className="text-2xl font-black text-[#f4fff8]">Table Order</h2>{renderRows(tableDraftItems)}<div className="flex justify-between border-t border-[#31c98b]/14 pt-3 text-base font-black text-[#f4fff8]"><span>Order Total</span><span className="text-[#31c98b]">{formatCurrency(tableDraftTotal)}</span></div><div className="space-y-2"><PrimaryButton onClick={handleSubmitTableDraft}>Send to kitchen</PrimaryButton><SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton></div></Card>
  } else if (checkoutStep === "submitted") {
    content = <Card className="space-y-4 pt-8 text-center"><div className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border border-[#31c98b]/35 bg-[#31c98b]/14 text-[#f4fff8]"><span className="text-2xl font-black">{estimatedMinutes}</span><span className="text-[10px] font-bold uppercase tracking-wide">min</span></div><div><CheckCircle className="mx-auto mb-2 h-7 w-7 text-[#31c98b]" /><h2 className="text-2xl font-black text-[#f4fff8]">We received your order</h2></div><div className="flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-base font-black text-[#f4fff8]"><span>Order Total</span><span className="text-[#31c98b]">{formatCurrency(orderTotal)}</span></div>{renderRows(submittedItems)}<div className="space-y-2"><PrimaryButton onClick={() => setCheckoutStep("payment")}>Pay in full</PrimaryButton><SecondaryButton onClick={() => startSplitFlow("equal")}>Split bill</SecondaryButton><SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton></div></Card>
  } else if (checkoutStep === "payment") {
    content = <div className="space-y-3"><Card className="space-y-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#31c98b] text-[#02110c]"><CreditCard className="h-5 w-5" /></div><div><h2 className="text-2xl font-black text-[#f4fff8]">Payment</h2><p className="text-sm font-semibold text-[#bdebd2]">Ready to pay?</p></div></div>{selectedSplitPerson && <div className="flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]"><span>{selectedSplitPerson.name}'s share</span><span>{formatCurrency(selectedSplitPerson.total)}</span></div>}<div className="space-y-2 rounded-3xl border border-[#31c98b]/14 bg-[#04130f]/58 p-3"><div className="flex justify-between text-sm text-[#c9f6df]"><span>{selectedSplitPerson ? "Share amount" : "Items total"}</span><span>{formatCurrency(paymentBaseAmount)}</span></div>{paymentTipAmount > 0 && <div className="flex justify-between text-sm text-[#c9f6df]"><span>Tip</span><span>{formatCurrency(paymentTipAmount)}</span></div>}{paymentCouponDiscount > 0 && <div className="flex justify-between text-sm text-[#8ff0bd]"><span>Coupon</span><span>-{formatCurrency(paymentCouponDiscount)}</span></div>}<div className="flex justify-between border-t border-[#31c98b]/14 pt-2 text-base font-black text-[#f4fff8]"><span>Payable total</span><span className="text-[#31c98b]">{formatCurrency(paymentPayableTotal)}</span></div></div>{tipEnabled && <div className="space-y-2"><div className="flex justify-between text-xs font-bold text-[#f4fff8]"><span>{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</span>{paymentTipAmount > 0 && <span className="text-[#31c98b]">{formatCurrency(paymentTipAmount)}</span>}</div><div className="flex flex-wrap gap-2">{[0, ...tipPercentages.filter((p) => p !== 0)].map((p) => <button key={p} type="button" onClick={() => updatePaymentTipPercentage(p)} className={`rounded-full border px-3 py-1.5 text-xs font-black ${paymentTipPercentage === p && !paymentCustomTip ? "border-[#31c98b] bg-[#31c98b] text-[#02110c]" : "border-[#31c98b]/25 bg-transparent text-[#e7fff3]"}`}>{p}%</button>)}<input type="number" min="0" step="0.01" value={paymentCustomTip} onChange={(event) => updatePaymentCustomTip(event.target.value)} placeholder="Custom" className="h-9 min-w-[96px] flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]" /></div></div>}<div className="space-y-2">{!appliedCoupon || selectedSplitPerson ? <div className="flex gap-2"><input type="text" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Coupon code" disabled={couponLoading} className="h-10 min-w-0 flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={onApplyCoupon} className="rounded-full border border-[#31c98b]/40 px-4 text-xs font-black text-[#e7fff3] disabled:opacity-50">{couponLoading ? "Checking..." : "Apply"}</button></div> : <div className="flex items-center justify-between rounded-full border border-[#31c98b]/18 bg-[#31c98b]/10 px-3 py-2 text-xs font-bold text-[#f4fff8]"><span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span><button type="button" onClick={onRemoveCoupon} className="rounded-full border border-[#31c98b]/35 px-3 py-1 text-[#e7fff3]">Remove</button></div>}{couponError && <p className="text-xs font-semibold text-[#ffb4a8]">{couponError}</p>}</div></Card><Card className="space-y-3"><h3 className="text-center text-sm font-black text-[#f4fff8]">Payment methods</h3><div className="flex flex-wrap items-center justify-center gap-3">{loadingPayments ? <p className="text-sm text-[#bdebd2]">Loading payment methods...</p> : visiblePaymentMethods.length === 0 ? <p className="text-sm text-[#bdebd2]">No payment methods available</p> : visiblePaymentMethods.map((method) => { const size = methodIconSize(method.code); return <button key={method.code} type="button" onClick={() => onPaymentMethodSelect(method.code)} className={`flex h-14 w-20 items-center justify-center rounded-2xl border ${selectedPaymentMethod === method.code ? "border-[#31c98b] bg-[#31c98b]/16" : "border-[#31c98b]/18 bg-[#04130f]/70"}`}><img src={method.code === "card" ? (isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg") : method.code === "paypal" ? "/images/payments/paypal.png" : method.code === "google_pay" ? "/images/payments/google_pay.png" : iconForPayment(method.code)} alt={method.name} width={size.width} height={size.height} className="object-contain" /></button> })}</div>{canRenderPaymentMethodDetail(selectedPaymentMethod) && <div className="pt-2">{renderPaymentForm()}</div>}{renderPaymentButton()}</Card></div>
  } else if (checkoutStep === "split" || checkoutStep === "split-items" || checkoutStep === "split-shares") {
    const title = checkoutStep === "split-items" ? "Assign items" : checkoutStep === "split-shares" ? "Set shares" : "Split Bill"
    content = <Card className="space-y-4"><div><h2 className="text-2xl font-black text-[#f4fff8]">{title}</h2><p className="text-sm font-semibold text-[#bdebd2]">Share {formatCurrency(splitGrandTotal)} your way.</p></div><SplitMethodTabs splitMethod={splitMethod} chooseSplitMethod={chooseSplitMethod} /><PeopleStepper splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />{renderGuests()}{splitMethod === "equal" && <div className="grid gap-2">{equalSplitPeople.map((person) => <div key={person.id} className="flex justify-between rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]"><span>{person.name}</span><span className="text-[#31c98b]">{formatCurrency(person.total)}</span></div>)}</div>}{splitMethod === "items" && <div className="space-y-2">{splitSourceItems.map((item) => { const assignedIndex = itemAssignments[item.key]; const assigned = assignedIndex !== undefined && assignedIndex !== null; return <button key={item.key} type="button" onClick={() => setItemAssignments((prev) => ({ ...prev, [item.key]: assignedIndex === undefined || assignedIndex === null ? 0 : assignedIndex >= splitGuestCount - 1 ? null : assignedIndex + 1 }))} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-left"><span className="min-w-0 truncate text-sm font-bold text-[#f4fff8]">{item.name}</span><span className="text-sm font-black text-[#31c98b]">{formatCurrency(item.amount)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${assigned ? "bg-[#31c98b] text-[#02110c]" : "border border-[#31c98b]/30 text-[#e7fff3]"}`}>{assigned ? splitGuestProfiles[assignedIndex]?.name || "Assigned" : "Unassigned"}</span></button> })}</div>}{splitMethod === "shares" && <div className="space-y-3">{sharePercents.slice(0, splitGuestCount).map((percent, idx) => <div key={idx} className="rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 p-3"><div className="mb-2 flex items-center justify-between text-sm font-bold text-[#f4fff8]"><span>{splitGuestProfiles[idx]?.name || `Guest ${idx + 1}`}</span><span className="text-[#31c98b]">{formatCurrency(splitGrandTotal * (Number(percent || 0) / 100))}</span></div><div className="flex items-center gap-2"><input type="number" min="0" max="100" value={percent} onChange={(event) => setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Number(event.target.value) : value))} className="h-9 w-20 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8]" /><input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Number(event.target.value) : value))} className="flex-1 accent-[#31c98b]" /></div></div>)}<div className={`mx-auto w-fit rounded-full px-3 py-1.5 text-xs font-black ${sharePercentTotal === 100 ? "bg-[#31c98b] text-[#02110c]" : "border border-[#ffb4a8]/50 text-[#ffb4a8]"}`}>{sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}</div></div>}<PrimaryButton disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</PrimaryButton></Card>
  } else if (checkoutStep === "split-review") {
    content = <Card className="space-y-4"><div><h2 className="text-2xl font-black text-[#f4fff8]">Review split</h2><p className="text-sm font-semibold text-[#bdebd2]">Choose a payer and continue to payment.</p></div>{activeSplitPeople.map((person) => <div key={person.id} className={`space-y-2 rounded-3xl border p-3 ${selectedSplitPersonId === person.id ? "border-[#31c98b] bg-[#31c98b]/12" : "border-[#31c98b]/14 bg-[#04130f]/58"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#31c98b]/20 text-sm font-black text-[#f4fff8]">{person.avatar}</span><span className="font-black text-[#f4fff8]">{person.name}</span></div><span className="rounded-full border border-[#31c98b]/20 px-2 py-1 text-[11px] font-bold text-[#dfffee]">{person.status}</span></div><div className="space-y-1 text-xs text-[#c9f6df]">{person.items.map((item, idx) => <div key={`${person.id}-${idx}`} className="flex justify-between gap-2"><span className="truncate">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>)}{person.tax > 0 && <div className="flex justify-between"><span>Proportional service/tax</span><span>{formatCurrency(person.tax)}</span></div>}</div><div className="flex justify-between border-t border-[#31c98b]/14 pt-2 text-sm font-black text-[#f4fff8]"><span>Total</span><span className="text-[#31c98b]">{formatCurrency(person.total)}</span></div>{selectedSplitPersonId === person.id ? <PrimaryButton onClick={() => setCheckoutStep("payment")}>Pay my share</PrimaryButton> : <SecondaryButton onClick={() => setSelectedSplitPersonId(person.id)}>Select payer</SecondaryButton>}</div>)}<div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><SecondaryButton onClick={onPaymentLinks} className="flex items-center justify-center gap-2"><Link2 className="h-4 w-4" /> Send payment link to others</SecondaryButton><SecondaryButton onClick={onQrShare} className="flex items-center justify-center gap-2"><QrCode className="h-4 w-4" /> Show QR/share link</SecondaryButton></div></Card>
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010806]/72 p-4 backdrop-blur-md"><div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[30px] border border-[#31c98b]/20 bg-[radial-gradient(circle_at_20%_0%,rgba(49,201,139,.18),transparent_36%),linear-gradient(180deg,#071812,#04100c)] p-4 shadow-[0_30px_90px_rgba(0,0,0,.62)]"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.22em] text-[#31c98b]">Modern Green</span><button type="button" onClick={onClose} className="rounded-full border border-[#31c98b]/25 px-3 py-1 text-xs font-bold text-[#e7fff3]">Close</button></div>{content}</div></div>
}
