'use client'

// PMD_SIMPLE_SERVICE_OVERLAYS_R40
// Shared presentation authority for all ten themes. Service request behavior stays
// in RuntimeOverlays; this only removes duplicated chrome from waiter/note dialogs.
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './RuntimeOverlays.module.css'

export function ServiceOverlaySimplifier() {
  const { overlay, serviceMode } = useMenuRuntime()

  if (overlay !== 'service') return null

  const waiterRules = serviceMode === 'waiter'
    ? `
.${styles.scroll} > .${styles.stack} > .${styles.orderCard} {
  display: none !important;
}
`
    : ''

  const noteRules = serviceMode === 'note'
    ? `
.${styles.scroll} > .${styles.stack} > .${styles.label} {
  gap: 0 !important;
  font-size: 0 !important;
}
.${styles.scroll} > .${styles.stack} > .${styles.label} > .${styles.input} {
  min-height: 8rem;
  font-size: 1rem !important;
  line-height: 1.5;
}
.${styles.scroll} > .${styles.stack} > .${styles.label} > small {
  display: block;
  margin-top: .4rem;
  color: var(--pmd-muted, #777);
  font-size: .68rem !important;
  font-weight: 600;
  line-height: 1.2;
  text-align: end;
}
`
    : ''

  return (
    <style data-pmd-simple-service-overlays="r40">{`
.${styles.header} p {
  display: none !important;
}
${waiterRules}${noteRules}
    `}</style>
  )
}
