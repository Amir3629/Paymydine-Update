'use client'

import { type CSSProperties } from 'react'
import {
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import type { MenuItem } from '@/src/domain/model'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { RuntimeOverlays } from '@/src/runtime/components/RuntimeOverlays'
import styles from './KioskTerminal.module.css'

type KioskPalette = {
  bg: string
  panel: string
  surface: string
  surfaceStrong: string
  text: string
  muted: string
  border: string
  accent: string
  accentText: string
}

const PALETTES: Record<string, KioskPalette> = {
  noir_editorial: {
    bg: '#11100F', panel: '#171513', surface: '#201D1A', surfaceStrong: '#29241F',
    text: '#F7F1E8', muted: '#B9ADA0', border: '#3A332C', accent: '#E0B56A', accentText: '#15110B',
  },
  verdant_modern: {
    bg: '#0E1713', panel: '#142019', surface: '#1A2920', surfaceStrong: '#213529',
    text: '#F3F8F4', muted: '#A7B8AC', border: '#30463A', accent: '#86D18C', accentText: '#0C1B10',
  },
  lumiere_fine_dining: {
    bg: '#F2EEE6', panel: '#FAF7F0', surface: '#FFFFFF', surfaceStrong: '#ECE5D8',
    text: '#27231E', muted: '#746B60', border: '#D8CEBE', accent: '#9C7845', accentText: '#FFFFFF',
  },
  kazen_japanese: {
    bg: '#F0ECE5', panel: '#F8F5EF', surface: '#FFFCF7', surfaceStrong: '#E9E1D7',
    text: '#28231E', muted: '#756C63', border: '#D8CEC2', accent: '#A73E39', accentText: '#FFFFFF',
  },
  azzurra_coastal: {
    bg: '#EDF4F5', panel: '#F8FCFC', surface: '#FFFFFF', surfaceStrong: '#DFECEE',
    text: '#16323A', muted: '#61777C', border: '#C8DDE0', accent: '#257C96', accentText: '#FFFFFF',
  },
  neon_cocktail_bar: {
    bg: '#0E0A12', panel: '#151019', surface: '#1D1623', surfaceStrong: '#281C31',
    text: '#FBF6FF', muted: '#BAA9C3', border: '#3D2B48', accent: '#E95BCD', accentText: '#170A16',
  },
  art_deco_speakeasy: {
    bg: '#11110F', panel: '#181713', surface: '#222019', surfaceStrong: '#2D291F',
    text: '#F7F0DB', muted: '#B7AA88', border: '#443D2C', accent: '#D4B46A', accentText: '#18130A',
  },
  shahrazad_persian: {
    bg: '#111815', panel: '#17211C', surface: '#1E2B24', surfaceStrong: '#28382E',
    text: '#F8F0DF', muted: '#B7B0A0', border: '#3A4B40', accent: '#D7A64D', accentText: '#1B1306',
  },
  anatolia_turkish: {
    bg: '#F4EEE7', panel: '#FBF7F2', surface: '#FFFFFF', surfaceStrong: '#EDE2D7',
    text: '#35271F', muted: '#7B685B', border: '#DBCBBE', accent: '#B95034', accentText: '#FFFFFF',
  },
  ember_steakhouse: {
    bg: '#15110F', panel: '#1D1714', surface: '#271F1A', surfaceStrong: '#33261F',
    text: '#FFF4EB', muted: '#BCA99C', border: '#49382E', accent: '#E0713F', accentText: '#1C0E08',
  },
}

const FALLBACK_PALETTE = PALETTES.verdant_modern

type Copy = {
  kiosk: string
  eatHere: string
  takeAway: string
  search: string
  all: string
  items: string
  add: string
  yourOrder: string
  emptyTitle: string
  emptyHint: string
  subtotal: string
  clear: string
  checkout: string
  processing: string
  customize: string
  noResults: string
}

const COPY: Record<string, Copy> = {
  en: {
    kiosk: 'Self-service ordering', eatHere: 'Eat here', takeAway: 'Take away',
    search: 'Search the menu', all: 'All items', items: 'items', add: 'Add',
    yourOrder: 'Your order', emptyTitle: 'Your order is empty',
    emptyHint: 'Choose something from the menu to begin.', subtotal: 'Subtotal',
    clear: 'Clear order', checkout: 'Continue to payment', processing: 'Preparing order…',
    customize: 'Customize', noResults: 'No menu items match your search.',
  },
  de: {
    kiosk: 'Selbstbedienung', eatHere: 'Hier essen', takeAway: 'Mitnehmen',
    search: 'Speisekarte durchsuchen', all: 'Alle', items: 'Artikel', add: 'Hinzufügen',
    yourOrder: 'Deine Bestellung', emptyTitle: 'Deine Bestellung ist leer',
    emptyHint: 'Wähle etwas aus der Speisekarte.', subtotal: 'Zwischensumme',
    clear: 'Bestellung leeren', checkout: 'Weiter zur Zahlung', processing: 'Bestellung wird vorbereitet…',
    customize: 'Anpassen', noResults: 'Keine passenden Gerichte gefunden.',
  },
  fa: {
    kiosk: 'سفارش سلف‌سرویس', eatHere: 'صرف در رستوران', takeAway: 'بیرون‌بر',
    search: 'جستجو در منو', all: 'همه', items: 'آیتم', add: 'افزودن',
    yourOrder: 'سفارش شما', emptyTitle: 'سفارش شما خالی است',
    emptyHint: 'برای شروع یک آیتم از منو انتخاب کنید.', subtotal: 'جمع جزء',
    clear: 'پاک کردن سفارش', checkout: 'ادامه به پرداخت', processing: 'در حال آماده‌سازی سفارش…',
    customize: 'انتخاب گزینه‌ها', noResults: 'آیتمی مطابق جستجوی شما پیدا نشد.',
  },
  tr: {
    kiosk: 'Self servis sipariş', eatHere: 'Burada ye', takeAway: 'Paket',
    search: 'Menüde ara', all: 'Tümü', items: 'ürün', add: 'Ekle',
    yourOrder: 'Siparişiniz', emptyTitle: 'Siparişiniz boş',
    emptyHint: 'Başlamak için menüden bir ürün seçin.', subtotal: 'Ara toplam',
    clear: 'Siparişi temizle', checkout: 'Ödemeye devam et', processing: 'Sipariş hazırlanıyor…',
    customize: 'Seçenekler', noResults: 'Aramanızla eşleşen ürün yok.',
  },
  ja: {
    kiosk: 'セルフサービス注文', eatHere: '店内', takeAway: 'テイクアウト',
    search: 'メニューを検索', all: 'すべて', items: '点', add: '追加',
    yourOrder: 'ご注文', emptyTitle: '注文はまだありません',
    emptyHint: 'メニューから商品を選んでください。', subtotal: '小計',
    clear: '注文をクリア', checkout: '支払いへ進む', processing: '注文を準備しています…',
    customize: 'オプション', noResults: '検索に一致する商品がありません。',
  },
}

function copyFor(locale: string): Copy {
  const key = String(locale || 'en').toLowerCase().split('-')[0]
  return COPY[key] || COPY.en
}

function itemQuantity(cart: ReturnType<typeof useMenuRuntime>['cart'], itemId: string): number {
  return cart
    .filter((line) => String(line.item.id) === String(itemId))
    .reduce((sum, line) => sum + line.quantity, 0)
}

export function KioskTerminal() {
  const runtime = useMenuRuntime()
  const {
    bootstrap,
    locale,
    setLocale,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    categories,
    visibleItems,
    cart,
    cartCount,
    cartSubtotal,
    formatCurrency,
    quickAdd,
    openItem,
    updateCartQuantity,
    removeCartLine,
    clearCart,
    confirmPersonalItems,
    orderLoading,
    openCart,
  } = runtime

  const copy = copyFor(locale)
  const palette = PALETTES[bootstrap.theme.id] || FALLBACK_PALETTE
  const pickup = bootstrap.runtime?.kioskOrderType === 'pickup'
  const activeCategory = selectedCategory === 'all'
    ? null
    : categories.find((entry) => String(entry.id) === String(selectedCategory)) || null

  const rootStyle = {
    '--k-bg': palette.bg,
    '--k-panel': palette.panel,
    '--k-surface': palette.surface,
    '--k-surface-strong': palette.surfaceStrong,
    '--k-text': palette.text,
    '--k-muted': palette.muted,
    '--k-border': palette.border,
    '--k-accent': palette.accent,
    '--k-accent-text': palette.accentText,
  } as CSSProperties

  const addItem = (item: MenuItem) => {
    if (item.options.length > 0) {
      openItem(item)
      return
    }
    quickAdd(item)
  }

  return (
    <div
      className={styles.root}
      style={rootStyle}
      dir={runtime.direction}
      data-pmd-kiosk-terminal="v7"
      data-pmd-runtime-mode="kiosk-v7-terminal"
    >
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logoFrame}>
            {bootstrap.restaurant.logoUrl ? (
              <img src={bootstrap.restaurant.logoUrl} alt="" className={styles.logo} />
            ) : (
              <span className={styles.logoFallback}>{bootstrap.restaurant.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className={styles.brandText}>
            <strong>{bootstrap.restaurant.name}</strong>
            <span>{copy.kiosk}</span>
          </div>
        </div>

        <div className={styles.serviceMode} data-kiosk-order-type={pickup ? 'pickup' : 'eat-here'}>
          {pickup ? <ShoppingBag aria-hidden="true" /> : <UtensilsCrossed aria-hidden="true" />}
          <div>
            <span>{pickup ? copy.takeAway : copy.eatHere}</span>
            <small>{pickup ? 'Pickup order' : 'Dine-in order'}</small>
          </div>
        </div>

        <label className={styles.searchBox}>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.search}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className={styles.language}>
          <span className={styles.srOnly}>Language</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value)}>
            {bootstrap.locales.enabledLocales.map((code) => (
              <option key={code} value={code}>{code.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </header>

      <div className={styles.frame}>
        <aside className={styles.categoryRail} aria-label="Menu categories">
          <div className={styles.categoryLabel}>Menu</div>
          <button
            type="button"
            className={[styles.categoryButton, selectedCategory === 'all' ? styles.categoryActive : ''].filter(Boolean).join(' ')}
            aria-pressed={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          >
            <span>{copy.all}</span>
          </button>
          <div className={styles.categoryScroller}>
            {categories.map((category) => {
              const active = String(selectedCategory) === String(category.id)
              return (
                <button
                  key={category.id}
                  type="button"
                  className={[styles.categoryButton, active ? styles.categoryActive : ''].filter(Boolean).join(' ')}
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <main className={styles.menuPane}>
          <div className={styles.menuHeading}>
            <div>
              <span className={styles.eyebrow}>{pickup ? copy.takeAway : copy.eatHere}</span>
              <h1>{activeCategory?.name || copy.all}</h1>
            </div>
            <span className={styles.resultCount}>{visibleItems.length} {copy.items}</span>
          </div>

          {visibleItems.length > 0 ? (
            <div className={styles.itemGrid}>
              {visibleItems.map((item) => {
                const quantity = itemQuantity(cart, item.id)
                const configurable = item.options.length > 0
                return (
                  <article className={styles.itemCard} key={item.id}>
                    <button
                      className={styles.itemVisual}
                      type="button"
                      onClick={() => openItem(item)}
                      aria-label={item.name}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" />
                      ) : (
                        <span className={styles.imageFallback}>{item.name.slice(0, 1).toUpperCase()}</span>
                      )}
                      {quantity > 0 ? <span className={styles.inOrderBadge}>{quantity}</span> : null}
                    </button>

                    <div className={styles.itemBody}>
                      <div className={styles.itemCopy}>
                        <h2>{item.name}</h2>
                        {item.description ? <p>{item.description}</p> : null}
                      </div>
                      <div className={styles.itemActionRow}>
                        <strong>{formatCurrency(item.price)}</strong>
                        <button type="button" className={styles.addButton} onClick={() => addItem(item)}>
                          <Plus aria-hidden="true" />
                          <span>{configurable ? copy.customize : copy.add}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className={styles.noResults}>
              <Search aria-hidden="true" />
              <strong>{copy.noResults}</strong>
            </div>
          )}
        </main>

        <aside className={styles.orderRail} aria-label={copy.yourOrder}>
          <div className={styles.orderHeader}>
            <div>
              <span>{copy.yourOrder}</span>
              <strong>{cartCount} {copy.items}</strong>
            </div>
            {cart.length > 0 ? (
              <button type="button" className={styles.clearButton} onClick={clearCart}>{copy.clear}</button>
            ) : null}
          </div>

          <div className={styles.orderList}>
            {cart.length > 0 ? cart.map((line) => (
              <article className={styles.orderLine} key={line.key}>
                <div className={styles.orderLineTop}>
                  <div>
                    <strong>{line.item.name}</strong>
                    {line.selectedOptions.length > 0 ? (
                      <small>{line.selectedOptions.map((option) => option.valueName).join(' · ')}</small>
                    ) : null}
                  </div>
                  <span>{formatCurrency(line.subtotal)}</span>
                </div>
                <div className={styles.qtyRow}>
                  <button
                    type="button"
                    onClick={() => line.quantity <= 1
                      ? removeCartLine(line.key)
                      : updateCartQuantity(line.key, line.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus aria-hidden="true" />
                  </button>
                  <b>{line.quantity}</b>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(line.key, line.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
              </article>
            )) : (
              <div className={styles.emptyOrder}>
                <ShoppingBag aria-hidden="true" />
                <strong>{copy.emptyTitle}</strong>
                <p>{copy.emptyHint}</p>
              </div>
            )}
          </div>

          <div className={styles.orderFooter}>
            <div className={styles.subtotalRow}>
              <span>{copy.subtotal}</span>
              <strong>{formatCurrency(cartSubtotal)}</strong>
            </div>
            <button
              type="button"
              className={styles.checkoutButton}
              disabled={cart.length === 0 || orderLoading}
              onClick={() => void confirmPersonalItems()}
              data-pmd-kiosk-primary-checkout="v7"
            >
              <span>{orderLoading ? copy.processing : copy.checkout}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>

      {cart.length > 0 ? (
        <button type="button" className={styles.compactOrderBar} onClick={openCart}>
          <span className={styles.compactCount}>{cartCount}</span>
          <span>{copy.yourOrder}</span>
          <strong>{formatCurrency(cartSubtotal)}</strong>
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}

      <RuntimeOverlays />
    </div>
  )
}
