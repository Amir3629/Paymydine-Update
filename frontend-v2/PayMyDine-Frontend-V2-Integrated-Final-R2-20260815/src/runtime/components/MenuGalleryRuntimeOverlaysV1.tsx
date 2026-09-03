'use client'

import { RuntimeOverlays as OrderingRuntimeOverlays } from './OrderingRuntimeOverlaysR60T'
import { FoodGalleryRuntimeEnhancer } from './FoodGalleryRuntimeEnhancer'
import { OptionConfiguratorRuntimeEnhancer } from './OptionConfiguratorRuntimeEnhancer'

// PMD_MENU_GALLERY_OPTIONS_V1
// Preserve the complete ordering/payment overlay while layering the gallery and
// the dedicated guest option configurator on top of the proven ordering runtime.
export function RuntimeOverlays() {
  return (
    <>
      <OrderingRuntimeOverlays />
      <FoodGalleryRuntimeEnhancer />
      <OptionConfiguratorRuntimeEnhancer />
    </>
  )
}
