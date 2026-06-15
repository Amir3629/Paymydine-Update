"use client"

/**
 * Modern Green theme — the top-level menu shell.
 *
 * Composes: header (logo, table pill, language, valet), hero, search,
 * category navigation, and a content slot for menu sections. All
 * interactive controls forward to host-supplied callbacks. This component
 * holds NO ordering/business logic.
 */

import { cn } from "@/lib/utils"
import { Globe, Search, SquareParking } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { ThemeIconButton, ThemeModeToggle, ThemePill } from "./primitives"
import type { MenuCategory, ThemeMode } from "./types"

export interface ModernGreenMenuShellProps {
  /** dark is the primary/default mode */
  mode?: ThemeMode
  /** restaurant / brand name shown in the header */
  brandName?: string
  logoUrl?: string
  tableLabel?: string
  languageLabel?: string
  heroTitle?: ReactNode
  heroSubtitle?: string
  heroImageUrl?: string
  categories: MenuCategory[]
  activeCategory: string
  searchValue?: string
  /** main content — typically <ModernGreenMenuSections /> */
  children: ReactNode

  onSelectCategory?: (categoryId: string) => void
  onSearchChange?: (value: string) => void
  onOpenLanguage?: () => void
  onOpenValet?: () => void
  onSelectTable?: () => void
  onToggleMode?: (mode: ThemeMode) => void
}

export function ModernGreenMenuShell({
  mode = "dark",
  brandName = "Verdant",
  logoUrl,
  tableLabel = "Table 07",
  languageLabel = "EN",
  heroTitle,
  heroSubtitle = "Browse the menu, order from your table, and pay whenever you're ready.",
  heroImageUrl = "/pmd-modern-green/images/hero-dish.png",
  categories,
  activeCategory,
  searchValue,
  children,
  onSelectCategory,
  onSearchChange,
  onOpenLanguage,
  onOpenValet,
  onSelectTable,
  onToggleMode,
}: ModernGreenMenuShellProps) {
  return (
    <div className="modern-green-theme min-h-screen w-full" data-mode={mode}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
        {/* Header */}
        <header className="relative flex items-center justify-between gap-2">
          <div className="flex h-10 items-center justify-start">
            {logoUrl ? (
              <span data-mg-logo-frame className="flex h-16 w-[6.8rem] items-center justify-start overflow-visible bg-transparent border-0 shadow-none">
                <img src={logoUrl} alt={brandName} className="h-16 max-w-[6.8rem] w-auto object-contain" onError={(event) => { const frame = event.currentTarget.closest("[data-mg-logo-frame]") as HTMLElement | null; if (frame) { frame.style.visibility = "hidden"; frame.style.opacity = "0" } }} />
              </span>
            ) : null}
          </div>

          <ThemePill
            onClick={onSelectTable}
            className="absolute left-1/2 top-1/2 min-w-[4.2rem] max-w-[5.8rem] -translate-x-1/2 -translate-y-1/2 justify-center truncate px-3 text-center"
          >
            <span className="max-w-[6.4rem] truncate text-center">{tableLabel}</span>
          </ThemePill>

          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <ThemeIconButton onClick={onOpenLanguage} label={languageLabel || "Language"}>
              <Globe className="size-4" />
            </ThemeIconButton>
            {onToggleMode && (
              <ThemeModeToggle
                mode={mode}
                onChange={onToggleMode}
                iconOnly
              />
            )}
            <ThemeIconButton onClick={onOpenValet} label="Valet">
              <SquareParking className="size-4" />
            </ThemeIconButton>
          </div>
        </header>

        {/* Hero */}
        <section className="relative mt-5 overflow-hidden rounded-3xl">
          <div className="mg-glass relative flex flex-col gap-4 rounded-3xl p-5">
            <div className="max-w-[60%] space-y-2">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-balance">
                {heroTitle ?? (
                  <>
                    Modern dining made{" "}
                    <span className="text-[var(--mg-green)]">effortless</span>.
                  </>
                )}
              </h1>
              <p className="text-xs leading-relaxed text-[var(--mg-text-soft)] text-pretty">
                {heroSubtitle}
              </p>
            </div>
            <div className="pointer-events-none absolute -bottom-3 -right-2 size-24 overflow-hidden rounded-full border border-[var(--mg-border-strong)]">
              <Image
                src={heroImageUrl || "/placeholder.svg"}
                alt="Featured dish"
                fill
                sizes="128px"
                className="object-contain p-0 scale-[1.24]"
              />
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="mt-4">
          <div className="mg-glass flex h-12 items-center gap-3 rounded-2xl px-4">
            <Search className="size-4 text-[var(--mg-text-dim)]" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search dishes, drinks…"
              aria-label="Search the menu"
              className="h-full w-full bg-transparent text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none"
            />
          </div>
        </div>

        {/* Category navigation */}
        <nav
          aria-label="Menu categories"
          className="mg-no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {categories.map((category) => (
            <ThemePill
              key={category.id}
              active={category.id === activeCategory}
              onClick={() => onSelectCategory?.(category.id)}
              className={cn("shrink-0 whitespace-nowrap")}
            >
              {category.label}
            </ThemePill>
          ))}
        </nav>

        {/* Content */}
        <main className="mt-6 flex-1">{children}</main>
      </div>
    </div>
  )
}
