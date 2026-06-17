import { useCmsStore } from "@/store/cms-store"

export function useTipSettingsStore() {
  const tipSettings = useCmsStore((state) => state.tipSettings)
  const updateTipSettings = useCmsStore((state) => state.updateTipSettings)

  return { tipSettings, updateTipSettings }
}

export function getTipSettingsSnapshot() {
  return useCmsStore.getState().tipSettings
}
