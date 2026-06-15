"use client"

import { useEffect, useMemo, useState } from "react"
import { X, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MenuItem, MenuItemOptionValue, SelectedOptions } from "./types"
import { Badge, ItemBadges } from "./botanical-ui"
import { LeafGlyph } from "./botanical-icons"

export type BotanicalProductModalProps = {
  item: MenuItem | null
  open: boolean
  currency?: string
  onClose: () => void
  onAddItem?: (item: MenuItem, quantity: number, selectedOptions: SelectedOptions) => void
}

export function BotanicalProductModal({
  item,
  open,
  currency = "$",
  onClose,
  onAddItem,
}: BotanicalProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<SelectedOptions>({})

  // reset state whenever a new item is opened
  useEffect(() => {
    if (!item) return
    setQuantity(1)
    const defaults: SelectedOptions = {}
    item.options?.forEach((opt) => {
      if (opt.required && !opt.multiple && opt.values[0]) {
        defaults[opt.id] = [opt.values[0]]
      } else {
        defaults[opt.id] = []
      }
    })
    setSelected(defaults)
  }, [item])

  // lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  const extras = useMemo(
    () =>
      Object.values(selected)
        .flat()
        .reduce((sum, v) => sum + (v.price ?? 0), 0),
    [selected],
  )

  if (!open || !item) return null

  const dir = item.rtl ? "rtl" : "ltr"
  const total = (item.price + extras) * quantity
  const heroImage = item.images?.[0] ?? item.image

  function toggleValue(optionId: string, multiple: boolean | undefined, value: MenuItemOptionValue) {
    setSelected((prev) => {
      const current = prev[optionId] ?? []
      if (multiple) {
        const exists = current.some((v) => v.id === value.id)
        return {
          ...prev,
          [optionId]: exists ? current.filter((v) => v.id !== value.id) : [...current, value],
        }
      }
      return { ...prev, [optionId]: [value] }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={item.name}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--pmd-ink)_45%,transparent)] backdrop-blur-[2px]"
      />

      <div
        dir={dir}
        className="pmd-card-grain relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-[var(--pmd-line)] bg-[var(--pmd-paper-soft)] shadow-[0_-10px_50px_-12px_rgba(60,53,41,0.5)] sm:max-h-[88vh] sm:rounded-[2rem]"
      >
        {/* image header */}
        <div className="relative h-56 shrink-0 sm:h-64">
          <img
            src={heroImage || "/placeholder.svg?height=320&width=480&query=dish"}
            alt={item.name}
            className="size-full object-cover"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-20"
            style={{ background: "linear-gradient(to top, var(--pmd-paper-soft), transparent)" }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pmd-paper-soft)_90%,transparent)] text-[var(--pmd-ink)] shadow-md backdrop-blur transition-transform hover:scale-105"
          >
            <X className="size-5" />
          </button>
          {item.isSoldOut && (
            <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-md border-2 border-dashed border-[var(--pmd-accent)] bg-[color-mix(in_srgb,var(--pmd-paper-soft)_85%,transparent)] px-3 py-1 font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[var(--pmd-accent)]">
              <LeafGlyph className="size-3.5" /> Sold Out
            </span>
          )}
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold leading-tight text-[var(--pmd-ink)] text-balance">
              {item.name}
            </h2>
            <span className="shrink-0 font-serif text-xl font-semibold text-[var(--pmd-ink)]">
              {currency}
              {item.price}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.isNew && <Badge variant="new">New</Badge>}
            {item.isChefRecommended && <Badge variant="chef">Chef&apos;s Choice</Badge>}
            {item.isBestSeller && <Badge variant="best">Best Seller</Badge>}
          </div>

          {item.description && (
            <p className="mt-3 text-pretty text-[15px] leading-relaxed text-[var(--pmd-muted)]">
              {item.description}
            </p>
          )}

          {/* dietary + allergens */}
          <div className="mt-4 space-y-3 rounded-2xl border border-[var(--pmd-line)] bg-[color-mix(in_srgb,var(--pmd-paper)_60%,var(--pmd-paper-soft))] p-4">
            <ItemBadges item={item} />
            {item.allergens && item.allergens.length > 0 && (
              <p className="text-xs leading-relaxed text-[var(--pmd-muted)]">
                <span className="font-semibold uppercase tracking-[0.12em]">Allergens:</span>{" "}
                {item.allergens.join(", ")}
              </p>
            )}
          </div>

          {/* options / modifiers */}
          {item.options?.map((opt) => (
            <fieldset key={opt.id} className="mt-5">
              <legend className="flex items-center gap-2 font-serif text-lg font-semibold text-[var(--pmd-ink)]">
                {opt.name}
                {opt.required && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--pmd-accent)]">
                    Required
                  </span>
                )}
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {opt.values.map((value) => {
                  const isSelected = (selected[opt.id] ?? []).some((v) => v.id === value.id)
                  return (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => toggleValue(opt.id, opt.multiple, value)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "border-[var(--pmd-primary)] bg-[color-mix(in_srgb,var(--pmd-primary)_12%,var(--pmd-paper-soft))]"
                          : "border-[var(--pmd-line)] bg-[var(--pmd-paper-soft)] hover:border-[var(--pmd-accent-soft)]",
                      )}
                    >
                      <span className="flex items-center gap-2.5 text-sm text-[var(--pmd-ink)]">
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border",
                            opt.multiple ? "rounded-[5px]" : "rounded-full",
                            isSelected
                              ? "border-[var(--pmd-primary)] bg-[var(--pmd-primary)]"
                              : "border-[var(--pmd-muted)]",
                          )}
                        >
                          {isSelected && <span className="size-1.5 rounded-full bg-[var(--pmd-paper-soft)]" />}
                        </span>
                        {value.name}
                      </span>
                      {value.price ? (
                        <span className="text-sm font-medium text-[var(--pmd-muted)]">
                          +{currency}
                          {value.price}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* footer: quantity + add */}
        <div className="shrink-0 border-t border-[var(--pmd-line)] bg-[var(--pmd-paper-soft)] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-[var(--pmd-line)] bg-[var(--pmd-paper)] p-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex size-9 items-center justify-center rounded-full text-[var(--pmd-ink)] transition-colors hover:bg-[var(--pmd-paper-soft)] disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-7 text-center font-serif text-lg font-semibold text-[var(--pmd-ink)]">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex size-9 items-center justify-center rounded-full text-[var(--pmd-ink)] transition-colors hover:bg-[var(--pmd-paper-soft)]"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={item.isSoldOut}
              onClick={() => onAddItem?.(item, quantity, selected)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--pmd-primary)] py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--pmd-paper-soft)] shadow-[0_12px_24px_-12px_rgba(60,53,41,0.7)] transition-colors hover:bg-[var(--pmd-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.isSoldOut ? "Sold Out" : "Add to Order"}
              {!item.isSoldOut && (
                <span className="opacity-90">
                  · {currency}
                  {total.toFixed(total % 1 ? 2 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
