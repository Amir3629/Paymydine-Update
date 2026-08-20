'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Crown, Menu, Search, ShoppingBag, Sparkles } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { CategoryGlyph, DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './ShahrazadPersian.module.css'

export default function ShahrazadPersian() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    search, setSearch, openItem, cartSubtotal,
    activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/shahrazad-persian-hero.webp'
  const rootStyle = {
    background: '#1b090b', color: '#f9e7bd', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#d9ad55', '--pmd-accentText': '#28100f', '--pmd-surface': '#311113', '--pmd-soft': '#45181a',
    '--pmd-control': '#270d0f', '--pmd-text': '#f9e7bd', '--pmd-muted': '#c8a983', '--pmd-line': 'rgba(217,173,85,.44)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="shahrazad_persian">
      <div className={styles.archTop} />
      <header className={styles.header}>
        
        <div className={styles.brand}><Crown /><RestaurantLogo /><span>Persian Fine Dining</span></div>
        <div className={styles.headerRight}><HeaderValetButton /><LanguageSelect /></div>
      </header>

      <section className={styles.hero}>
        <img className={styles.heroBackground} src={hero} alt="" width={1672} height={941} loading="eager" />
        <div className={styles.heroVeil} />
        <span className={styles.archLeft} /><span className={styles.archRight} />
        <Sparkles />
        <h1>{bootstrap.restaurant.name}</h1>
        <h2>Persian Fine Dining</h2>
        <p>{bootstrap.restaurant.description || 'A taste of Persia. A legacy of hospitality.'}</p>
        {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
      </section>

      

      <section className={styles.menuFrame}>
        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
        <nav className={styles.categories}>
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}><CategoryGlyph name="all" size={28} /><span>{labels.all}</span></button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}><CategoryGlyph name={category.name} size={28} /><span>{category.name}</span></button>)}
        </nav>

        <div className={styles.title}><i /><span>Our signature dishes</span><i /></div>
        <section className={styles.items}>
          {visibleItems.map((item) => (
            <article className={styles.item} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
              <button className={styles.image} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={500} height={340} loading="lazy" />}</button>
              <div className={styles.copy}>
                <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
                <p>{item.description}</p>
                <DietaryBadges item={item} compact />
                <strong>{formatCurrency(item.price)}</strong>
              </div>
              <QuickAddButton item={item} />
            </article>
          ))}
        </section>
      </section>

      
      <div className={styles.social}><SocialLinks /></div>
      <PlatformFooter />
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
