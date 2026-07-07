"use client"

import { motion } from "framer-motion"
import { Minus, Plus, Link2, QrCode } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
  SplitBillPanel,
  ThemedButton,
} from "@/components/theme-ui"
import { isSplitCheckoutStep } from "@/features/checkout/checkout-state-utils"
import type { SplitMethod, SplitSourceItem } from "@/features/checkout/types"

export function NeutralSplitBillPanel(props: any) {
  const {
    checkoutStep,
    splitGrandTotal,
    splitMethod,
    chooseSplitMethod,
    splitGuestCount,
    suggestedSplitGuestCount,
    removeSplitGuest,
    addSplitGuest,
    splitGuestProfiles,
    equalSplitPeople,
    unassignedSplitItems,
    splitSourceItems,
    itemAssignments,
    setItemAssignments,
    splitGuestNames,
    sharePercents,
    setSharePercents,
    getSplitGuestAvatar,
    sharePercentTotal,
    canConfirmSplitMethod,
    goToSplitReview,
    activeSplitPeople,
    selectedSplitPersonId,
    setCheckoutStep,
    setSelectedSplitPersonId,
    toast,
    modalSecondaryBtn,
  } = props

  // PMD_AUDIT_PHASE3_SPLIT_PROGRESS
  const pmdSplitPaidCount = Array.isArray(activeSplitPeople)
    ? activeSplitPeople.filter((person: any) => String(person?.status || "").toLowerCase() === "paid").length
    : 0
  const pmdSplitTotalCount = Array.isArray(activeSplitPeople) && activeSplitPeople.length > 0
    ? activeSplitPeople.length
    : Number(splitGuestCount || 0)
  const pmdSplitProgressPercent = pmdSplitTotalCount > 0
    ? Math.min(100, Math.max(0, Math.round((pmdSplitPaidCount / pmdSplitTotalCount) * 100)))
    : 0

  return (
    <>

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
                    {splitGuestProfiles.map((guest: any, idx: number) => (
                      <span key={`${guest.name}-${idx}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)", background: "color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)", color: "#062F2A" }}>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ background: "color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)" }}>{guest.avatar}</span>
                        {guest.name}
                      </span>
                    ))}
                  </div>

                  {splitMethod === "equal" && (
                    <div className="space-y-2">
                      {equalSplitPeople.map((person: any, idx: number) => (
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
                            <button key={item.key} type="button" className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }} onClick={() => setItemAssignments((prev: any) => ({ ...prev, [item.key]: assignedIndex === undefined || assignedIndex === null ? 0 : assignedIndex >= splitGuestCount - 1 ? null : assignedIndex + 1 }))}>
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
                      {sharePercents.slice(0, splitGuestCount).map((percent: any, idx: number) => (
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
                                    setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? nextPercent : value))
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
                                    setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? Math.round(nextPercent) : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-amount-input"
                                  inputMode="decimal"
                                />
                              </div>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? Number(event.target.value) : value))} className="pmd-split-slider w-full" />
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
                  <div
                    data-pmd-split-progress="1"
                    className="rounded-3xl border p-3 text-xs shadow-sm"
                    style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", color: "var(--theme-text-primary)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Split progress</span>
                      <span className="muted">{pmdSplitPaidCount} of {pmdSplitTotalCount} paid</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--theme-border) 55%, transparent)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pmdSplitProgressPercent}%`, background: "#062F2A" }} />
                    </div>
                    {pmdSplitPaidCount > 0 && pmdSplitPaidCount < pmdSplitTotalCount && (
                      <p className="mt-2 muted">If one guest leaves this payment flow, the remaining balance stays visible on the table order and staff can collect it from the QR checkout.</p>
                    )}
                  </div>
                  {activeSplitPeople.map((person: any) => (
                    <div key={person.id} className="rounded-3xl p-3 space-y-2 shadow-sm" style={{ border: `1px solid ${selectedSplitPersonId === person.id ? "#b88940" : "color-mix(in srgb, var(--theme-border) 70%, transparent)"}`, background: "var(--theme-surface)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                          <h4 className="truncate font-semibold">{person.name}</h4>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: person.status === "Paid" ? "#DCFCE7" : "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: person.status === "Paid" ? "#166534" : "#5A3512" }}>{person.status}</span>
                      </div>
                      <div className="space-y-1 text-xs muted">
                        {person.items.map((item: any, idx: number) => <div key={`${person.id}-${idx}`} className="flex justify-between gap-2"><span className="truncate">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>)}
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
    </>
  )
}
