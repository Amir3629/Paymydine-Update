'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, Crown, Menu, Search, ShoppingBag, Sparkles } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './ArtDecoSpeakeasy.module.css'

export default function ArtDecoSpeakeasy() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    search, setSearch, openItem, openService, openCart, openCheckout, cartCount, cartSubtotal,
    activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const rootStyle = {
    background: '#050807', color: '#f4e9c7', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#d1a848', '--pmd-accentText': '#080b0a', '--pmd-surface': '#0c1110', '--pmd-soft': '#131b18',
    '--pmd-control': '#0a0f0e', '--pmd-text': '#f4e9c7', '--pmd-muted': '#a49368', '--pmd-line': 'rgba(209,168,72,.38)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="art_deco_speakeasy">
      <div className={styles.outerFrame}>
        <header className={styles.header}>
          <button className={styles.decoButton} type="button" onClick={() => openCheckout()}><Menu /></button>
          <div className={styles.brand}><Crown /><RestaurantLogo /><span>Fine spirits · late evenings</span></div>
          <div className={styles.headerActions}><LanguageSelect /><button className={styles.decoButton} type="button" onClick={() => openCart()}><ShoppingBag /><b>{cartCount}</b></button></div>
        </header>

        <section className={styles.hero}>
          <span className={styles.cornerA} /><span className={styles.cornerB} />
          <Sparkles className={styles.sparkle} />
          <div className={styles.heroCopy}>
            <small>Tonight at</small>
            <h1>{bootstrap.restaurant.name}</h1>
            <div className={styles.divider}><i /><b>◆</b><i /></div>
            <p>{bootstrap.restaurant.description || "Let's misbehave — rare spirits, beautiful plates and live hospitality."}</p>
            {tableDisplay && <span>{labels.table} {tableDisplay}</span>}
          </div>
          <div className={styles.heroActions}>
            {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell />{labels.callWaiter}</button>}
            {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car />{labels.valet}</button>}
          </div>
        </section>

        <section className={styles.command}>
          <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>
          <nav className={styles.categories}>
            <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
            {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
          </nav>
        </section>

        <section className={styles.menu}>
          {visibleItems.map((item, index) => (
            <article className={styles.item} key={item.id}>
              <span className={styles.itemIndex}>{String(index + 1).padStart(2,'0')}</span>
              <button className={styles.image} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={520} height={400} loading="lazy" />}</button>
              <div className={styles.copy}>
                <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
                <div className={styles.miniDivider}><i /><b>◆</b><i /></div>
                <p>{item.description}</p>
                <DietaryBadges item={item} compact />
                <div className={styles.bottom}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
              </div>
            </article>
          ))}
        </section>

        <aside className={styles.serviceStrip}>
          <div><small>{labels.orderStatus}</small><strong>{activeOrder?.statusName || activeOrder?.status || labels.pending}</strong></div>
          <button type="button" onClick={() => openCheckout()}><Crown />{labels.tableOrder}</button>
          <button className={styles.cart} type="button" onClick={() => openCart()}><ShoppingBag />{formatCurrency(cartSubtotal)}<b>{cartCount}</b></button>
        </aside>

        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>
      <RuntimeOverlays />
    </main>
  )
}
