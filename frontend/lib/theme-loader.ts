import { apiClient } from "@/lib/api-client";
import { applyTheme } from "@/lib/theme-system";
import { themes } from "@/lib/theme-system";

/**
 * Get tenant ID from hostname for localStorage scoping
 */
function tenantIdFromHost(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length >= 3 ? parts[0] : "default";
}

/**
 * Initialize theme from admin settings
 * 
 * This function:
 * 1. Fetches theme from GET /simple-theme endpoint
 * 2. Applies admin-selected theme via applyTheme()
 * 3. Stores in tenant-scoped localStorage
 * 4. Returns theme data for caching
 * 
 * Call this ONCE on app boot in ThemeProvider
 */
export async function initThemeFromAdmin(): Promise<{themeId?: string, overrides?: Record<string,string>}> {
  console.log('🎨 ThemeLoader: Fetching admin-selected theme...');
  
  try {
    const res = await apiClient.getThemeSettings(); // hits /simple-theme
    const data = res?.data || {};
    const themeId: string = data.theme_id || res?.frontend_theme || "clean-light";

    const overrides = buildSafeThemeOverrides(themeId, data);

    console.log(`✅ ThemeLoader: Applying admin theme "${themeId}"`, overrides);
    applyTheme(themeId, overrides);

    // Store in tenant-scoped localStorage
    if (typeof window !== "undefined") {
      const key = `${tenantIdFromHost(window.location.hostname)}:paymydine-theme`;
      try { 
        localStorage.setItem(key, themeId);
        console.log(`💾 ThemeLoader: Stored theme for tenant key: ${key}`);
      } catch (e) {
        console.warn('Failed to store theme in localStorage:', e);
      }
    }
    
    // Return theme data for caching
    return { themeId, overrides };
  } catch (e) {
    console.error('❌ ThemeLoader: Failed to load admin theme:', e);
    // Fallback to default theme
    applyTheme("clean-light");
    return {};
  }
}

const CLEAN_LIGHT_DEFAULTS = {
  primary: "#E7CBA9",
  secondary: "#EFC7B1",
  accent: "#3B3B3B",
  background: "#FAFAFA",
};

function normHex(v?: string | null): string {
  return String(v || "").trim().toUpperCase();
}

export function buildSafeThemeOverrides(themeId: string, data: any): Record<string, string> {
  const raw: Record<string, string> = {};
  if (data?.primary_color) raw.primary = data.primary_color;
  if (data?.secondary_color) raw.secondary = data.secondary_color;
  if (data?.accent_color) raw.accent = data.accent_color;
  if (data?.background_color) raw.background = data.background_color;

  if (!Object.keys(raw).length) return {};

  const isNonClean = themeId !== "clean-light";
  const looksLikeCleanDefaults =
    normHex(raw.primary) === CLEAN_LIGHT_DEFAULTS.primary &&
    normHex(raw.secondary) === CLEAN_LIGHT_DEFAULTS.secondary &&
    normHex(raw.accent) === CLEAN_LIGHT_DEFAULTS.accent &&
    normHex(raw.background) === CLEAN_LIGHT_DEFAULTS.background;

  if (isNonClean && looksLikeCleanDefaults) return {};

  const base = themes[themeId]?.colors;
  if (!base) return raw;

  const safe: Record<string, string> = {};
  if (raw.primary && normHex(raw.primary) !== normHex(base.primary)) safe.primary = raw.primary;
  if (raw.secondary && normHex(raw.secondary) !== normHex(base.secondary)) safe.secondary = raw.secondary;
  if (raw.accent && normHex(raw.accent) !== normHex(base.accent)) safe.accent = raw.accent;
  if (raw.background && normHex(raw.background) !== normHex(base.background)) safe.background = raw.background;
  return safe;
}
