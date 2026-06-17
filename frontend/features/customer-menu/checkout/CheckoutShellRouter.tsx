"use client"

import { NeutralCheckoutShell } from "@/features/customer-menu/checkout/NeutralCheckoutShell"
import { renderThemedCheckoutShellRoute } from "@/features/customer-menu/checkout/ThemedCheckoutShellRoutes"

export function CheckoutShellRouter(props: any) {
  if (!props?.isOpen) return null

  const themedCheckoutShell = renderThemedCheckoutShellRoute(props)
  if (themedCheckoutShell) return themedCheckoutShell

  return <NeutralCheckoutShell {...props} />
}
