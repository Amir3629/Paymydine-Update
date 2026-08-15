'use client'

import type { CSSProperties } from 'react'
import { Beef, Bell, ChevronRight, Flame, Menu, Phone, Search, ShoppingBag, Sparkles, StickyNote } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './EmberSteakhouse.module.css'

export default function EmberSteakhouse() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, openService, openCart, openCheckout, cartCount,
    cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || featuredItems.find((item) => /steak|grill|beef/i.test(`${item.name} ${item.categoryName}`))?.imageUrl || featuredItems[0]?.imageUrl || visibleItems[0]?.imageUrl
  const rootStyle = {
    background: '#0c0c0b', color: '#f5eadb', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#c36a35', '--pmd-accentText': '#fff6e9', '--pmd-surface': '#161514', '--pmd-soft': '#221f1c',
    '--pmd-control': '#121110', '--pmd-text': '#f5eadb', '--pmd-muted': '#aa9986', '--pmd-line': 'rgba(195,106,53,.32)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="ember_steakhouse">
      <div className={styles.smoke} aria-hidden="true" />
      <header className={styles.header}>
        <button className={styles.iconButton} type="button" onClick={() => openCheckout()} aria-label={labels.menu}><Menu /></button>
        <div className={styles.brand}><RestaurantLogo /><small>Wood · fire · prime cuts</small></div>
        <div className={styles.headerTools}><LanguageSelect /><button className={styles.iconButton} type="button" onClick={() => openCart()} aria-label={labels.cart}><ShoppingBag /><b>{cartCount}</b></button></div>
      </header>

      <section className={styles.hero}>
        {hero && <img src={hero} alt="" width={1400} height={900} />}
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <span><Flame />Live fire dining</span>
          <h1>{bootstrap.restaurant.name}</h1>
          <p>{bootstrap.restaurant.description || 'Prime cuts, ember-roasted vegetables and the patience of a real charcoal fire.'}</p>
          <div className={styles.heroMeta}>
            {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
            <small>Open flame · dry aged · seasonal sides</small>
          </div>
        </div>
        <div className={styles.temperature}><Sparkles /><strong>900°</strong><small>charcoal hearth</small></div>
      </section>

      <section className={styles.serviceBar}>
        {bootstrap.features.callRestaurant && bootstrap.restaurant.phone && <a href={`tel:${bootstrap.restaurant.phone}`}><Phone /><span>{labels.callRestaurant}<small>{bootstrap.restaurant.phone}</small></span><ChevronRight /></a>}
        {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell /><span>{labels.callWaiter}<small>{labels.service}</small></span><ChevronRight /></button>}
        <button type="button" onClick={() => openCheckout()}><Flame /><span>{labels.tableOrder}<small>{activeOrder?.statusName || activeOrder?.status || labels.pending}</small></span><ChevronRight /></button>
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
          <article className={styles.card} key={item.id}>
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

      <nav className={styles.dock}>
        {bootstrap.features.tableNotes && <button type="button" onClick={() => openService('note')}><StickyNote /><span>{labels.leaveNote}</span></button>}
        <button type="button" onClick={() => openCheckout()}><Flame /><span>{labels.tableOrder}</span><b>{activeOrder?.items.length || 0}</b></button>
        <button className={styles.cart} type="button" onClick={() => openCart()}><ShoppingBag /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </nav>
      <RuntimeOverlays />
    </main>
  )
}
