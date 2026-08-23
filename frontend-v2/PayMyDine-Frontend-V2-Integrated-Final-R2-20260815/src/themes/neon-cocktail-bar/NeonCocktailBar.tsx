'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Menu, Search, ShoppingCart, Sparkles, Zap } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './NeonCocktailBar.module.css'

export default function NeonCocktailBar() {
  const {
    bootstrap, labels, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/neon-cocktail-bar-hero.webp'
  const rootStyle = {
    background: '#050508', color: '#f7f7fb', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#ff267e', '--pmd-accentText': '#fff', '--pmd-surface': '#09090c', '--pmd-soft': '#121218',
    '--pmd-control': '#0e0e14', '--pmd-text': '#f7f7fb', '--pmd-muted': '#a5a3b1', '--pmd-line': 'rgba(255,38,126,.32)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="neon_cocktail_bar">
      <div className={styles.noise} />
      <header className={styles.header}>
        
        <div className={styles.brand}><RestaurantLogo /></div>
        <div className={styles.headerTools}><HeaderValetButton /><LanguageSelect /></div>
      </header>

      <section className={styles.hero} data-pmd-theme-hero="true">
        {hero && <img src={hero} alt="" width={1200} height={720} />}
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <span>{labels.welcomeTo}</span>
          <h1>{bootstrap.restaurant.name}</h1>
          <p>{labels.browseOrderEnjoy}</p>
        </div>
        <Zap className={styles.zap} />
      </section>

      <section className={styles.commandBar}>
        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
        
      </section>

      <nav className={styles.categories}>
        <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
        {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
      </nav>

      <section className={styles.grid}>
        {visibleItems.map((item, index) => (
          <article className={styles.card} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
            <button className={styles.image} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={480} height={440} loading={index < 2 ? 'eager' : 'lazy'} />}</button>
            <div className={styles.cardGlow} />
            <div className={styles.cardBody}>
              <span className={styles.index}>{String(index + 1).padStart(2,'0')}</span>
              <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
              <p>{item.description}</p>
              <DietaryBadges item={item} compact />
              <div className={styles.cardBottom}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.promise}><Sparkles /><div><strong>Future is yours tonight.</strong><span>{activeOrder?.statusName || activeOrder?.status || labels.pending}</span></div></section>
      <div className={styles.social}><SocialLinks /></div>
      <PlatformFooter />

      
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
