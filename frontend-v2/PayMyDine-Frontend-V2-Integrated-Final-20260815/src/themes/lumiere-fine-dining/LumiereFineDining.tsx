'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, ChevronRight, Menu, Search, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { CategoryGlyph, DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './LumiereFineDining.module.css'

export default function LumiereFineDining() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, openService, openCart, openCheckout, cartCount,
    activeOrder, cartSubtotal, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || featuredItems[0]?.imageUrl
  const rootStyle = {
    background: '#f4f1eb', color: '#3d3932', minHeight: '100dvh', colorScheme: 'light',
    '--pmd-accent': '#b99a60', '--pmd-accentText': '#fff', '--pmd-surface': '#fffdf9', '--pmd-soft': '#f7f2e8',
    '--pmd-control': '#fff', '--pmd-text': '#3d3932', '--pmd-muted': '#8e877b', '--pmd-line': 'rgba(185,154,96,.3)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="lumiere_fine_dining">
      <div className={styles.frame}>
        <header className={styles.header}>
          <button className={styles.roundButton} type="button" onClick={() => openCheckout()} aria-label={labels.menu}><Menu /></button>
          <RestaurantLogo showName={false} />
          <div className={styles.headerRight}>
            <LanguageSelect />
            <button className={styles.roundButton} type="button" onClick={() => openCart()} aria-label={labels.cart}><ShoppingBag /><b>{cartCount}</b></button>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.monogram}>L</span>
            <h1>Modern Cuisine.<br />Timeless Moments.</h1>
            <span className={styles.ornament}>◇</span>
            <p>{bootstrap.restaurant.description || 'Crafted with seasonal ingredients and care.'}</p>
            {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
          </div>
          <div className={styles.heroVisual}>{hero && <img src={hero} alt="" width={900} height={680} />}</div>
        </section>

        <section className={styles.actions}>
          {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell /><span><small>{labels.service}</small><strong>{labels.callWaiter}</strong></span><ChevronRight /></button>}
          {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car /><span><small>{labels.service}</small><strong>{labels.valet}</strong></span><ChevronRight /></button>}
        </section>

        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>

        <nav className={styles.categories} aria-label="Categories">
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}><span><CategoryGlyph name="all" size={28} /></span><small>{labels.all}</small></button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}><span><CategoryGlyph name={category.name} size={28} /></span><small>{category.name}</small></button>)}
        </nav>

        <section className={styles.menuSection}>
          {visibleItems.map((item) => (
            <article className={styles.item} key={item.id}>
              <button className={styles.image} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={320} height={240} loading="lazy" />}</button>
              <div className={styles.copy}>
                <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
                <p>{item.description}</p>
                <DietaryBadges item={item} compact />
              </div>
              <div className={styles.price}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
            </article>
          ))}
        </section>

        <section className={styles.bottomService}>
          <div><small>{labels.tableOrder}</small><strong>{activeOrder?.statusName || activeOrder?.status || labels.pending}</strong></div>
          <button className={styles.orderButton} type="button" onClick={() => openCheckout()}><ShoppingBag />{formatCurrency(cartSubtotal)}<b>{cartCount}</b></button>
        </section>

        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>
      <RuntimeOverlays />
    </main>
  )
}
