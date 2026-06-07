'use client'

import { CakeSlice, Leaf, Soup, Sprout, Utensils } from 'lucide-react'

const icons = [Leaf, Utensils, Sprout, Soup, CakeSlice]

export function OrganicBotanicalCategoryNav({ categories, selectedCategory, onSelectCategory }: { categories: string[]; selectedCategory: string; onSelectCategory: (category: string) => void }) {
  return (
    <nav className="relative -mt-1 mb-7 overflow-x-auto px-4 pb-2" aria-label="Menu categories">
      <div className="mx-auto flex max-w-4xl gap-4 md:justify-center">
        {categories.map((category, index) => {
          const active = selectedCategory === category
          const Icon = icons[index % icons.length]
          return (
            <button key={category} type="button" onClick={() => onSelectCategory(category)} className="min-w-[78px] text-center focus:outline-none">
              <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border transition ${active ? 'border-[var(--organic-primary)] bg-[var(--organic-primary)] text-[#FFF9EF] shadow-md' : 'border-[#D8CBAF] bg-[#FFF9EF]/80 text-[var(--organic-muted)]'}`}>
                <Icon className="h-7 w-7" />
              </span>
              <span className={`mt-2 block text-[11px] font-semibold uppercase tracking-[0.14em] ${active ? 'text-[var(--organic-text)]' : 'text-[var(--organic-muted)]'}`}>{category}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
