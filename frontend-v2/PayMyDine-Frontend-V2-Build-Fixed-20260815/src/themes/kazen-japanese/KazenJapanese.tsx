'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Bell, Car, ChevronDown, Menu, Phone, Search, ShoppingBag, StickyNote } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './KazenJapanese.module.css'

export default function KazenJapanese() {
  const {
    bootstrap, labels, tableDisplay, categories, search, setSearch, openItem, openService,
    openCart, openCheckout, cartCount, cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const [openCategory, setOpenCategory] = useState(categories[0]?.id || '')
  const rootStyle = {
    background: '#f5f1eb', color: '#25231f', minHeight: '100dvh', colorScheme: 'light',
    '--pmd-accent': '#b5413f', '--pmd-accentText': '#fff', '--pmd-surface': '#fbf8f3', '--pmd-soft': '#f1ece4',
    '--pmd-control': '#fffdf9', '--pmd-text': '#25231f', '--pmd-muted': '#777168', '--pmd-line': 'rgba(37,35,31,.16)',
  } as CSSProperties
  const hero = bootstrap.restaurant.heroImageUrl || bootstrap.menu.items[0]?.imageUrl
  const grouped = useMemo(() => categories.map((category) => ({
    category,
    items: bootstrap.menu.items.filter((item) => item.available && (item.categoryId === category.id || item.categoryName.toLowerCase() === category.name.toLowerCase()))
      .filter((item) => !search.trim() || `${item.name} ${item.description} ${item.allergens.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())),
  })).filter((group) => group.items.length), [bootstrap.menu.items, categories, search])

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="kazen_japanese">
      <header className={styles.header}>
        <div className={styles.brand}><RestaurantLogo /><small>Japanese Cuisine</small></div>
        <div className={styles.headerActions}>
          <LanguageSelect />
          <button className={styles.headerButton} type="button" onClick={() => openCart()}><ShoppingBag /><b>{cartCount}</b></button>
          <button className={styles.headerButton} type="button" onClick={() => openCheckout()}><Menu /></button>
        </div>
      </header>

      <section className={styles.hero}>
        {hero && <img src={hero} alt="" width={1200} height={720} />}
        <div className={styles.heroWash} />
        <div className={styles.heroCopy}>
          <span>Purity.</span><span>Season.</span><span>Intention.</span>
          <i>風 然</i>
        </div>
        {tableDisplay && <span className={styles.table}>{labels.table} {tableDisplay}</span>}
      </section>

      <div className={styles.content}>
        {bootstrap.features.callRestaurant && bootstrap.restaurant.phone && (
          <a className={styles.call} href={`tel:${bootstrap.restaurant.phone}`}><Phone /><span>{labels.callRestaurant}</span><b>→</b></a>
        )}

        <div className={styles.serviceRow}>
          {bootstrap.features.waiterCall && <button type="button" onClick={() => openService('waiter')}><Bell />{labels.callWaiter}</button>}
          {bootstrap.features.tableNotes && <button type="button" onClick={() => openService('note')}><StickyNote />{labels.leaveNote}</button>}
          {bootstrap.features.valet && <button type="button" onClick={() => openService('valet')}><Car />{labels.valet}</button>}
        </div>

        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>

        <section className={styles.accordion}>
          {grouped.map(({ category, items }, categoryIndex) => {
            const open = openCategory === category.id || Boolean(search.trim())
            return (
              <article className={styles.category} key={category.id}>
                <button className={styles.categoryButton} type="button" onClick={() => setOpenCategory(open ? '' : category.id)} aria-expanded={open}>
                  <span className={styles.categoryIndex}>{String(categoryIndex + 1).padStart(2, '0')}</span>
                  <span><strong>{category.name}</strong><small>{category.description || `${items.length} selections`}</small></span>
                  <ChevronDown className={open ? styles.rotated : ''} />
                </button>
                {open && (
                  <div className={styles.items}>
                    {items.map((item) => (
                      <div className={styles.item} key={item.id}>
                        <button className={styles.itemImage} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={240} height={180} loading="lazy" />}</button>
                        <div className={styles.itemCopy}><button type="button" onClick={() => openItem(item)}>{item.name}</button><p>{item.description}</p><DietaryBadges item={item} compact /></div>
                        <div className={styles.itemPrice}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>

      <nav className={styles.dock}>
        <button type="button" onClick={() => openCheckout()}><span>{labels.tableOrder}</span><small>{activeOrder?.statusName || activeOrder?.status || labels.pending}</small></button>
        <button className={styles.cart} type="button" onClick={() => openCart()}><ShoppingBag /><span>{formatCurrency(cartSubtotal)}</span><b>{cartCount}</b></button>
      </nav>
      <RuntimeOverlays />
    </main>
  )
}
