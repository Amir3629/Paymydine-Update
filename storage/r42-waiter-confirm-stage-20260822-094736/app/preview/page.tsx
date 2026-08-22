import { notFound } from 'next/navigation'
import { THEME_CATALOG } from '@/src/themes/catalog'
import styles from './preview-index.module.css'

function enabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

export default function ThemePreviewIndex() {
  if (!enabled(process.env.PMD_ENABLE_THEME_PREVIEW) && !enabled(process.env.PMD_DEMO_MODE)) notFound()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>PayMyDine Frontend V2</p>
        <h1>10 isolated menu experiences</h1>
        <p>Each preview uses the same demo restaurant, menu, table-order and checkout engine while loading only its own visual composition and CSS Module.</p>
      </header>
      <section className={styles.grid} aria-label="Theme previews">
        {THEME_CATALOG.map((theme, index) => (
          <a className={styles.card} href={`/preview/${theme.id}`} key={theme.id}>
            <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
            <div><h2>{theme.name}</h2><p>{theme.summary}</p></div>
            <span className={styles.meta}><span>{theme.restaurantType}</span><span>{theme.dark ? 'Dark' : 'Light'} →</span></span>
          </a>
        ))}
      </section>
    </main>
  )
}
