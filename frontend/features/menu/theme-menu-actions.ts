import type { ThemeMenuActions } from "@/components/themes/types"

export type SharedMenuActionHandlers = ThemeMenuActions

export function createThemeMenuActions(actions: SharedMenuActionHandlers): ThemeMenuActions {
  return actions
}
