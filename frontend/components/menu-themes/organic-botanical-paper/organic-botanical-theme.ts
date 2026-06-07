import type React from 'react'
export const ORGANIC_BOTANICAL_THEME_KEY = 'organic_botanical_paper'

export const organicBotanicalDefaults = {
  primary: '#737A55',
  accent: '#B8864B',
  background: '#F3EBDD',
  surface: '#FFF9EF',
  text: '#352F28',
  muted: '#7D7467',
}

export function organicBotanicalVars() {
  return {
    '--organic-primary': 'var(--theme-primary, #737A55)',
    '--organic-accent': 'var(--theme-accent, #B8864B)',
    '--organic-bg': 'var(--theme-background, #F3EBDD)',
    '--organic-surface': 'var(--theme-menu-item-bg, #FFF9EF)',
    '--organic-text': 'var(--theme-text-primary, #352F28)',
    '--organic-muted': 'var(--theme-text-secondary, #7D7467)',
  } as React.CSSProperties
}
