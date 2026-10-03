"use client"

export const KazenGoldCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-gold-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SKIN_GOLD_CHECKOUT_20260612 */

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal {
          --kgc-bg: #090705;
          --kgc-panel: #0f0c08;
          --kgc-panel-soft: #15110c;
          --kgc-ink: #f4e7c8;
          --kgc-muted: #c7b48b;
          --kgc-line: rgba(198,164,93,.36);
          --kgc-line-strong: rgba(198,164,93,.58);
          --kgc-red: #df685d;
          --kgc-green: #063f35;

          background:
            radial-gradient(circle at 84% 0%, rgba(120,38,30,.18), transparent 30%),
            linear-gradient(180deg, #0f0b08 0%, #070605 100%) !important;
          border: 1px solid var(--kgc-line-strong) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            0 34px 90px rgba(0,0,0,.64),
            inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] * {
          text-shadow: none !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub {
          background: rgba(8,7,5,.82) !important;
          border-bottom: 1px solid rgba(198,164,93,.20) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .26em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 700 !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0b0907 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          padding: 1rem !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface {
          background:
            linear-gradient(180deg, rgba(244,231,200,.045), rgba(244,231,200,.018)),
            rgba(14,11,8,.86) !important;
          border: 1px solid var(--kgc-line) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            inset 0 1px 0 rgba(244,231,200,.06),
            0 16px 34px rgba(0,0,0,.18) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div {
          color: var(--kgc-muted);
          -webkit-text-fill-color: currentColor;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"] {
          color: var(--kgc-red) !important;
          -webkit-text-fill-color: var(--kgc-red) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover {
          transform: translateY(-1px) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active {
          transform: translateY(0) scale(.985) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent {
          background: var(--kgc-green) !important;
          background-color: var(--kgc-green) !important;
          border-color: var(--kgc-green) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent),
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent) {
          background: rgba(8,7,5,.72) !important;
          border: 1px solid var(--kgc-line) !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea {
          background: rgba(244,231,200,.06) !important;
          border: 1px solid rgba(198,164,93,.32) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder {
          color: rgba(199,180,139,.58) !important;
          -webkit-text-fill-color: rgba(199,180,139,.58) !important;
        }
      `,
    }}
  />
)




export const KazenSharedCheckoutNightPolishStyles = () => (
  <style
    data-pmd-kazen-checkout-night-polish="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_CHECKOUT_NIGHT_POLISH_20260612
           This is intentionally scoped only to Kazen shared checkout.
           It does not touch Gold, Modern Green, Organic, or the menu layout.
        */

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          width: min(94vw, 430px) !important;
          max-height: min(88vh, 820px) !important;
          border-radius: 0 !important;
          border: 1px solid rgba(198,164,93,.58) !important;
          background:
            radial-gradient(circle at 88% 0%, rgba(120,38,30,.22), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #070604 100%) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: 0 34px 100px rgba(0,0,0,.72), inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        [data-pmd-checkout-kazen-skin="1"] *,
        [data-pmd-checkout-kazen-skin="1"] *::before,
        [data-pmd-checkout-kazen-skin="1"] *::after {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child {
          min-height: 58px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid rgba(198,164,93,.26) !important;
          background: rgba(8,7,5,.92) !important;
          border-radius: 0 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 800 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.052) 1px, transparent 0),
            linear-gradient(180deg, #090705 0%, #060504 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          padding: 14px !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(198,164,93,.42) rgba(8,7,5,.62) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-flat-section,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] .surface,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:not(:first-child),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.055), rgba(244,231,200,.018)),
            rgba(15,12,8,.88) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.06), 0 14px 28px rgba(0,0,0,.18) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row {
          background: rgba(10,8,6,.58) !important;
          border: 1px solid rgba(198,164,93,.26) !important;
          border-radius: 0 !important;
          padding: .72rem .8rem !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] b,
        [data-pmd-checkout-kazen-skin="1"] .font-semibold,
        [data-pmd-checkout-kazen-skin="1"] .font-bold {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] p,
        [data-pmd-checkout-kazen-skin="1"] span,
        [data-pmd-checkout-kazen-skin="1"] label,
        [data-pmd-checkout-kazen-skin="1"] div,
        [data-pmd-checkout-kazen-skin="1"] .muted,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-helper-text {
          color: #cbb88d !important;
          -webkit-text-fill-color: #cbb88d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-status-title,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row span:first-child,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row span:first-child {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .10em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 30px rgba(0,0,0,.34) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          stroke: #fff6dc !important;
        }



        /* Native Stripe Pay button: keep it as Kazen primary red, never green/pill. */
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 48px !important;
          height: 48px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"]:disabled,
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border-color: rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.62) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(244,231,200,.075) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(203,184,141,.72) !important;
          -webkit-text-fill-color: rgba(203,184,141,.72) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] img {
          filter: none !important;
          opacity: 1 !important;
        }

        @media (max-width: 520px) {
          [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
            width: min(94vw, 420px) !important;
            max-height: 86vh !important;
          }
          [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
            padding: 12px !important;
          }
        }
      `,
    }}
  />
)


export const KazenSharedCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-shared-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SHARED_CHECKOUT_SKIN_20260612
           This is a skin only. It does not create checkout steps/cards/logic.
           Kazen uses the shared PaymentModal flow; these selectors target only
           data-pmd-checkout-kazen-skin="1" so other themes stay untouched.
        */

        [data-pmd-kazen-checkout-overlay="1"] {
          background:
            radial-gradient(circle at 75% 10%, rgba(128, 38, 31, .26), transparent 30%),
            rgba(2, 2, 2, .68) !important;
          backdrop-filter: blur(14px) saturate(.88) !important;
          -webkit-backdrop-filter: blur(14px) saturate(.88) !important;
          padding: 1.15rem !important;
        }

        [data-pmd-checkout-kazen-skin="1"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
          --pmd-checkout-shell-final: #080706 !important;
          --pmd-checkout-panel-final: #100d09 !important;
          --pmd-checkout-field-final: #15110c !important;
          --pmd-checkout-border-final: rgba(198, 164, 93, .36) !important;
          --pmd-checkout-shadow-final: 0 20px 44px rgba(0,0,0,.32) !important;
          --pmd-checkout-primary: #063f35 !important;
          --pmd-checkout-primary-2: #0a4c41 !important;
          --theme-text-primary: #f4e7c8 !important;
          --theme-text-muted: #c9b78f !important;
          --theme-border: rgba(198, 164, 93, .36) !important;
          --theme-surface: #100d09 !important;
          --theme-surface-sub: #15110c !important;
          --theme-primary: #df685d !important;
          --theme-primary-foreground: #fff5dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          background:
            radial-gradient(circle at 86% 0%, rgba(122, 38, 30, .20), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #080706 100%) !important;
          background-color: #080706 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          border-radius: 0 !important;
          box-shadow: 0 34px 90px rgba(0,0,0,.68), inset 0 1px 0 rgba(244,231,200,.08) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          max-height: min(92vh, 860px) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child {
          background: rgba(8, 7, 5, .92) !important;
          background-color: rgba(8, 7, 5, .92) !important;
          border-bottom: 1px solid rgba(198,164,93,.24) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-weight: 700 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0a0806 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-color: rgba(198,164,93,.58) rgba(8,7,5,.92) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .surface-sub,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.050), rgba(244,231,200,.018)),
            rgba(16, 13, 9, .90) !important;
          background-color: rgba(16, 13, 9, .90) !important;
          border-color: rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.055) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-table-order-item-row {
          background: transparent !important;
          background-color: transparent !important;
          border-color: rgba(198,164,93,.20) !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] b {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] p,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] span,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] label,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div {
          color: #c9b78f;
          -webkit-text-fill-color: currentColor;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border-color: rgba(198,164,93,.48) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }



        /* Native Stripe Pay button: keep it as Kazen primary red, never green/pill. */
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 48px !important;
          height: 48px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"]:disabled,
        [data-pmd-checkout-kazen-skin="1"] button.pmd-themed-button[data-pmd-themed-button="primary"][data-pmd-stripe-native-button="1"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border-color: rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.72) !important;
          background-color: rgba(8,7,5,.72) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(21,17,12,.92) !important;
          background-color: rgba(21,17,12,.92) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(201,183,143,.62) !important;
          -webkit-text-fill-color: rgba(201,183,143,.62) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-pmd-checkout-kazen-skin="1"] *,
          [data-pmd-checkout-kazen-skin="1"] button {
            transition: none !important;
            animation: none !important;
          }
        }
      `,
    }}
  />
)

