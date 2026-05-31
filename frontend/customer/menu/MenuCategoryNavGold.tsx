export function MenuCategoryNavGold({ categories, selectedCategory, onSelectCategory }: { categories: string[]; selectedCategory: string; onSelectCategory: (category: string) => void }) {
  return (
    <nav className="pmd-customer-menu-cats" aria-label="Menu categories">
      {categories.map((category) => (
        <button key={category} type="button" className="pmd-customer-menu-cat" aria-pressed={selectedCategory === category} onClick={() => onSelectCategory(category)}>{category}</button>
      ))}
    </nav>
  )
}
