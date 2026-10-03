import type { ThemeId } from './catalog'

export async function ThemeRenderer({ themeId }: { themeId: ThemeId }) {
  switch (themeId) {
    case 'noir_editorial': {
      const { default: Theme } = await import('./noir-editorial/NoirEditorial')
      return <Theme />
    }
    case 'verdant_modern': {
      const { default: Theme } = await import('./verdant-modern/VerdantModern')
      return <Theme />
    }
    case 'lumiere_fine_dining': {
      const { default: Theme } = await import('./lumiere-fine-dining/LumiereFineDining')
      return <Theme />
    }
    case 'kazen_japanese': {
      const { default: Theme } = await import('./kazen-japanese/KazenJapanese')
      return <Theme />
    }
    case 'azzurra_coastal': {
      const { default: Theme } = await import('./azzurra-coastal/AzzurraCoastal')
      return <Theme />
    }
    case 'neon_cocktail_bar': {
      const { default: Theme } = await import('./neon-cocktail-bar/NeonCocktailBar')
      return <Theme />
    }
    case 'art_deco_speakeasy': {
      const { default: Theme } = await import('./art-deco-speakeasy/ArtDecoSpeakeasy')
      return <Theme />
    }
    case 'shahrazad_persian': {
      const { default: Theme } = await import('./shahrazad-persian/ShahrazadPersian')
      return <Theme />
    }
    case 'anatolia_turkish': {
      const { default: Theme } = await import('./anatolia-turkish/AnatoliaTurkish')
      return <Theme />
    }
    case 'ember_steakhouse': {
      const { default: Theme } = await import('./ember-steakhouse/EmberSteakhouse')
      return <Theme />
    }
    default: {
      const { default: Theme } = await import('./verdant-modern/VerdantModern')
      return <Theme />
    }
  }
}
