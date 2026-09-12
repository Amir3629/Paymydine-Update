'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Bell, Car, ChevronDown, Menu, Search, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { ResponsiveRestaurantName } from '@/src/runtime/components/ResponsiveRestaurantName'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './KazenJapanese.module.css'

export default function KazenJapanese() {
  const {
    bootstrap, labels, categories, search, setSearch, openItem, cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const [openCategory, setOpenCategory] = useState(categories[0]?.id || '')
  const rootStyle = {
    background: '#f5f1eb', color: '#25231f', minHeight: '100dvh', colorScheme: 'light',
    '--pmd-accent': '#b5413f', '--pmd-accentText': '#fff', '--pmd-surface': '#fbf8f3', '--pmd-soft': '#f1ece4',
    '--pmd-control': '#fffdf9', '--pmd-text': '#25231f', '--pmd-muted': '#777168', '--pmd-line': 'rgba(37,35,31,.16)',
  } as CSSProperties
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/kazen-japanese-hero.webp'
  const grouped = useMemo(() => categories.map((category) => ({
    category,
    items: bootstrap.menu.items.filter((item) => item.available && (item.categoryId === category.id || item.categoryName.toLowerCase() === category.name.toLowerCase()))
      .filter((item) => !search.trim() || `${item.name} ${item.description} ${item.allergens.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())),
  })).filter((group) => group.items.length), [bootstrap.menu.items, categories, search])

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="kazen_japanese">
      <header className={styles.header}>
        <div className={styles.brand}><RestaurantLogo showName={false} /></div>
        <div className={styles.headerActions}>
          <HeaderValetButton /><LanguageSelect />
          
          
        </div>
      </header>

      <section className={styles.hero} data-pmd-theme-hero="true">
        {hero && <img src={hero} alt="" width={1200} height={720} />}
        <div className={styles.heroCopy}>
          <span className={styles.heroWelcome}>{labels.welcomeTo}</span>
          <ResponsiveRestaurantName />
          <p>{labels.browseOrderEnjoy}</p>
        </div>
      </section>

      <div className={styles.content}>

        

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
                      <div className={styles.item} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
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

      
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
