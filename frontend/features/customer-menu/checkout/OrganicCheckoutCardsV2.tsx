"use client"

export function OrganicCheckoutCardsV2() {
  return (
    <style>{`
      /* PMD_ORGANIC_CHECKOUT_REAL_V2_20260614 */

      [data-pmd-kazen-checkout-overlay],
      body:has([data-pmd-checkout-visual-theme="organic_botanical_paper"]) [data-pmd-kazen-checkout-overlay] {
        z-index: 140 !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] {
        --org-v2-paper: #f7f3ea;
        --org-v2-cream: #fffaf0;
        --org-v2-surface: rgba(255,250,240,.90);
        --org-v2-border: #ded2ba;
        --org-v2-text: #343529;
        --org-v2-muted: #746f61;
        --org-v2-green: #747d55;
        --org-v2-gold: #b88940;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"].pmd-checkout-modal {
        width: min(430px, calc(100vw - 26px)) !important;
        max-width: 430px !important;
        min-width: 0 !important;
        max-height: calc(100vh - 44px) !important;
        border-radius: 30px !important;
        overflow: hidden !important;
        background:
          radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0),
          linear-gradient(180deg, rgba(247,243,234,.99), rgba(238,229,211,.99)) !important;
        background-size: 16px 16px, auto !important;
        border: 1px solid var(--org-v2-border) !important;
        color: var(--org-v2-text) !important;
        -webkit-text-fill-color: var(--org-v2-text) !important;
        box-shadow: 0 28px 80px rgba(60,53,41,.30), inset 0 1px 0 rgba(255,255,255,.76) !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-body {
        background: transparent !important;
        padding: 16px !important;
        padding-bottom: 22px !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] > .surface-sub:first-child {
        background: rgba(255,250,240,.90) !important;
        border-bottom: 1px solid var(--org-v2-border) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-modal-title,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] h2,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] h3 {
        color: var(--org-v2-text) !important;
        -webkit-text-fill-color: var(--org-v2-text) !important;
        font-weight: 850 !important;
        letter-spacing: -.035em !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-payment-card,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-payment-methods-card,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .surface-sub,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="rounded-2xl"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="rounded-3xl"] {
        background: var(--org-v2-surface) !important;
        border: 1px solid var(--org-v2-border) !important;
        color: var(--org-v2-text) !important;
        -webkit-text-fill-color: var(--org-v2-text) !important;
        box-shadow: 0 10px 24px rgba(60,53,41,.055) !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] .muted,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="text-xs"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="text-sm"] {
        color: var(--org-v2-muted) !important;
        -webkit-text-fill-color: var(--org-v2-muted) !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button {
        min-height: 48px !important;
        border-radius: 999px !important;
        font-weight: 850 !important;
        text-shadow: none !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button:not([data-pmd-order-status-back="1"]) {
        background: var(--org-v2-cream) !important;
        border: 1px solid var(--org-v2-border) !important;
        color: var(--org-v2-text) !important;
        -webkit-text-fill-color: var(--org-v2-text) !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-clean-send-kitchen="1"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-review-submit="true"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-submit-review="1"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[style*="#747d55"],
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[style*="#062F2A"] {
        background: var(--org-v2-green) !important;
        border-color: var(--org-v2-green) !important;
        color: #fffaf0 !important;
        -webkit-text-fill-color: #fffaf0 !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-order-status-back="1"] {
        min-height: 40px !important;
        width: 40px !important;
        height: 40px !important;
        background: rgba(116,125,85,.16) !important;
        border: 1px solid rgba(116,125,85,.26) !important;
        color: var(--org-v2-green) !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] input,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] textarea {
        background: #fffaf0 !important;
        border: 1px solid var(--org-v2-border) !important;
        color: var(--org-v2-text) !important;
        -webkit-text-fill-color: var(--org-v2-text) !important;
        border-radius: 18px !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] img {
        max-width: 58px !important;
        max-height: 34px !important;
        object-fit: contain !important;
      }

      [data-pmd-checkout-visual-theme="organic_botanical_paper"] svg,
      [data-pmd-checkout-visual-theme="organic_botanical_paper"] svg * {
        stroke: currentColor !important;
      }
    `}</style>
  )
}
