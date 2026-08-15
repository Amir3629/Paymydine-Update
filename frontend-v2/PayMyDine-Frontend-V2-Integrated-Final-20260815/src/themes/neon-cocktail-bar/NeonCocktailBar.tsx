'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Menu, Search, ShoppingCart, Sparkles, Zap } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './NeonCocktailBar.module.css'

export default function NeonCocktailBar() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, openService, openCart, openCheckout, cartCount,
    cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || featuredItems[0]?.imageUrl
  const rootStyle = {
    background: '#050508', color: '#f7f7fb', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#ff267e', '--pmd-accentText': '#fff', '--pmd-surface': '#09090c', '--pmd-soft': '#121218',
    '--pmd-control': '#0e0e14', '--pmd-text': '#f7f7fb', '--pmd-muted': '#a5a3b1', '--pmd-line': 'rgba(255,38,126,.32)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="neon_cocktail_bar">
      <div className={styles.noise} />
      <header className={styles.header}>
        <button className={styles.headerButton} type="button" onClick={() => openCheckout()}><Menu /></button>
        <div className={styles.brand}><RestaurantLogo /><span>Berlin · after dark</span></div>
        <div className={styles.headerTools}><LanguageSelect /><button className={styles.headerButton} type="button" onClick={() => openCart()}><ShoppingCart /><b>{cartCount}</b></button></div>
      </header>

      <section className={styles.hero}>
        {hero && <img src={hero} alt="" width={1200} height={720} />}
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <span>Welcome to</span>
          <h1>{bootstrap.restaurant.name}</h1>
          <p>{bootstrap.restaurant.description || 'Good drinks. Great music. Bad decisions.'}</p>
          {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
        </div>
        <Zap className={styles.zap} />
      </section>

      <section className={styles.commandBar}>
        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
        <div className={styles.services}>
          {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell />{labels.callWaiter}</button>}
          {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car />{labels.valet}</button>}
        </div>
      </section>

      <nav className={styles.categories}>
        <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
        {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
      </nav>

      <section className={styles.grid}>
        {visibleItems.map((item, index) => (
          <article className={styles.card} key={item.id}>
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

      <nav className={styles.dock}>
        <button type="button" onClick={() => openCheckout()}><Sparkles /><span>{labels.tableOrder}</span><b>{activeOrder?.items.length || 0}</b></button>
        <button className={styles.cartAction} type="button" onClick={() => openCart()}><ShoppingCart /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </nav>
      <RuntimeOverlays />
    </main>
  )
}
