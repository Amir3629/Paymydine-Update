import React from "react"
import type { CSSProperties } from "react"
import { ThemeCheckoutSlot, type ThemeCheckoutSlotProps } from "@/components/themes/shared/ThemeCheckoutSlot"

export const ORGANIC_CHECKOUT_THEME_VARS = {
  "--theme-surface": "#fffaf0",
  "--theme-border": "#ded2ba",
  "--theme-text-primary": "#343529",
  "--theme-text-secondary": "#746f61",
  "--theme-text-muted": "#8a826f",
  "--theme-primary": "#747d55",
  "--theme-accent": "#747d55",
  "--pmd-paper-soft": "#fffaf0",
  "--pmd-paper": "#f6efe2",
  "--pmd-line": "#ded2ba",
  "--pmd-ink": "#343529",
  "--pmd-muted": "#746f61",
  "--pmd-primary": "#747d55",
  "--pmd-primary-dark": "#5f6746",
  "--pmd-accent": "#b88940",
} as CSSProperties

export const organicCheckoutModalStyle = {
  ...ORGANIC_CHECKOUT_THEME_VARS,
  backgroundColor: "#fffaf0",
  backgroundImage:
    "linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)",
  backgroundSize: "100% 100%, 16px 16px",
  backgroundRepeat: "no-repeat, repeat",
  border: "1px solid #ded2ba",
  color: "#343529",
  boxShadow: "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)",
} as CSSProperties

export const organicCheckoutHeaderStyle = {
  backgroundColor: "#fffaf0",
  color: "#343529",
  borderBottom: "1px solid rgba(222,210,186,.86)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.72)",
} as CSSProperties

export const organicCheckoutBodyStyle = {
  backgroundColor: "#f6efe2",
  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)",
  backgroundSize: "16px 16px",
  color: "#343529",
} as CSSProperties

export const organicCheckoutPrimaryButtonStyle = {
  background: "#747d55",
  backgroundColor: "#747d55",
  color: "#fffaf0",
  WebkitTextFillColor: "#fffaf0",
  textShadow: "none",
  border: "1px solid #747d55",
  boxShadow: "0 12px 24px rgba(95,103,70,.2)",
} as CSSProperties

export const organicCheckoutSecondaryButtonStyle = {
  background: "#fffaf0",
  backgroundColor: "#fffaf0",
  color: "#343529",
  WebkitTextFillColor: "#343529",
  border: "1px solid #ded2ba",
  boxShadow: "0 8px 18px rgba(60,53,41,.07)",
} as CSSProperties

export function OrganicCheckoutFrame(props: ThemeCheckoutSlotProps) {
  return <ThemeCheckoutSlot data-pmd-organic-checkout-frame="1" {...props} />
}

export function OrganicCheckoutHeader(props: ThemeCheckoutSlotProps) {
  return <ThemeCheckoutSlot data-pmd-organic-checkout-header="1" {...props} />
}

export function OrganicCheckoutBody(props: ThemeCheckoutSlotProps) {
  return <ThemeCheckoutSlot data-pmd-organic-checkout-body="1" {...props} />
}

export function OrganicCheckoutFooterAction(props: ThemeCheckoutSlotProps) {
  return <ThemeCheckoutSlot data-pmd-organic-checkout-footer-action="1" {...props} />
}

export function OrganicCheckoutScopedStyles() {
  return (
    <style
      data-pmd-organic-checkout-component-style="1"
      dangerouslySetInnerHTML={{
        __html: `
          [data-pmd-checkout-visual-theme="organic_botanical_paper"].pmd-checkout-modal {
            background-color: #fffaf0 !important;
            background-image:
              linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0)),
              radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0) !important;
            background-size: 100% 100%, 16px 16px !important;
            background-repeat: no-repeat, repeat !important;
            border: 1px solid #ded2ba !important;
            color: #343529 !important;
            box-shadow: 0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-modal-title {
            color: #343529 !important;
            letter-spacing: .015em;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-body {
            background-color: #f6efe2 !important;
            background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0) !important;
            background-size: 16px 16px !important;
            color: #343529 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-item-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-payment-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-meta-row,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .surface-sub {
            background-color: #fffaf0 !important;
            background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0) !important;
            background-size: 16px 16px !important;
            border-color: #ded2ba !important;
            color: #343529 !important;
            box-shadow: 0 10px 24px rgba(60,53,41,.06) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card::before,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section::before {
            content: "";
            display: block;
            width: 44px;
            height: 1px;
            margin: 0 auto .55rem;
            background: linear-gradient(90deg, transparent, rgba(116,125,85,.45), transparent);
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-item-row {
            color: #343529 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-organic-action="primary"],
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button:not([data-pmd-show-bill-toggle])[style*="#062F2A"] {
            background: #747d55 !important;
            background-color: #747d55 !important;
            border-color: #747d55 !important;
            color: #fffaf0 !important;
            -webkit-text-fill-color: #fffaf0 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-split-slider {
            accent-color: #747d55 !important;
          }

          /* PMD_ORGANIC_CHECKOUT_MATCH_GUEST_DIALOGS_20260614
             Keep checkout card in the same botanical/paper family as Waiter/Note dialogs. */
          [data-pmd-checkout-visual-theme="organic_botanical_paper"].pmd-checkout-modal {
            width: min(430px, calc(100vw - 32px)) !important;
            max-width: 430px !important;
            min-width: 0 !important;
            border-radius: 30px !important;
            overflow: hidden !important;
            background: linear-gradient(180deg, rgba(247,243,234,.99), rgba(238,229,211,.99)) !important;
            border: 1px solid #ded2ba !important;
            color: #343529 !important;
            -webkit-text-fill-color: #343529 !important;
            box-shadow: 0 26px 72px rgba(60,53,41,.28), inset 0 1px 0 rgba(255,255,255,.72) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-modal-title,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] h2,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] h3 {
            color: #343529 !important;
            -webkit-text-fill-color: #343529 !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] p,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] span,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] label,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] div {
            text-shadow: none !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-body {
            background: radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0), #f7f3ea !important;
            background-size: 16px 16px !important;
            color: #343529 !important;
            padding: 1rem !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-item-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-payment-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-meta-row,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .surface-sub,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="rounded-2xl"],
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] [class*="rounded-3xl"] {
            background: rgba(255,250,240,.74) !important;
            border-color: #ded2ba !important;
            color: #343529 !important;
            -webkit-text-fill-color: #343529 !important;
            box-shadow: 0 10px 24px rgba(60,53,41,.06) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button {
            min-height: 48px !important;
            border-radius: 9999px !important;
            font-weight: 800 !important;
            text-shadow: none !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-organic-action="primary"],
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[style*="#747d55"],
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[style*="#062F2A"] {
            background: #747d55 !important;
            background-color: #747d55 !important;
            border-color: #747d55 !important;
            color: #fffaf0 !important;
            -webkit-text-fill-color: #fffaf0 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] input,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] textarea {
            background: #f5f8ef !important;
            border-color: #ded2ba !important;
            color: #343529 !important;
            -webkit-text-fill-color: #343529 !important;
          }

        `,
      }}
    />
  )
}
