export const THEME_IDS = [
  'noir_editorial',
  'verdant_modern',
  'lumiere_fine_dining',
  'kazen_japanese',
  'azzurra_coastal',
  'neon_cocktail_bar',
  'art_deco_speakeasy',
  'shahrazad_persian',
  'anatolia_turkish',
  'ember_steakhouse',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export type ThemeCatalogEntry = {
  id: ThemeId
  name: string
  restaurantType: string
  summary: string
  dark: boolean
  aliases: readonly string[]
}

export const THEME_CATALOG: readonly ThemeCatalogEntry[] = [
  { id: 'noir_editorial', name: 'Noir Editorial', restaurantType: "Chef's table / luxury dining", summary: 'Cinematic black canvas, editorial typography, asymmetric food stories.', dark: true, aliases: ['noir', 'modern-dark', 'modern_dark', 'black_luxury'] },
  { id: 'verdant_modern', name: 'Verdant Modern', restaurantType: 'Modern casual / bistro', summary: 'Fast app-like navigation, green surfaces, friendly food cards and service dock.', dark: true, aliases: ['verdant', 'modern_green', 'modern-green', 'green'] },
  { id: 'lumiere_fine_dining', name: 'Lumiere Fine Dining', restaurantType: 'Fine dining / hotel restaurant', summary: 'Light luxury, restrained gold lines, elegant category medallions.', dark: false, aliases: ['lumiere', 'gold-luxury', 'gold_luxury', 'gold', 'clean-light', 'organic_botanical_paper'] },
  { id: 'kazen_japanese', name: 'Kazen Japanese', restaurantType: 'Japanese / omakase', summary: 'Quiet Japanese composition, generous whitespace and accordion menu sections.', dark: false, aliases: ['kazen', 'kazen-japanese', 'minimal', 'japanese'] },
  { id: 'azzurra_coastal', name: 'Azzurra Coastal', restaurantType: 'Mediterranean / seafood', summary: 'Coastal blues, image-led hero, rounded category islands and card grid.', dark: false, aliases: ['azzurra', 'coastal', 'mediterranean', 'seafood'] },
  { id: 'neon_cocktail_bar', name: 'Neon Cocktail Bar', restaurantType: 'Bar / nightlife', summary: 'Electric neon accents, compact cocktail cards and late-night energy.', dark: true, aliases: ['neon', 'cyber_futuristic', 'vibrant-colors', 'bar'] },
  { id: 'art_deco_speakeasy', name: 'Art Deco Speakeasy', restaurantType: 'Premium bar / lounge', summary: 'Black and antique gold geometry inspired by 1920s hospitality.', dark: true, aliases: ['art_deco', 'speakeasy', 'gatsby', 'luxury_gold'] },
  { id: 'shahrazad_persian', name: 'Shahrazad Persian', restaurantType: 'Persian fine dining', summary: 'Emerald, burgundy and ornamental frames for a richly Persian identity.', dark: true, aliases: ['shahrazad', 'persian', 'persian_luxury'] },
  { id: 'anatolia_turkish', name: 'Anatolia Turkish', restaurantType: 'Turkish / grill', summary: 'Terracotta warmth, Ottoman blue tile rhythm and generous grill cards.', dark: false, aliases: ['anatolia', 'turkish', 'velvet_terracotta', 'velvet-terracotta', 'velvet'] },
  { id: 'ember_steakhouse', name: 'Ember Steakhouse', restaurantType: 'Steakhouse / charcoal grill', summary: 'Charcoal surfaces, copper details, fire-led hero and protein-first cards.', dark: true, aliases: ['ember', 'steakhouse', 'charcoal', 'grill_house'] },
] as const

const aliasMap = new Map<string, ThemeId>()
for (const theme of THEME_CATALOG) {
  aliasMap.set(theme.id, theme.id)
  for (const alias of theme.aliases) {
    aliasMap.set(alias.replace(/[\s-]+/g, '_'), theme.id)
  }
}

export function normalizeThemeId(value: unknown, fallback: ThemeId = 'verdant_modern'): ThemeId {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return aliasMap.get(normalized) ?? fallback
}

export function getThemeEntry(themeId: ThemeId): ThemeCatalogEntry {
  return THEME_CATALOG.find((theme) => theme.id === themeId) ?? THEME_CATALOG[1]
}

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value)
}
