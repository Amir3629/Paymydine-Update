'use client'

import type { CSSProperties } from 'react'
import { Beef, Bell, Car, ChevronRight, Menu, Search, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './EmberSteakhouse.module.css'

export default function EmberSteakhouse() {
  const {
    bootstrap, labels, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/ember-steakhouse-hero.webp'
  const rootStyle = {
    background: '#0c0c0b', color: '#f5eadb', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#c36a35', '--pmd-accentText': '#fff6e9', '--pmd-surface': '#161514', '--pmd-soft': '#221f1c',
    '--pmd-control': '#121110', '--pmd-text': '#f5eadb', '--pmd-muted': '#aa9986', '--pmd-line': 'rgba(195,106,53,.32)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="ember_steakhouse">
      <div className={styles.smoke} aria-hidden="true" />
      <header className={styles.header}>
        
        <div className={styles.brand}><RestaurantLogo /></div>
        <div className={styles.headerTools}><HeaderValetButton /><LanguageSelect /></div>
      </header>

      <section className={styles.hero} data-pmd-theme-hero="true">
        {hero && <img src={hero} alt="" width={1400} height={900} />}
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <span>{labels.welcomeTo}</span>
          <h1>{bootstrap.restaurant.name}</h1>
          <p>{labels.browseOrderEnjoy}</p>
        </div>
      </section>

      

      <section className={styles.command}>
        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
        <nav className={styles.categories}>
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
        </nav>
      </section>

      <section className={styles.menuGrid}>
        {visibleItems.map((item, index) => (
          <article className={styles.card} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
            <button className={styles.image} type="button" onClick={() => openItem(item)}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} width={640} height={460} loading={index < 2 ? 'eager' : 'lazy'} />}
              <span className={styles.grillMark} aria-hidden="true" />
            </button>
            <div className={styles.cardBody}>
              <div className={styles.titleRow}><span>{String(index + 1).padStart(2, '0')}</span><button type="button" onClick={() => openItem(item)}>{item.name}</button></div>
              <p>{item.description}</p>
              <DietaryBadges item={item} compact />
              <div className={styles.details}>
                <span>{item.prepTimeMinutes ? `${item.prepTimeMinutes} min` : 'Fire finished'}</span>
                <strong>{formatCurrency(item.price)}</strong>
                <QuickAddButton item={item} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.signature}>
        <Beef /><div><small>THE EMBER STANDARD</small><strong>Carefully sourced. Properly rested. Cut to order.</strong></div>
      </section>
      <div className={styles.social}><SocialLinks /></div>
      <PlatformFooter />

      
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
