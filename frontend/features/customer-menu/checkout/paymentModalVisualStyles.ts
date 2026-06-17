import type React from "react"
import { organicCheckoutPrimaryButtonStyle } from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"

type PaymentModalVisualStyleArgs = {
  isKazenJapaneseCheckoutVisual: boolean
  isOrganicCheckoutVisual: boolean
}

export function createPaymentModalVisualStyles({
  isKazenJapaneseCheckoutVisual,
  isOrganicCheckoutVisual,
}: PaymentModalVisualStyleArgs): {
  modalPrimaryBtn: string
  modalPrimaryBtnStyle: React.CSSProperties
  modalSecondaryBtn: string
  iconBackBtn: string
} {
  const modalPrimaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"

  const modalPrimaryBtnStyle: React.CSSProperties = isKazenJapaneseCheckoutVisual
    ? {
        background: "#17120e",
        color: "#f8f0df",
        WebkitTextFillColor: "#f8f0df",
        textShadow: "none",
        border: "1px solid rgba(125, 92, 48, .68)",
        borderRadius: 0,
        boxShadow: "none",
      }
    : isOrganicCheckoutVisual
      ? organicCheckoutPrimaryButtonStyle
      : {
          background: "#062F2A",
          color: "#FFFFFF",
          textShadow: "none",
          border: "1px solid #062F2A",
        }

  const modalSecondaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2"

  const iconBackBtn = "h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"

  return {
    modalPrimaryBtn,
    modalPrimaryBtnStyle,
    modalSecondaryBtn,
    iconBackBtn,
  }
}
