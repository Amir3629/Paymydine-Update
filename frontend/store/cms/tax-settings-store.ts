import { useCmsStore } from "@/store/cms-store"

export function useTaxSettingsStore() {
  const taxSettings = useCmsStore((state) => state.taxSettings)
  const loadVATSettings = useCmsStore((state) => state.loadVATSettings)
  const loadTaxSettings = useCmsStore((state) => state.loadTaxSettings)
  const updateVATSettings = useCmsStore((state) => state.updateVATSettings)
  const updateTaxSettings = useCmsStore((state) => state.updateTaxSettings)

  return {
    taxSettings,
    loadVATSettings,
    loadTaxSettings,
    updateVATSettings,
    updateTaxSettings,
  }
}

export function getTaxSettingsSnapshot() {
  return useCmsStore.getState().taxSettings
}
