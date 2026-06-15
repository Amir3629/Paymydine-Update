"use client"

import type { ThemeDockProps } from "@/components/themes/shared/ThemeActionContract"
import { SharedBottomDock } from "@/components/themes/shared/SharedBottomDock"

export function GoldBottomDock(props: ThemeDockProps) {
  return <SharedBottomDock theme="gold" {...props} />
}
