'use client'

/**
 * PaymentCheckoutUXEnhancer is intentionally CSS-only.
 *
 * Payment selection, provider startup, and settlement are owned by React inside
 * RuntimeOverlays and the provider components. This component must never move,
 * replace, click, hide, or mutate React-owned checkout DOM nodes.
 */
export function PaymentCheckoutUXEnhancer() {
  return (
    <style>{`
      [data-pmd-worldline-native-card] {
        border: 0 !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 10px !important;
      }

      [data-pmd-worldline-native-card] > div:first-of-type,
      [data-pmd-worldline-native-card] > div:last-child {
        display: none !important;
      }

      [data-pmd-worldline-native-card] label {
        font-size: 0 !important;
        gap: 0 !important;
        margin: 0 !important;
      }

      [data-pmd-worldline-native-card] input {
        min-height: 48px !important;
        font-size: 16px !important;
      }

      [data-pmd-worldline-native-card] button[type="submit"] {
        width: 100% !important;
        min-height: 54px !important;
        border-radius: 999px !important;
        background: var(--pmd-text, #ffffff) !important;
        color: var(--pmd-control, #070707) !important;
        border: 1px solid var(--pmd-text, #ffffff) !important;
        opacity: 1 !important;
      }

      [data-pmd-worldline-direct-method] {
        opacity: 1 !important;
      }

      [data-pmd-worldline-direct-method][aria-busy="true"] {
        cursor: progress;
      }
    `}</style>
  )
}
