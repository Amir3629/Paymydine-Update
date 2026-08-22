'use client'

// PMD_SIMPLE_SERVICE_OVERLAYS_R41
// Shared presentation authority for all ten themes. Service request behavior stays
// in RuntimeOverlays; this only removes duplicated/empty chrome from waiter/note dialogs.
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './RuntimeOverlays.module.css'

export function ServiceOverlaySimplifier() {
  const { overlay, serviceMode } = useMenuRuntime()

  if (overlay !== 'service') return null

  const waiterRules = serviceMode === 'waiter'
    ? `
.${styles.header} {
  min-height: 0 !important;
  justify-content: flex-end !important;
  border-bottom: 0 !important;
  padding: .75rem .85rem 0 !important;
}
.${styles.header} > div {
  display: none !important;
}
.${styles.header} .${styles.close} {
  width: 2.35rem !important;
  height: 2.35rem !important;
}
.${styles.scroll} {
  display: none !important;
}
.${styles.footerActions} {
  border-top: 0 !important;
  padding: .8rem 1rem 1rem !important;
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
    <style data-pmd-simple-service-overlays="r41">{`
.${styles.header} p {
  display: none !important;
}
${waiterRules}${noteRules}
    `}</style>
  )
}
