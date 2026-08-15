'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, MapPin, Search, ShoppingBag, Utensils } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './VerdantModern.module.css'

export default function VerdantModern() {
  const {
    bootstrap, labels, tableDisplay, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, openService, openCart, openCheckout, cartCount,
    activeOrder, cartSubtotal, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || featuredItems[0]?.imageUrl
  const rootStyle = {
    background: '#03100c', color: '#f3fff9', minHeight: '100dvh', colorScheme: 'dark',
    '--pmd-accent': '#32d596', '--pmd-accentText': '#03110d', '--pmd-surface': '#0d1b17',
    '--pmd-soft': '#12231e', '--pmd-control': '#10201b', '--pmd-text': '#f3fff9',
    '--pmd-muted': '#9eb9ae', '--pmd-line': 'rgba(132,211,181,.18)',
  } as CSSProperties

  const favorites = featuredItems.length ? featuredItems : visibleItems.slice(0, 2)

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="verdant_modern">
      <div className={styles.shell}>
        <header className={styles.header}>
          <RestaurantLogo />
          <div className={styles.headerTools}>
            {tableDisplay && <span className={styles.pill}><MapPin />{labels.table} {tableDisplay}</span>}
            <LanguageSelect />
            {bootstrap.features.valet && <button className={styles.pillButton} type="button" onClick={() => openService('valet')}><Car />{labels.valet}</button>}
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span>Welcome to {bootstrap.restaurant.name}</span>
            <h1>Modern dining<br />made <em>effortless.</em></h1>
            <p>{bootstrap.restaurant.description || 'Browse the menu, order from your table, and pay whenever you are ready.'}</p>
            <div className={styles.heroService}>
              {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell />{labels.callWaiter}</button>}
            </div>
          </div>
          <div className={styles.heroImage}>{hero && <img src={hero} alt="" width={500} height={500} />}</div>
        </section>

        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>

        <nav className={styles.categories} aria-label="Categories">
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
        </nav>

        {bootstrap.menu.highlights.showChefRecommendations && favorites.length > 0 && selectedCategory === 'all' && !search && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}><h2>{bootstrap.menu.highlights.chefTitle}</h2><span>Hand-picked by the kitchen</span></div>
            <div className={styles.favoriteGrid}>
              {favorites.slice(0, 3).map((item) => (
                <article className={styles.favorite} key={item.id}>
                  <button type="button" className={styles.favoriteImage} onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={220} height={220} />}</button>
                  <div><button className={styles.itemName} type="button" onClick={() => openItem(item)}>{item.name}</button><p>{item.description}</p><DietaryBadges item={item} compact /><strong>{formatCurrency(item.price)}</strong></div>
                  <QuickAddButton item={item} />
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionTitle}><h2>{selectedCategory === 'all' ? labels.menu : categories.find((category) => category.id === selectedCategory)?.name}</h2><span>{visibleItems.length} items</span></div>
          <div className={styles.menuList}>
            {visibleItems.map((item) => (
              <article className={styles.menuItem} key={item.id}>
                <button type="button" className={styles.menuImage} onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={220} height={180} loading="lazy" />}</button>
                <div className={styles.menuCopy}><button className={styles.itemName} type="button" onClick={() => openItem(item)}>{item.name}</button><p>{item.description}</p><DietaryBadges item={item} compact /><strong>{formatCurrency(item.price)}</strong></div>
                <QuickAddButton item={item} />
              </article>
            ))}
          </div>
        </section>

        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>

      <nav className={styles.dock} aria-label="Order actions">
        {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell /><span>{labels.callWaiter}</span></button>}
        <button type="button" onClick={() => openCheckout()}><Utensils /><span>{labels.tableOrder}</span><b>{activeOrder?.items.length || 0}</b></button>
        <button className={styles.cartButton} type="button" onClick={() => openCart()}><ShoppingBag /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </nav>
      <RuntimeOverlays />
    </main>
  )
}

