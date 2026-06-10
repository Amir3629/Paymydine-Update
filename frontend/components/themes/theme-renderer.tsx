import type { ComponentType, ReactNode } from "react"
import type { ThemeCanonicalId } from "@/lib/theme-registry"
import { getThemeConfig } from "@/lib/theme-registry"
import { ThemeActionSlot } from "@/components/themes/shared/ThemeActionSlot"
import { ThemeMenuSection } from "@/components/themes/shared/ThemeMenuSection"
import { ThemeMenuShell } from "@/components/themes/shared/ThemeMenuShell"
import {
  GoldActionButtonsSlot,
  GoldBottomToolbarSlot,
  GoldCheckoutTriggerSlot,
  GoldHeaderSlot,
  GoldHeroSlot,
  GoldItemCardSlot,
  GoldMenuCategorySlot,
  GoldMenuShell,
  GoldNoteActionSlot,
  GoldTableOrderActionSlot,
  GoldValetActionSlot,
  GoldWaiterActionSlot,
} from "@/components/themes/gold-luxury"
import {
  OrganicActionButtonsSlot,
  OrganicBotanicalTopBarSlot,
  OrganicCheckoutTriggerSlot,
  OrganicItemCardSlot,
  OrganicMenuCategorySlot,
  OrganicMenuShell,
  OrganicNoteActionSlot,
  OrganicTableOrderActionSlot,
  OrganicValetActionSlot,
  OrganicWaiterActionSlot,
} from "@/components/themes/organic-botanical-paper"
import type { ThemeActionSlotProps } from "@/components/themes/shared/ThemeActionSlot"
import type { ThemeMenuSectionProps } from "@/components/themes/shared/ThemeMenuSection"
import type { ThemeMenuShellProps } from "@/components/themes/shared/ThemeMenuShell"

type ThemeSlotComponent = ComponentType<ThemeMenuSectionProps | ThemeActionSlotProps>

export type ThemeMenuComponentSet = {
  Shell: ComponentType<ThemeMenuShellProps>
  Header: ThemeSlotComponent
  Hero: ThemeSlotComponent
  Category: ThemeSlotComponent
  ItemCard: ThemeSlotComponent
  BottomToolbar: ThemeSlotComponent
  ActionButtons: ThemeSlotComponent
  CheckoutTrigger: ThemeSlotComponent
  WaiterAction: ThemeSlotComponent
  NoteAction: ThemeSlotComponent
  TableOrderAction: ThemeSlotComponent
  ValetAction: ThemeSlotComponent
}

const goldThemeComponents = {
  Shell: GoldMenuShell,
  Header: GoldHeaderSlot,
  Hero: GoldHeroSlot,
  Category: GoldMenuCategorySlot,
  ItemCard: GoldItemCardSlot,
  BottomToolbar: GoldBottomToolbarSlot,
  ActionButtons: GoldActionButtonsSlot,
  CheckoutTrigger: GoldCheckoutTriggerSlot,
  WaiterAction: GoldWaiterActionSlot,
  NoteAction: GoldNoteActionSlot,
  TableOrderAction: GoldTableOrderActionSlot,
  ValetAction: GoldValetActionSlot,
} satisfies ThemeMenuComponentSet

const organicThemeComponents = {
  Shell: OrganicMenuShell,
  Header: OrganicBotanicalTopBarSlot,
  Hero: OrganicBotanicalTopBarSlot,
  Category: OrganicMenuCategorySlot,
  ItemCard: OrganicItemCardSlot,
  BottomToolbar: OrganicActionButtonsSlot,
  ActionButtons: OrganicActionButtonsSlot,
  CheckoutTrigger: OrganicCheckoutTriggerSlot,
  WaiterAction: OrganicWaiterActionSlot,
  NoteAction: OrganicNoteActionSlot,
  TableOrderAction: OrganicTableOrderActionSlot,
  ValetAction: OrganicValetActionSlot,
} satisfies ThemeMenuComponentSet

const neutralThemeComponents = {
  Shell: ThemeMenuShell,
  Header: ThemeMenuSection,
  Hero: ThemeMenuSection,
  Category: ThemeMenuSection,
  ItemCard: ThemeMenuSection,
  BottomToolbar: ThemeMenuSection,
  ActionButtons: ThemeActionSlot,
  CheckoutTrigger: ThemeActionSlot,
  WaiterAction: ThemeActionSlot,
  NoteAction: ThemeActionSlot,
  TableOrderAction: ThemeActionSlot,
  ValetAction: ThemeActionSlot,
} satisfies ThemeMenuComponentSet

const themeComponentRegistry = {
  "gold-luxury": goldThemeComponents,
  organic_botanical_paper: organicThemeComponents,
  modern_green: neutralThemeComponents,
} satisfies Record<ThemeCanonicalId, ThemeMenuComponentSet>

export type ThemeMenuRendererSlot = keyof ThemeMenuComponentSet

export function getThemeComponents(themeId: string | null | undefined): ThemeMenuComponentSet {
  const rawThemeId = String(themeId ?? "").trim()

  if (!rawThemeId) {
    return neutralThemeComponents
  }

  const config = getThemeConfig(rawThemeId)
  return themeComponentRegistry[config.canonicalId] || goldThemeComponents
}

export function ThemeMenuRenderer({
  themeId,
  slot = "Shell",
  children,
  ...props
}: ThemeMenuShellProps & {
  themeId: string | null | undefined
  slot?: ThemeMenuRendererSlot
  children?: ReactNode
}) {
  const components = getThemeComponents(themeId)
  const Component = components[slot] || components.Shell
  return <Component {...props}>{children}</Component>
}
