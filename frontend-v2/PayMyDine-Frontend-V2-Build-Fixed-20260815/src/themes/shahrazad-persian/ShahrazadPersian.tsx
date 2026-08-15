'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Crown, Menu, Phone, Search, ShoppingBag, Sparkles, StickyNote } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { CategoryGlyph, DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './ShahrazadPersian.module.css'

export default function ShahrazadPersian() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    search, setSearch, openItem, openService, openCart, openCheckout, cartCount, cartSubtotal,
    activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const rootStyle = {
    background: '#1b090b', color: '#f9e7bd', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#d9ad55', '--pmd-accentText': '#28100f', '--pmd-surface': '#311113', '--pmd-soft': '#45181a',
    '--pmd-control': '#270d0f', '--pmd-text': '#f9e7bd', '--pmd-muted': '#c8a983', '--pmd-line': 'rgba(217,173,85,.44)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="shahrazad_persian">
      <div className={styles.archTop} />
      <header className={styles.header}>
        <button className={styles.round} type="button" onClick={() => openCheckout()}><Menu /></button>
        <div className={styles.brand}><Crown /><RestaurantLogo /><span>Persian Fine Dining</span></div>
        <div className={styles.headerRight}><LanguageSelect /><button className={styles.round} type="button" onClick={() => openCart()}><ShoppingBag /><b>{cartCount}</b></button></div>
      </header>

      <section className={styles.hero}>
        <span className={styles.archLeft} /><span className={styles.archRight} />
        <Sparkles />
        <h1>{bootstrap.restaurant.name}</h1>
        <h2>Persian Fine Dining</h2>
        <p>{bootstrap.restaurant.description || 'A taste of Persia. A legacy of hospitality.'}</p>
        {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
      </section>

      <section className={styles.phonePanel}>
        {bootstrap.restaurant.phone ? <a href={`tel:${bootstrap.restaurant.phone}`}><Phone /><span><small>{labels.callRestaurant}</small><strong>{bootstrap.restaurant.phone}</strong></span></a> : <span />}
        {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell />{labels.callWaiter}</button>}
        {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car />{labels.valet}</button>}
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
            <article className={styles.item} key={item.id}>
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

      <aside className={styles.dock}>
        {bootstrap.features.tableNotes && <button type="button" onClick={() => openService('note')}><StickyNote /><span>{labels.leaveNote}</span></button>}
        <button type="button" onClick={() => openCheckout()}><Crown /><span>{labels.tableOrder}</span><b>{activeOrder?.items.length || 0}</b></button>
        <button className={styles.cart} type="button" onClick={() => openCart()}><ShoppingBag /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </aside>
      <div className={styles.social}><SocialLinks /></div>
      <PlatformFooter />
      <RuntimeOverlays />
    </main>
  )
}
