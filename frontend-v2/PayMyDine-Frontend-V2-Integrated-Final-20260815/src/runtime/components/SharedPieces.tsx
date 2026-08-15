'use client'

import {
  ChevronDown,
  ExternalLink,
  Facebook,
  Globe2,
  Instagram,
  Leaf,
  MessageCircle,
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
    <span className={styles.logo} aria-label={bootstrap.restaurant.name}>
      {bootstrap.restaurant.logoUrl ? (
        <img className={styles.logoImage} src={bootstrap.restaurant.logoUrl} alt={bootstrap.restaurant.name} width={180} height={64} />
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
  const { quickAdd, labels } = useMenuRuntime()
  return (
    <button className={`${styles.addButton} ${className}`} type="button" onClick={() => quickAdd(item)} disabled={!item.available} aria-label={`${labels.add} ${item.name}`}>
      <Plus aria-hidden="true" />
    </button>
  )
}

export function PlatformFooter() {
  const { bootstrap, labels } = useMenuRuntime()
  return (
    <footer className={styles.footer}>
      <span className={styles.footerRule} />
      <p className={styles.footerText}>{bootstrap.restaurant.footerText}</p>
      <span className={styles.footerBrand}>
        <img src="/brand/pmd-mark.svg" alt="" width={32} height={32} />
        {labels.poweredBy}
      </span>
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
