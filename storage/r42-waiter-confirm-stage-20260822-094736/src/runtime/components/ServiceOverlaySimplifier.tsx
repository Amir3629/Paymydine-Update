'use client'

// PMD_SIMPLE_SERVICE_OVERLAYS_R42
// Shared presentation authority for all ten themes. Service request behavior stays
// in RuntimeOverlays; this removes duplicated chrome while preserving real request feedback.
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './RuntimeOverlays.module.css'

function waiterSuccessCopy(locale: string): string {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return 'Kellner wurde benachrichtigt. Bitte warten Sie einen Moment.'
  if (lang === 'fa') return 'گارسون مطلع شد. لطفاً کمی منتظر بمانید.'
  if (lang === 'tr') return 'Garson bilgilendirildi. Lütfen kısa bir süre bekleyin.'
  if (lang === 'ja') return 'スタッフに通知しました。しばらくお待ちください。'
  return 'A waiter has been notified. Please wait a moment.'
}

function cssString(value: string): string {
  return JSON.stringify(value)
}

export function ServiceOverlaySimplifier() {
  const { overlay, serviceMode, requestStatus, locale } = useMenuRuntime()

  if (overlay !== 'service') return null

  const waiterStatusVisible = serviceMode === 'waiter'
    && requestStatus.kind === 'waiter'
    && (requestStatus.state === 'success' || requestStatus.state === 'error')

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
  ${waiterStatusVisible ? 'display: block !important;' : 'display: none !important;'}
  overflow: visible !important;
  padding: .55rem 1rem .1rem !important;
}
.${styles.scroll} > .${styles.stack} > .${styles.orderCard} {
  display: none !important;
}
.${styles.scroll} > .${styles.stack} {
  gap: .45rem !important;
}
.${styles.scroll} .${styles.statusMessage} {
  margin: 0 !important;
  border-radius: .8rem !important;
  padding: .7rem .85rem !important;
  font-size: .78rem !important;
  line-height: 1.35 !important;
  text-align: center !important;
}
.${styles.scroll} .${styles.statusSuccess} {
  font-size: 0 !important;
}
.${styles.scroll} .${styles.statusSuccess}::after {
  content: ${cssString(waiterSuccessCopy(locale))};
  font-size: .78rem !important;
  font-weight: 650;
  line-height: 1.35;
}
.${styles.footerActions} {
  border-top: 0 !important;
  padding: .65rem 1rem 1rem !important;
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
    <style data-pmd-simple-service-overlays="r42">{`
.${styles.header} p {
  display: none !important;
}
${waiterRules}${noteRules}
    `}</style>
  )
}
