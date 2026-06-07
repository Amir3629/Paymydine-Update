'use client'

import { Leaf, Sprout, Wheat } from 'lucide-react'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { Logo } from '@/components/logo'
import { type MenuItem } from '@/lib/data'

export function OrganicBotanicalHero({
  restaurantName,
  tableNumber,
  heroItem,
}: {
  restaurantName: string
  tableNumber?: string
  heroItem?: MenuItem | null
}) {
  const heroImage = heroItem?.image || (Array.isArray((heroItem as any)?.images) ? (heroItem as any).images[0] : '') || ''

  return (
    <header className="relative isolate overflow-hidden bg-[var(--organic-bg)] text-[var(--organic-text)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.2] [background-image:radial-gradient(rgba(86,78,58,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45),transparent_32%,rgba(91,82,58,.07)_65%,transparent)] [background-size:12px_12px,100%_100%]" />
      <div className="pointer-events-none absolute -left-12 top-28 hidden h-52 w-52 rotate-[-18deg] rounded-full border border-[var(--organic-primary)]/15 md:block" />
      <div className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-[var(--organic-accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-6 md:pb-16">
        <div className="mx-auto mb-2 max-w-4xl">
          <Logo tableNumber={tableNumber} className="min-h-[58px]" />
        </div>
        <div className="mx-auto mb-4 text-center">
          <div className="mx-auto mb-1 flex w-fit items-center gap-2 text-[var(--organic-primary)]" aria-hidden="true">
            <Leaf className="h-4 w-4" />
            <span className="h-px w-12 bg-current" />
            <Sprout className="h-4 w-4" />
            <span className="h-px w-12 bg-current" />
            <Leaf className="h-4 w-4 -scale-x-100" />
          </div>
          <p className="font-serif text-[1.45rem] uppercase tracking-[0.28em] text-[var(--organic-text)] sm:text-3xl">{restaurantName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--organic-muted)]">Farm to table</p>
        </div>

        <div className="relative overflow-hidden rounded-[2.6rem] border border-[#E1D4B9]/85 bg-[#FFF9EF]/78 shadow-[0_26px_70px_rgba(67,56,38,.16)] md:rounded-[3.25rem]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(105deg,rgba(255,255,255,.75),transparent_36%),radial-gradient(rgba(73,68,48,.16)_1px,transparent_1px)] [background-size:100%_100%,14px_14px]" />
          <div className="grid min-h-[430px] md:grid-cols-[0.9fr_1.1fr] md:items-stretch">
            <div className="relative z-10 flex flex-col justify-center px-7 py-9 sm:px-10 md:py-12">
              <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-[var(--organic-primary)]/20 bg-[var(--organic-primary)]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--organic-primary)]">
                <Wheat className="h-3.5 w-3.5" />
                Freshly prepared
              </div>
              <h1 className="font-serif text-[3.4rem] leading-[0.88] tracking-[-0.055em] text-[var(--organic-primary)] sm:text-6xl md:text-7xl">
                Nourished<br />by Nature.
              </h1>
              <div className="my-5 flex items-center gap-2 text-[var(--organic-accent)]" aria-hidden="true">
                <span className="h-px w-12 bg-current" />
                <Leaf className="h-4 w-4" />
                <span className="h-px w-12 bg-current" />
              </div>
              <p className="max-w-sm font-serif text-lg leading-relaxed text-[var(--organic-muted)] sm:text-xl">
                Thoughtfully sourced. Beautifully prepared. Made to be shared.
              </p>
            </div>

            <div className="relative min-h-[270px] overflow-hidden md:min-h-full">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,249,239,.92),rgba(255,249,239,.28)_30%,transparent_55%)] md:z-10" />
              {heroImage ? (
                <OptimizedImage src={heroImage} alt={heroItem?.name || 'Featured dish'} fill priority className="object-cover" />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center bg-[#E6DDC7] text-[var(--organic-primary)]"><Leaf className="h-20 w-20" /></div>
              )}
              <div className="absolute bottom-5 right-5 z-20 max-w-[230px] rounded-[1.4rem] border border-white/70 bg-[#FFF9EF]/82 px-4 py-3 shadow-[0_16px_34px_rgba(54,45,32,.16)] backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--organic-accent)]">Featured today</p>
                <p className="font-serif text-lg leading-tight text-[var(--organic-text)]">{heroItem?.name || 'Seasonal favorite'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <svg className="absolute -bottom-1 left-0 h-14 w-full text-[#EFE6D5]" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0,45 C160,86 285,20 438,48 C610,80 728,36 882,48 C1058,62 1196,20 1440,50 L1440,96 L0,96 Z" />
      </svg>
    </header>
  )
}
