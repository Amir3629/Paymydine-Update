'use client'

import { Leaf, Sprout } from 'lucide-react'
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
    <header className="relative overflow-hidden rounded-b-[2.25rem] border-b border-[#CDBF9F]/45 bg-[var(--organic-bg)] px-4 pb-7 pt-5 text-[var(--organic-text)] shadow-[0_12px_40px_rgba(73,61,45,0.08)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(53,47,40,.25)_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="relative mx-auto max-w-4xl">
        <Logo tableNumber={tableNumber} className="min-h-[74px]" />
        <div className="mt-3 grid gap-5 md:grid-cols-[1fr_1.05fr] md:items-center">
          <div className="space-y-4">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-[#CDBF9F]/50 bg-[#FFF9EF]/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--organic-muted)] md:mx-0">
              <Sprout className="h-3.5 w-3.5 text-[var(--organic-primary)]" />
              Farm to table
            </div>
            <div>
              <p className="mb-2 text-center text-xs uppercase tracking-[0.34em] text-[var(--organic-muted)] md:text-left">{restaurantName}</p>
              <h1 className="text-center font-serif text-5xl leading-[0.95] tracking-[-0.04em] text-[var(--organic-text)] md:text-left md:text-6xl">
                Nourished<br />by Nature.
              </h1>
            </div>
            <div className="mx-auto flex w-fit items-center gap-2 text-[var(--organic-accent)] md:mx-0" aria-hidden="true">
              <span className="h-px w-10 bg-current" />
              <Leaf className="h-4 w-4" />
              <span className="h-px w-10 bg-current" />
            </div>
            <p className="mx-auto max-w-sm text-center font-serif text-lg leading-relaxed text-[var(--organic-muted)] md:mx-0 md:text-left">
              Thoughtfully sourced. Beautifully prepared. Made to be shared.
            </p>
          </div>
          <div className="relative mx-auto aspect-[1.08] w-full max-w-[420px] overflow-hidden rounded-[2.4rem] border border-[#EFE3CA] bg-[#FFF9EF] shadow-[0_18px_50px_rgba(66,55,35,0.16)]">
            {heroImage ? (
              <OptimizedImage src={heroImage} alt={heroItem?.name || 'Featured dish'} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#E6DDC7] text-[var(--organic-primary)]"><Leaf className="h-16 w-16" /></div>
            )}
          </div>
        </div>
      </div>
      <svg className="absolute -bottom-1 left-0 h-10 w-full text-[#EFE6D5]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0,40 C180,78 300,10 470,42 C640,75 760,34 910,45 C1080,58 1210,18 1440,46 L1440,80 L0,80 Z" />
      </svg>
    </header>
  )
}
