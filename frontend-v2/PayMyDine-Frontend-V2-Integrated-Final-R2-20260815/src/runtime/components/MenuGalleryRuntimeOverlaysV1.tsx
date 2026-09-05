'use client'

import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { localizeMenuOptionContentInPlace } from '@/src/runtime/menu-option-content-i18n'
import { RuntimeOverlays as OrderingRuntimeOverlays } from './OrderingRuntimeOverlaysR60T'
import { FoodGalleryRuntimeEnhancer } from './FoodGalleryRuntimeEnhancer'
import { OptionConfiguratorRuntimeEnhancer } from './OptionConfiguratorRuntimeEnhancer'

// PMD_MENU_GALLERY_OPTIONS_V1
// Preserve the complete ordering/payment overlay while layering the gallery and
// the dedicated guest option configurator on top of the proven ordering runtime.
export function RuntimeOverlays() {
  const runtime = useMenuRuntime()
  localizeMenuOptionContentInPlace(runtime.bootstrap.menu.items, runtime.locale)

  return (
    <>
      <OrderingRuntimeOverlays />
      <FoodGalleryRuntimeEnhancer />
      <OptionConfiguratorRuntimeEnhancer />
    </>
  )
}
