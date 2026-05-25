export const PMD_CLEAN_LIGHT_PAGE_BG = "#fdf7f4"
export const PMD_CLEAN_LIGHT_SURFACE = "#FAFAFA"
export const PMD_CLEAN_LIGHT_ROSE = "#f0c6b1"
export const PMD_CLEAN_LIGHT_ROSE_EDGE = "#c7a798"

type ThemeLike = Record<string, any>

export function isCleanLightTheme(themeName?: string | null) {
  return String(themeName || "").toLowerCase() === "clean-light"
}

export function normalizeThemeForCustomerPages<T extends ThemeLike | null | undefined>(
  themeName: string | null | undefined,
  colors: T,
): T {
  if (!colors || !isCleanLightTheme(themeName)) return colors

  return {
    ...colors,
    // Important: page background is not the same as card/surface.
    background: PMD_CLEAN_LIGHT_PAGE_BG,
    surface: colors.surface ?? PMD_CLEAN_LIGHT_SURFACE,
    secondary: colors.secondary ?? PMD_CLEAN_LIGHT_ROSE,
    border: colors.border ?? "rgba(199, 167, 152, 0.35)",
  } as T
}

export function enforceCustomerPageTheme(themeName?: string | null) {
  if (typeof window === "undefined" || !isCleanLightTheme(themeName)) return

  const root = document.documentElement
  const body = document.body

  root.style.setProperty("--theme-background", PMD_CLEAN_LIGHT_PAGE_BG)
  root.style.setProperty("--theme-surface", PMD_CLEAN_LIGHT_SURFACE)
  root.style.setProperty("--pmd-rose-fill", PMD_CLEAN_LIGHT_ROSE)
  root.style.setProperty("--pmd-rose-edge", PMD_CLEAN_LIGHT_ROSE_EDGE)

  root.style.background = PMD_CLEAN_LIGHT_PAGE_BG
  body.style.background = PMD_CLEAN_LIGHT_PAGE_BG
  body.style.backgroundColor = PMD_CLEAN_LIGHT_PAGE_BG

  document.querySelectorAll<HTMLElement>(
    ".page--home, .page--menu, .page--valet, .bg-theme-background, main, .min-h-screen",
  ).forEach((el) => {
    el.style.backgroundColor = PMD_CLEAN_LIGHT_PAGE_BG
  })
}
