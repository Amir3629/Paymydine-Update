import { useCmsStore } from "@/store/cms-store"

export function useCmsConfigStore() {
  const settings = useCmsStore((state) => state.settings)
  const menuItems = useCmsStore((state) => state.menuItems)
  const updateSettings = useCmsStore((state) => state.updateSettings)
  const updateMenuItem = useCmsStore((state) => state.updateMenuItem)
  const setMenuItems = useCmsStore((state) => state.setMenuItems)
  const isInitialized = useCmsStore((state) => state.isInitialized)

  return {
    settings,
    menuItems,
    updateSettings,
    updateMenuItem,
    setMenuItems,
    isInitialized,
  }
}

export function getCmsConfigSnapshot() {
  const state = useCmsStore.getState()
  return {
    settings: state.settings,
    menuItems: state.menuItems,
    isInitialized: state.isInitialized,
  }
}
