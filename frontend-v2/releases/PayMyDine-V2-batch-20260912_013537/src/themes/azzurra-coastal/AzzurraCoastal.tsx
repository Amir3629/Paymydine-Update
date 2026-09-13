'use client'

import type { CSSProperties } from 'react'
import { Bell, Car, MapPin, Menu, Search, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { ResponsiveRestaurantName } from '@/src/runtime/components/ResponsiveRestaurantName'
import { DietaryBadges, LanguageSelect, PlatformFooter, QuickAddButton, RestaurantLogo, SocialLinks, HeaderValetButton } from '@/src/runtime/components/SharedPieces'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import { ThemeBottomToolBar } from '@/src/runtime/components/ThemeBottomToolBar'
import styles from './AzzurraCoastal.module.css'

export default function AzzurraCoastal() {
  const {
    bootstrap, labels, categories, selectedCategory, setSelectedCategory, visibleItems,
    featuredItems, search, setSearch, openItem, cartSubtotal, activeOrder, formatCurrency, direction,
  } = useMenuRuntime()
  const hero = bootstrap.restaurant.heroImageUrl || '/theme-heroes/azzurra-coastal-hero.webp'
  const rootStyle = {
    background: '#eef4f7', color: '#173a55', minHeight: '100dvh', colorScheme: 'light',
    '--pmd-accent': '#0f5f91', '--pmd-accentText': '#fff', '--pmd-surface': '#fffdf8', '--pmd-soft': '#edf4f8',
    '--pmd-control': '#fff', '--pmd-text': '#173a55', '--pmd-muted': '#6b8090', '--pmd-line': 'rgba(15,95,145,.22)',
  } as CSSProperties

  return (
    <main className={styles.root} style={rootStyle} dir={direction} data-theme-id="azzurra_coastal">
      <div className={styles.shell}>
        <header className={styles.header}>
          <RestaurantLogo showName={false} />
          <div className={styles.headerTools}>
            <HeaderValetButton /><LanguageSelect />
            
          </div>
        </header>

        <section className={styles.hero} data-pmd-theme-hero="true">
          {hero && <img src={hero} alt="" width={1200} height={700} />}
          <div className={styles.waveOne} />
          <div className={styles.waveTwo} />
          <div className={styles.heroCopy}>
            <span>{labels.welcomeTo}</span>
            <ResponsiveRestaurantName />
            <p>{labels.browseOrderEnjoy}</p>
          </div>
        </section>

        

        <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>

        <nav className={styles.categories}>
          <button className={selectedCategory === 'all' ? styles.active : ''} type="button" onClick={() => setSelectedCategory('all')}>{labels.all}</button>
          {categories.map((category) => <button key={category.id} className={selectedCategory === category.id ? styles.active : ''} type="button" onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}
        </nav>

        <section className={styles.menuGrid}>
          {visibleItems.map((item) => (
            <article className={styles.card} key={item.id} onClick={() => openItem(item)} data-pmd-menu-card="true">
              <button className={styles.image} type="button" onClick={() => openItem(item)}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} width={500} height={360} loading="lazy" />}</button>
              <div className={styles.cardBody}>
                <button className={styles.name} type="button" onClick={() => openItem(item)}>{item.name}</button>
                <p>{item.description}</p>
                <DietaryBadges item={item} compact />
                <div className={styles.cardBottom}><strong>{formatCurrency(item.price)}</strong><QuickAddButton item={item} /></div>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.coastNote}>
          <MapPin /><div><strong>Dine by the sea. Wherever you are.</strong><span>{bootstrap.restaurant.address || 'We bring the coast to your table.'}</span></div>
        </section>
        <div className={styles.social}><SocialLinks /></div>
        <PlatformFooter />
      </div>

      
      
      <ThemeBottomToolBar className={styles.dock} primaryClassName={styles.dockPrimary} />
      <RuntimeOverlays />
    </main>
  )
}
