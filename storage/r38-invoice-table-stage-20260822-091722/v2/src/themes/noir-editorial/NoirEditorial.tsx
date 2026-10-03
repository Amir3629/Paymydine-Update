'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Menu, ReceiptText, Search, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './NoirEditorial.module.css'

export default function NoirEditorial() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory,
    visibleItems, featuredItems, search, setSearch, openItem, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/noir-editorial-hero.webp'
  const rootStyle = {
    background: '#050505', color: '#f4f3ef', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#f2f0ea',
    '--pmd-accentText': '#050505',
    '--pmd-surface': '#101010',
    '--pmd-soft': '#171717',
    '--pmd-control': '#0d0d0d',
    '--pmd-text': '#f4f3ef',
    '--pmd-muted': '#a5a39d',
    '--pmd-line': 'rgba(255,255,255,.18)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="noir_editorial">
      <header className={styles.header}>
        <RestaurantLogo />
        <div className={styles.headerActions}>
          {tableDisplay && <span className={styles.table}>{labels.table} {tableDisplay}</span>}
          <HeaderValetButton /><LanguageSelect />
          
          
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>A culinary experience beyond the expected.</span>
          <h1>Taste<br />the<br /><em>unseen</em></h1>
          <p>{bootstrap.restaurant.description || 'Seasonal menus, precise hospitality and a table designed around you.'}</p>
          
        </div>
        <div className={styles.heroVisual}>
          {hero && <img src={hero} alt="" width={900} height={1200} />}
          <span className={styles.heroMark}>X</span>
        </div>
      </section>

      <section className={styles.discovery}>
        <div className={styles.discoveryHead}>
          <div><span className={styles.eyebrow}>Explore the menu</span><h2>{labels.menu}</h2></div>
          <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
        </div>
        <nav className={styles.categories} aria-label="Categories">
          <button className={selectedCategory === 'all' ? styles.categoryActive : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.categoryActive : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
        </nav>
      </section>

      <section className={styles.items}>
        {visibleItems.map((item, index) => (
          <article className={`${styles.item} ${index % 2 ? styles.itemReverse : ''}`} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
            <button className={styles.itemImage} type="button" onClick={() => openItem(item)}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} width={720} height={560} loading={index < 2 ? 'eager' : 'lazy'} />}
              <span>{String(index + 1).padStart(2, '0')}</span>
            </button>
            <div className={styles.itemCopy}>
              <span className={styles.itemNumber}>{String(index + 1).padStart(2, '0')}</span>
              <button className={styles.itemTitle} type="button" onClick={() => openItem(item)}>{item.name}</button>
              <p>{item.description}</p>
              <DietaryBadges item={item} />
              <div className={styles.itemBottom}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
            </div>
          </article>
        ))}
        {!visibleItems.length && <div className={styles.empty}>No menu items match this view.</div>}
      </section>

      

      <div className={styles.social}><SocialLinks /></div>
      <PlatformFooter />
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
