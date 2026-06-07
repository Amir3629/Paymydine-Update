'use client'

import { CakeSlice, Leaf, Soup, Sprout, Utensils, Wheat } from 'lucide-react'

const icons = [Leaf, Utensils, Sprout, Soup, CakeSlice, Wheat]

export function OrganicBotanicalCategoryNav({ categories, selectedCategory, onSelectCategory }: { categories: string[]; selectedCategory: string; onSelectCategory: (category: string) => void }) {
  return (
    <nav className="relative z-10 -mt-7 mb-8 overflow-x-auto px-4 pb-3" aria-label="Menu categories">
      <div className="mx-auto flex max-w-4xl gap-3 rounded-[2rem] border border-[#E2D5BB]/80 bg-[#FFF9EF]/72 p-3 shadow-[0_18px_45px_rgba(67,56,38,.12)] backdrop-blur-md md:justify-center md:gap-6 md:rounded-[2.4rem] md:px-7">
        {categories.map((category, index) => {
          const active = selectedCategory === category
          const Icon = icons[index % icons.length]
          return (
            <button key={category} type="button" onClick={() => onSelectCategory(category)} className="group min-w-[78px] rounded-[1.4rem] px-1.5 py-1 text-center focus:outline-none focus:ring-2 focus:ring-[var(--organic-primary)]/30">
              <span className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition duration-300 ${active ? 'border-[var(--organic-primary)] bg-[var(--organic-primary)] text-[#FFF9EF] shadow-[0_12px_24px_rgba(84,92,58,.28)]' : 'border-[#D8CBAF] bg-[#FFF9EF] text-[var(--organic-muted)] shadow-[0_6px_14px_rgba(67,56,38,.08)] group-hover:border-[var(--organic-accent)]/55 group-hover:text-[var(--organic-primary)]'}`}>
                <span className="absolute inset-1 rounded-full border border-white/35" />
                <Icon className="h-7 w-7 stroke-[1.45]" />
              </span>
              <span className={`mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] transition ${active ? 'text-[var(--organic-text)]' : 'text-[var(--organic-muted)]'}`}>{category}</span>
              <span className={`mx-auto mt-1 block h-px w-9 transition ${active ? 'bg-[var(--organic-accent)]' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
