import { ThemeRegistry } from "./ThemeRegistry";

export function getThemeRenderer(theme: string) {
  return ThemeRegistry[theme] || ThemeRegistry.kazen;
}