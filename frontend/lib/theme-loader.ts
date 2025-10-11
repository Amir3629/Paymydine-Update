import { apiClient } from "@/lib/api-client";
import { applyTheme } from "@/lib/theme-system";

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

    // Extract color overrides from admin
    const overrides: Record<string, string> = {};
    if (data.primary_color) overrides.primary = data.primary_color;
    if (data.secondary_color) overrides.secondary = data.secondary_color;
    if (data.accent_color) overrides.accent = data.accent_color;
    if (data.background_color) overrides.background = data.background_color;

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

