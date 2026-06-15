"use client"

/**
 * Modern Green theme — DEMO harness.
 *
 * This component exists ONLY to demonstrate the theme with sample data
 * and local UI state. It is NOT part of the theme layer and should not be
 * shipped to production. It shows how a host would wire callbacks to open
 * each modal/card state — but contains deliberately minimal "fake" state
 * (which sheet is open, which option is selected) and NO real business
 * logic (no totals math, no payment, no API calls).
 */

import { useState } from "react"
import {
  ModernGreenMenuShell,
  ModernGreenMenuSections,
  ModernGreenItemDetailCard,
  ModernGreenThemeActions,
  ModernGreenOrderReviewCard,
  ModernGreenOrderStatusCard,
  ModernGreenPaymentCard,
  ModernGreenSplitBillCard,
  ModernGreenReviewSplitCard,
  ModernGreenWaiterCard,
  ModernGreenNoteCard,
  ModernGreenValetCard,
  ModernGreenValetSuccessCard,
  ThemeModal,
  ThemeModeToggle,
  formatUsd,
  sampleCategories,
  sampleSections,
  sampleCartLines,
  sampleOrder,
  samplePaymentMethods,
  sampleTipOptions,
  sampleSplitGuests,
  type MenuItem,
  type SplitMethod,
  type ThemeMode,
  type ValetFormValues,
} from "@/components/themes/modern-green"

type Sheet =
  | null
  | "review"
  | "status"
  | "payment"
  | "split"
  | "reviewSplit"
  | "waiter"
  | "note"
  | "valet"
  | "item"

export function ModernGreenDemo() {
  // --- presentational UI state only (no domain logic) ---
  const [mode, setMode] = useState<ThemeMode>("dark")
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  const [selectedMethod, setSelectedMethod] = useState<string | undefined>("card")
  const [selectedTip, setSelectedTip] = useState<string | undefined>("tip-10")
  const [customTip, setCustomTip] = useState("")
  const [coupon, setCoupon] = useState("")
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equally")
  const [guestCount, setGuestCount] = useState(3)
  const [splitPayMethod, setSplitPayMethod] = useState<string | undefined>()
  const [valet, setValet] = useState<ValetFormValues>({})
  const [valetDone, setValetDone] = useState(false)
  const [note, setNote] = useState("")

  const close = () => setSheet(null)

  return (
    <div className="modern-green-theme min-h-screen" data-mode={mode}>
      <div className="fixed right-4 top-4 z-40">
        <ThemeModeToggle mode={mode} onChange={setMode} />
      </div>
      <ModernGreenMenuShell
        mode={mode}
        brandName="Verdant"
        tableLabel="Table 07"
        categories={sampleCategories}
        activeCategory={activeCategory}
        searchValue={search}
        onSelectCategory={setActiveCategory}
        onSearchChange={setSearch}
        onOpenValet={() => {
          setValetDone(false)
          setSheet("valet")
        }}
        onOpenLanguage={() => {}}
        onSelectTable={() => {}}
      >
        <ModernGreenMenuSections
          sections={sampleSections}
          formatPrice={formatUsd}
          onAddItem={() => {}}
          onSelectItem={(item) => {
            setSelectedItem(item)
            setSheet("item")
          }}
        />
      </ModernGreenMenuShell>


      <ModernGreenThemeActions
        cartTotal={94}
        cartCount={4}
        formatPrice={formatUsd}
        onCallWaiter={() => setSheet("waiter")}
        onOpenNote={() => setSheet("note")}
        onCheckout={() => setSheet("review")}
      />

      {/* 3A. Order review */}
      <ThemeModal
        mode={mode}
        open={sheet === "review"}
        onClose={close}
        title="Order review"
        description="Check your items before sending to the kitchen."
      >
        <ModernGreenOrderReviewCard
          lines={sampleCartLines}
          totals={sampleOrder.totals}
          tableLabel="Table 07"
          formatPrice={formatUsd}
          sharedTableNote="2 guests are sharing this table order."
          onConfirm={() => setSheet("status")}
          onSendToKitchen={() => setSheet("status")}
          onContinueOrdering={close}
        />
      </ThemeModal>

      {/* 3B. Order status */}
      <ThemeModal mode={mode} open={sheet === "status"} onClose={close} title="Order status">
        <ModernGreenOrderStatusCard
          order={sampleOrder}
          formatPrice={formatUsd}
          onPayInFull={() => setSheet("payment")}
          onSplitBill={() => setSheet("split")}
          onContinueOrdering={close}
        />
      </ThemeModal>

      {/* 3C. Payment */}
      <ThemeModal mode={mode} open={sheet === "payment"} onClose={close} title="Payment">
        <ModernGreenPaymentCard
          totals={sampleOrder.totals}
          formatPrice={formatUsd}
          methods={samplePaymentMethods}
          selectedMethodId={selectedMethod}
          tipOptions={sampleTipOptions}
          selectedTipId={selectedTip}
          customTip={customTip}
          couponValue={coupon}
          onSelectMethod={setSelectedMethod}
          onSelectTip={setSelectedTip}
          onCustomTipChange={setCustomTip}
          onCouponChange={setCoupon}
          onApplyCoupon={() => {}}
          onChangeCardField={() => {}}
          onPay={close}
        />
      </ThemeModal>

      {/* 3D. Split bill */}
      <ThemeModal mode={mode} open={sheet === "split"} onClose={close} title="Split bill">
        <ModernGreenSplitBillCard
          total={sampleOrder.totals.total}
          formatPrice={formatUsd}
          selectedMethod={splitMethod}
          guestCount={guestCount}
          guests={sampleSplitGuests}
          lines={sampleCartLines}
          oddCentsNote="Odd cents are added to the first guest so totals match exactly."
          onSelectMethod={setSplitMethod}
          onIncrementGuests={() => setGuestCount((c) => c + 1)}
          onDecrementGuests={() => setGuestCount((c) => Math.max(1, c - 1))}
          onAdjustShares={() => {}}
          onReviewSplit={() => setSheet("reviewSplit")}
        />
      </ThemeModal>

      {/* 3E. Review split */}
      <ThemeModal
        mode={mode}
        open={sheet === "reviewSplit"}
        onClose={close}
        title="Review split"
      >
        <ModernGreenReviewSplitCard
          methodLabel={`${splitMethod === "equally" ? "Split equally" : splitMethod === "by-items" ? "By order items" : "By shares"} · ${guestCount} people`}
          activePayer={sampleSplitGuests[0]}
          subtotal={31.33}
          totals={{ subtotal: 31.33, tip: 3.14, total: 34.47 }}
          formatPrice={formatUsd}
          paymentMethods={samplePaymentMethods}
          selectedPaymentMethodId={splitPayMethod}
          onSelectPaymentMethod={setSplitPayMethod}
          onConfirm={close}
        />
      </ThemeModal>


      {/* Menu item detail */}
      <ThemeModal
        mode={mode}
        open={sheet === "item" && !!selectedItem}
        onClose={() => {
          setSelectedItem(null)
          close()
        }}
      >
        {selectedItem && (
          <ModernGreenItemDetailCard
            item={selectedItem}
            formatPrice={formatUsd}
            onAddItem={() => {}}
            onClose={() => {
              setSelectedItem(null)
              close()
            }}
          />
        )}
      </ThemeModal>

      {/* 3F. Waiter */}
      <ThemeModal mode={mode} open={sheet === "waiter"} onClose={close}>
        <ModernGreenWaiterCard
          tableLabel="Table 07"
          onCallWaiter={close}
          onCancel={close}
        />
      </ThemeModal>

      {/* 3G. Note / request */}
      <ThemeModal mode={mode} open={sheet === "note"} onClose={close} title="Note / request">
        <ModernGreenNoteCard
          value={note}
          onChange={setNote}
          onSubmit={close}
          onCancel={close}
        />
      </ThemeModal>

      {/* 3H. Valet (form + success) */}
      <ThemeModal
        mode={mode}
        open={sheet === "valet"}
        onClose={close}
        title={valetDone ? undefined : "Request valet"}
      >
        {valetDone ? (
          <ModernGreenValetSuccessCard onDone={close} />
        ) : (
          <ModernGreenValetCard
            values={valet}
            onChangeField={(field, value) =>
              setValet((v) => ({ ...v, [field]: value }))
            }
            onSubmit={() => setValetDone(true)}
            onCancel={close}
          />
        )}
      </ThemeModal>
    </div>
  )
}
