"use client"

import type { ThemeDockProps } from "@/components/themes/shared/ThemeActionContract"
import { SharedBottomDock } from "@/components/themes/shared/SharedBottomDock"

export function OrganicBottomDock(props: ThemeDockProps) {
  return <SharedBottomDock theme="organic" {...props} />
}
