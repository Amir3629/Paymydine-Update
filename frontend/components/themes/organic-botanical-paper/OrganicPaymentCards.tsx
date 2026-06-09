import { ThemeCardFrame, type ThemeCardFrameProps } from "@/components/themes/shared/ThemeCardFrame"

export function OrganicPaymentMethodCardArea(props: ThemeCardFrameProps) {
  return <ThemeCardFrame data-pmd-organic-payment-method-card="1" {...props} />
}

export function OrganicPaymentSummaryCard(props: ThemeCardFrameProps) {
  return <ThemeCardFrame data-pmd-organic-payment-summary-card="1" {...props} />
}
