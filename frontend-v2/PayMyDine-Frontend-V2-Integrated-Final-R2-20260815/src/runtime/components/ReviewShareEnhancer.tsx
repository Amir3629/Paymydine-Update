'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe2, Instagram, MapPin, Star } from 'lucide-react'
import { createPortal } from 'react-dom'
import styles from './ReviewShareEnhancer.module.css'

type ReviewSharePlatform = 'website' | 'instagram' | 'google' | 'trustpilot'

type ReviewShareLink = {
  platform: ReviewSharePlatform
  label: string
  url: string
}

const REVIEW_SHARE_FIELDS: Array<{
  platform: ReviewSharePlatform
  label: string
  enabledKey: string
  urlKey: string
}> = [
  { platform: 'website', label: 'Website', enabledKey: 'pmd_social_website_enabled', urlKey: 'pmd_social_website_url' },
  { platform: 'instagram', label: 'Instagram', enabledKey: 'pmd_social_instagram_enabled', urlKey: 'pmd_social_instagram_url' },
  { platform: 'google', label: 'Google / Maps', enabledKey: 'pmd_social_google_enabled', urlKey: 'pmd_social_google_url' },
  { platform: 'trustpilot', label: 'Trustpilot', enabledKey: 'pmd_social_trustpilot_enabled', urlKey: 'pmd_social_trustpilot_url' },
]

function settingEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return ['1', 'true', 'yes', 'on', 'enabled', 'active'].includes(String(value ?? '').trim().toLowerCase())
}

function safePublicUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function reviewSharePrompt(locale: string): string {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return 'Möchten Sie Ihr Feedback auch mit anderen teilen?'
  if (lang === 'fa') return 'مایلید بازخوردتان را با دیگران هم به اشتراک بگذارید؟'
  if (lang === 'tr') return 'Geri bildiriminizi başkalarıyla da paylaşmak ister misiniz?'
  if (lang === 'ja') return 'よろしければ、感想をほかの方にも共有しませんか？'
  return 'Would you like to share your feedback with others?'
}

function ShareIcon({ platform }: { platform: ReviewSharePlatform }) {
  if (platform === 'instagram') return <Instagram aria-hidden="true" />
  if (platform === 'google') return <MapPin aria-hidden="true" />
  if (platform === 'trustpilot') return <Star aria-hidden="true" />
  return <Globe2 aria-hidden="true" />
}

/* PMD_REVIEW_SOCIAL_SHARE_R36
 * The restaurant-profile settings are the only authority for these links.
 * Nothing is shown unless a review is already successful AND at least one of
 * Website / Instagram / Google Maps / Trustpilot is both enabled and has a
 * valid public URL. This keeps the owner opt-in behavior fail-closed.
 */
export function ReviewShareEnhancer() {
  const [links, setLinks] = useState<ReviewShareLink[]>([])
  const [reviewCard, setReviewCard] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/settings', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json().catch(() => ({}))
      })
      .then((payload) => {
        if (cancelled) return
        const nested = payload && typeof payload.data === 'object' && payload.data ? payload.data : {}
        const settings = { ...(payload || {}), ...nested } as Record<string, unknown>
        const resolved = REVIEW_SHARE_FIELDS.flatMap((field): ReviewShareLink[] => {
          if (!settingEnabled(settings[field.enabledKey])) return []
          const url = safePublicUrl(settings[field.urlKey])
          return url ? [{ platform: field.platform, label: field.label, url }] : []
        })
        setLinks(resolved)
      })
      .catch(() => {
        if (!cancelled) setLinks([])
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const locateSuccessfulReview = () => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-paid-order-review="r30"]'))
      const successful = cards.find((card) => {
        const textarea = card.querySelector('textarea')
        return textarea instanceof HTMLTextAreaElement && textarea.disabled
      }) || null
      setReviewCard((current) => current === successful ? current : successful)
    }

    locateSuccessfulReview()
    const observer = new MutationObserver(locateSuccessfulReview)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled'],
    })

    return () => observer.disconnect()
  }, [])

  const prompt = useMemo(() => {
    if (typeof document === 'undefined') return reviewSharePrompt('en')
    return reviewSharePrompt(document.documentElement.lang || 'en')
  }, [reviewCard])

  if (!reviewCard || links.length === 0) return null

  return createPortal(
    <section className={styles.reviewShare} data-pmd-review-social-share="r36" aria-label={prompt}>
      <p className={styles.prompt}>{prompt}</p>
      <div className={styles.links}>
        {links.map((link) => (
          <a
            key={link.platform}
            className={styles.link}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            aria-label={link.label}
            title={link.label}
            data-pmd-review-share-platform={link.platform}
          >
            <ShareIcon platform={link.platform} />
          </a>
        ))}
      </div>
    </section>,
    reviewCard,
  )
}
