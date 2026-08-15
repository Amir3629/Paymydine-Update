'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, ChevronRight, Flame, Menu, Phone, Search, ShoppingBag, StickyNote, UtensilsCrossed } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { CategoryGlyph, DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './AnatoliaTurkish.module.css'

export default function AnatoliaTurkish() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, openService, openCart, openCheckout, cartCount,
    cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || featuredItems[0]?.imageUrl || visibleItems[0]?.imageUrl
  const rootStyle = {
    background: '#f4ead9', color: '#34251f', minHeight: '100dvh', colorScheme: 'light',
    '--pmd-accent': '#bd5b3f', '--pmd-accentText': '#fff9ef', '--pmd-surface': '#fff9ef', '--pmd-soft': '#f3e8d6',
    '--pmd-control': '#fffdf8', '--pmd-text': '#34251f', '--pmd-muted': '#79675e', '--pmd-line': 'rgba(35,91,108,.22)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="anatolia_turkish">
      <div className={styles.tileBackdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <button className={styles.roundButton} type="button" onClick={() => openCheckout()} aria-label={labels.menu}><Menu /></button>
          <div className={styles.brand}><RestaurantLogo /><small>Anatolian kitchen · fire & hospitality</small></div>
          <div className={styles.headerTools}>
            <LanguageSelect />
            <button className={styles.roundButton} type="button" onClick={() => openCart()} aria-label={labels.cart}><ShoppingBag /><b>{cartCount}</b></button>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Sofraya hoş geldiniz</span>
            <h1>{bootstrap.restaurant.name}</h1>
            <p>{bootstrap.restaurant.description || 'Anatolian recipes, charcoal fire and a table made for sharing.'}</p>
            {tableDisplay && <small>{labels.table} {tableDisplay}</small>}
          </div>
          <div className={styles.heroImage}>
            {hero && <img src={hero} alt="" width={900} height={680} />}
            <span className={styles.sunSeal}><Flame />Ocakbaşı</span>
          </div>
        </section>

        <section className={styles.serviceRibbon}>
          {bootstrap.features.callRestaurant && bootstrap.restaurant.phone && (
            <a href={`tel:${bootstrap.restaurant.phone}`}><Phone /><span><small>{labels.callRestaurant}</small><strong>{bootstrap.restaurant.phone}</strong></span><ChevronRight /></a>
          )}
          {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell /><span><small>{labels.service}</small><strong>{labels.callWaiter}</strong></span><ChevronRight /></button>}
          {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car /><span><small>{labels.service}</small><strong>{labels.valet}</strong></span><ChevronRight /></button>}
        </section>

        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>

        <nav className={styles.categories} aria-label="Categories">
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}><CategoryGlyph name="all" size={28} /><span>{labels.all}</span></button>
          {categories.map((category) => (
            <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>
              <CategoryGlyph name={category.name} size={28} /><span>{category.name}</span>
            </button>
          ))}
        </nav>

        <section className={styles.menuList}>
          {visibleItems.map((item, index) => (
            <article className={styles.item} key={item.id}>
              <button className={styles.image} type="button" onClick={() => openItem(item)}>
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} width={520} height={360} loading={index < 2 ? 'eager' : 'lazy'} />}
              </button>
              <div className={styles.copy}>
                <span className={styles.itemIndex}>{String(index + 1).padStart(2, '0')}</span>
                <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
                <p>{item.description}</p>
                <DietaryBadges item={item} compact />
                <div className={styles.bottom}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.tableStory}>
          <UtensilsCrossed />
          <div><strong>Shared plates. Warm bread. Long conversations.</strong><span>{bootstrap.restaurant.address || 'An Anatolian table, wherever you are.'}</span></div>
        </section>

        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>

      <nav className={styles.dock}>
        {bootstrap.features.tableNotes && <button type="button" onClick={() => openService('note')}><StickyNote /><span>{labels.leaveNote}</span></button>}
        <button type="button" onClick={() => openCheckout()}><Flame /><span>{labels.tableOrder}</span><b>{activeOrder?.items.length || 0}</b></button>
        <button className={styles.cart} type="button" onClick={() => openCart()}><ShoppingBag /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </nav>
      <RuntimeOverlays />
    </main>
  )
}
