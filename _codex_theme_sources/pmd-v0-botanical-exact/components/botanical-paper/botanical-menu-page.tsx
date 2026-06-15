"use client"

import { useMemo, useState } from "react"
import type { Category, MenuItem, MenuSectionData, SelectedOptions } from "./types"
import { sampleCategories, sampleSections } from "./sample-data"
import { BotanicalTopBar } from "./botanical-top-bar"
import { BotanicalHero } from "./botanical-hero"
import { BotanicalCategoryNav } from "./botanical-category-nav"
import { BotanicalMenuSection } from "./botanical-menu-section"
import { BotanicalBottomDock } from "./botanical-bottom-dock"
import { BotanicalProductModal } from "./botanical-product-modal"

export type BotanicalMenuPageProps = {
  restaurantName?: string
  tagline?: string
  heroImageUrl?: string
  categories?: Category[]
  sections?: MenuSectionData[]
  showTableOrder?: boolean
  hideBottomDock?: boolean
  initialCartCount?: number
  /* outward-facing callbacks so this can be wired to PayMyDine later */
  onAddItem?: (item: MenuItem, quantity: number, selectedOptions: SelectedOptions) => void
  onCallWaiter?: () => void
  onAddNote?: () => void
  onCheckout?: () => void
  onOpenTableOrder?: () => void
  onCallToOrder?: () => void
  onMenu?: () => void
  onLanguage?: () => void
}

export function BotanicalMenuPage({
  restaurantName = "Mimoza Restaurant",
  tagline = "Farm to Table",
  heroImageUrl = "/themes/botanical-paper/hero-bg.png",
  categories = sampleCategories,
  sections = sampleSections,
  showTableOrder = true,
  hideBottomDock = false,
  initialCartCount = 1,
  onAddItem,
  onCallWaiter,
  onAddNote,
  onCheckout,
  onOpenTableOrder,
  onCallToOrder,
  onMenu,
  onLanguage,
}: BotanicalMenuPageProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  // local cart count is purely visual for the prototype
  const [cartCount, setCartCount] = useState(initialCartCount)

  const visibleSections = useMemo(() => {
    if (selectedCategory === "all") return sections
    const filtered = sections.filter((s) => s.categoryId === selectedCategory)
    return filtered.length > 0 ? filtered : sections
  }, [sections, selectedCategory])

  function handleSelectItem(item: MenuItem) {
    setActiveItem(item)
    setModalOpen(true)
  }

  function handleQuickAdd(item: MenuItem) {
    setCartCount((c) => c + 1)
    onAddItem?.(item, 1, {})
  }

  function handleModalAdd(item: MenuItem, quantity: number, options: SelectedOptions) {
    setCartCount((c) => c + quantity)
    onAddItem?.(item, quantity, options)
    setModalOpen(false)
  }

  return (
    <div className="pmd-paper-grain min-h-screen text-[var(--pmd-ink)]">
      <div className="mx-auto max-w-2xl pb-32">
        <BotanicalTopBar
          restaurantName={restaurantName}
          tagline={tagline}
          onMenu={onMenu}
          onLanguage={onLanguage}
        />

        <BotanicalHero
          restaurantName={restaurantName}
          tagline={tagline}
          heroImageUrl={heroImageUrl}
          onCallToOrder={onCallToOrder}
        />

        <div className="sticky top-0 z-20 -mt-2 bg-[color-mix(in_srgb,var(--pmd-paper)_92%,transparent)] py-3 backdrop-blur-sm">
          <BotanicalCategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {visibleSections.map((section) => (
          <BotanicalMenuSection
            key={section.id}
            section={section}
            onSelectItem={handleSelectItem}
            onAddItem={handleQuickAdd}
          />
        ))}
      </div>

      {!hideBottomDock && (
      <BotanicalBottomDock
        cartCount={cartCount}
        tableOrderCount={1}
        showTableOrder={showTableOrder}
        onCallWaiter={onCallWaiter}
        onAddNote={onAddNote}
        onCheckout={onCheckout}
        onOpenTableOrder={onOpenTableOrder}
      />
      )}

      <BotanicalProductModal
        item={activeItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddItem={handleModalAdd}
      />
    </div>
  )
}
