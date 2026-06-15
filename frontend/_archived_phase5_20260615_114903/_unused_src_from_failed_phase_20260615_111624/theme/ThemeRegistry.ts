import { KazenRenderer } from "@/themes/kazen/KazenRenderer";
import { ModernGreenRenderer } from "@/themes/modern-green/ModernGreenRenderer";

export const ThemeRegistry: Record<string, any> = {
  kazen: KazenRenderer,
  "modern-green": ModernGreenRenderer,
};