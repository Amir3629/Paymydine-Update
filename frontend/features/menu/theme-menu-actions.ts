import type { ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"

export type SharedMenuActionHandlers = ThemeMenuActions

export function createThemeMenuActions(actions: SharedMenuActionHandlers): ThemeMenuActions {
  return actions
}
