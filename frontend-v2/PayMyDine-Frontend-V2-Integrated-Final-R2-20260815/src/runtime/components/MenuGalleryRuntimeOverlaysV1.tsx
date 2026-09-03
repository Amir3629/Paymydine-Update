'use client'

import { RuntimeOverlays as OrderingRuntimeOverlays } from './OrderingRuntimeOverlaysR60T'
import { FoodGalleryRuntimeEnhancer } from './FoodGalleryRuntimeEnhancer'

// PMD_MENU_GALLERY_OPTIONS_V1
// Preserve the complete ordering/payment overlay and add only food gallery UX.
export function RuntimeOverlays() {
  return (
    <>
      <OrderingRuntimeOverlays />
      <FoodGalleryRuntimeEnhancer />
    </>
  )
}
