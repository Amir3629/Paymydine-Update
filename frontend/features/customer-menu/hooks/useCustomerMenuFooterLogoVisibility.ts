type UseCustomerMenuFooterLogoVisibilityParams = {
  isModernGreenTheme: boolean
  isOrganicBotanicalTheme: boolean
}

export function useCustomerMenuFooterLogoVisibility({
  isModernGreenTheme,
  isOrganicBotanicalTheme,
}: UseCustomerMenuFooterLogoVisibilityParams) {
  return isModernGreenTheme || isOrganicBotanicalTheme
}
