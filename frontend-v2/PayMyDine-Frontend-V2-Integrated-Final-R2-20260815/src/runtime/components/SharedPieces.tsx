'use client'

import {
  ChevronDown,
  ExternalLink,
  Facebook,
  Globe2,
  Instagram,
  Leaf,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Star,
  Youtube,
} from 'lucide-react'
import type { MenuItem, SocialLink } from '@/src/domain/model'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './SharedPieces.module.css'

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PMD'
}

export function RestaurantLogo({ showName = true }: { showName?: boolean }) {
  const { bootstrap } = useMenuRuntime()
  return (
    <span className={styles.logo} data-pmd-restaurant-logo="r24" data-pmd-restaurant-logo-src={bootstrap.restaurant.logoUrl || ''} aria-label={bootstrap.restaurant.name}>
      {bootstrap.restaurant.logoUrl ? (
        <img key={bootstrap.restaurant.logoUrl} className={styles.logoImage} data-pmd-restaurant-logo-image="r24" data-pmd-media-contract="api-media" src={bootstrap.restaurant.logoUrl} alt={bootstrap.restaurant.name} width={160} height={60} loading="eager" decoding="async" />
      ) : (
        <span className={styles.logoFallback} aria-hidden="true">{initials(bootstrap.restaurant.name)}</span>
      )}
      {showName && <span className={styles.logoText}>{bootstrap.restaurant.name}</span>}
    </span>
  )
}

export function LanguageSelect() {
  const { bootstrap, locale, setLocale, labels } = useMenuRuntime()
  if (bootstrap.locales.enabledLocales.length < 2) return null
  return (
    <label className={styles.selectWrap} aria-label={labels.language}>
      <select className={styles.select} value={locale} onChange={(event) => setLocale(event.target.value)}>
        {bootstrap.locales.enabledLocales.map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}
      </select>
      <ChevronDown className={styles.selectIcon} aria-hidden="true" />
    </label>
  )
}

function socialIcon(link: SocialLink) {
  switch (link.platform) {
    case 'instagram': return <Instagram />
    case 'facebook': return <Facebook />
    case 'youtube': return <Youtube />
    case 'whatsapp': return <MessageCircle />
    case 'website': return <Globe2 />
    case 'google': return <Search />
    case 'reviews':
    case 'trustpilot': return <Star />
    default: return <ExternalLink />
  }
}

export function SocialLinks({ links }: { links?: SocialLink[] }) {
  const { bootstrap } = useMenuRuntime()
  const active = (links || bootstrap.socialLinks).filter((link) => link.enabled && link.url)
  if (!active.length || !bootstrap.features.socialLinks) return null
  return (
    <nav className={styles.socials} aria-label="Social links">
      {active.map((link) => (
        <a key={`${link.platform}:${link.url}`} className={styles.socialLink} href={link.url} target="_blank" rel="noreferrer" aria-label={link.label}>
          {socialIcon(link)}
        </a>
      ))}
    </nav>
  )
}

export function DietaryBadges({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const { labels } = useMenuRuntime()
  const values = [
    item.vegan ? { key: 'vegan', label: labels.vegan, icon: <Leaf /> } : null,
    !item.vegan && item.vegetarian ? { key: 'vegetarian', label: labels.vegetarian, icon: <Leaf /> } : null,
    item.halal ? { key: 'halal', label: labels.halal, icon: <Star /> } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ReactNode }>
  if (!values.length) return null
  return (
    <span className={styles.badges}>
      {values.map((value) => <span className={styles.badge} key={value.key}>{value.icon}{!compact && value.label}</span>)}
    </span>
  )
}

export function QuickAddButton({ item, className = '' }: { item: MenuItem; className?: string }) {
  const { quickAdd, labels, cart, updateCartQuantity } = useMenuRuntime()
  const selectedLines = cart.filter((line) => line.item.id === item.id)
  const selectedQuantity = selectedLines.reduce((sum, line) => sum + line.quantity, 0)

  const decrementOne = (event: { stopPropagation(): void }) => {
    event.stopPropagation()
    const target = [...selectedLines].reverse().find((line) => line.quantity > 0)
    if (!target) return
    updateCartQuantity(target.key, target.quantity - 1)
  }

  const incrementOne = (event: { stopPropagation(): void }) => {
    event.stopPropagation()
    quickAdd(item)
  }

  // PMD_QUICK_ADD_COUNTER_R26B
  // Zero items = the familiar single + button. Once selected, the exact same
  // shared component becomes - / quantity / +, so all ten themes stay in sync.
  if (selectedQuantity <= 0) {
    return (
      <button
        className={`${styles.addButton} ${className}`}
        type="button"
        onClick={incrementOne}
        disabled={!item.available}
        aria-label={`${labels.add} ${item.name}`}
        data-pmd-item-quantity="0"
      >
        <Plus aria-hidden="true" />
      </button>
    )
  }

  return (
    <span
      className={`${styles.addCounter} ${className}`}
      data-pmd-quick-add-counter="r26b"
      data-pmd-item-quantity={selectedQuantity}
      aria-label={`${labels.quantity}: ${item.name}, ${selectedQuantity}`}
    >
      <button className={styles.addCounterButton} type="button" onClick={decrementOne} aria-label={`− ${item.name}`}>
        <Minus aria-hidden="true" />
      </button>
      <strong className={styles.addCounterValue} aria-live="polite">{selectedQuantity}</strong>
      <button className={styles.addCounterButton} type="button" onClick={incrementOne} disabled={!item.available} aria-label={`+ ${item.name}`}>
        <Plus aria-hidden="true" />
      </button>
    </span>
  )
}

export function PlatformFooter() {
  const { bootstrap, labels } = useMenuRuntime()
  return (
    <footer className={styles.footer} data-pmd-platform-footer="r17c" data-pmd-brand-revision="r18" aria-label="PayMyDine">
      <span className={styles.footerRule} />
      {bootstrap.restaurant.footerText && <p className={styles.footerText}>{bootstrap.restaurant.footerText}</p>}
      <a
        className={styles.footerBrand}
        href="https://paymydine.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit PayMyDine"
      >
        <img className={styles.footerBrandLogo} src="/app/admin/assets/images/paymydine-logo.svg" alt="" width={25} height={32} loading="lazy" decoding="async" />
        <span>{labels.poweredBy}</span>
      </a>
    </footer>
  )
}

export function CategoryGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const normalized = name.toLowerCase()
  const icon = normalized.includes('drink') || normalized.includes('cocktail') || normalized.includes('wine')
    ? '◇'
    : normalized.includes('dessert') || normalized.includes('sweet')
      ? '✦'
      : normalized.includes('sea') || normalized.includes('fish')
        ? '≈'
        : normalized.includes('vegan') || normalized.includes('salad')
          ? '⌁'
          : normalized.includes('grill') || normalized.includes('steak') || normalized.includes('kebab')
            ? '△'
            : normalized.includes('starter') || normalized.includes('appet')
              ? '◌'
              : '○'
  return <span aria-hidden="true" style={{ width: size, height: size, display: 'inline-grid', placeItems: 'center', fontSize: size * .9 }}>{icon}</span>
}
