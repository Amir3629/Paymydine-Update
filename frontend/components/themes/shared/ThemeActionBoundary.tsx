"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ThemeMenuActions } from "@/components/themes/types"

const ThemeMenuActionsContext = createContext<ThemeMenuActions | null>(null)

export function useThemeMenuActions(): ThemeMenuActions | null {
  return useContext(ThemeMenuActionsContext)
}

type ThemeActionBoundaryProps = {
  actions: ThemeMenuActions
  children: ReactNode
}

export function ThemeActionBoundary({ actions, children }: ThemeActionBoundaryProps) {
  return (
    <ThemeMenuActionsContext.Provider value={actions}>
      {children}
    </ThemeMenuActionsContext.Provider>
  )
}
