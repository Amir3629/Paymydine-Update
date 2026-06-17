import { useCmsStore } from "@/store/cms-store"

export function usePaymentSettingsStore() {
  const paymentOptions = useCmsStore((state) => state.paymentOptions)
  const merchantSettings = useCmsStore((state) => state.merchantSettings)
  const loadMerchantSettings = useCmsStore((state) => state.loadMerchantSettings)
  const updateMerchantSettings = useCmsStore((state) => state.updateMerchantSettings)
  const togglePaymentOption = useCmsStore((state) => state.togglePaymentOption)

  return {
    paymentOptions,
    merchantSettings,
    loadMerchantSettings,
    updateMerchantSettings,
    togglePaymentOption,
  }
}

export function getPaymentSettingsSnapshot() {
  const state = useCmsStore.getState()
  return {
    paymentOptions: state.paymentOptions,
    merchantSettings: state.merchantSettings,
  }
}
