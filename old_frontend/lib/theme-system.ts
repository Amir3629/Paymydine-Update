 // Theme System for PayMyDine

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255'; // fallback to white
}

export interface ThemeColors {
    // Primary colors
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    
    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    
    // UI colors
    border: string;
    input: string;
    button: string;
    buttonHover: string;
    
    // Menu specific colors
    menuItemBackground: string;
    menuItemBorder: string;
    categoryActive: string;
    categoryInactive: string;
    priceColor: string;
    
    // Cart and payment colors
    cartBackground: string;
    cartBorder: string;
    paymentButton: string;
    paymentButtonHover: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
  }
  
  export interface Theme {
    id: string;
    name: string;
    description: string;
    colors: ThemeColors;
  }
  
  // Predefined themes
  export const themes: Record<string, Theme> = {
    'clean-light': {
      id: 'clean-light',
      name: 'Clean Light',
      description: 'Elegant champagne and soft pink theme',
      colors: {
        primary: '#E7CBA9',        // paydine-champagne
        secondary: '#EFC7B1',      // paydine-rose-beige
        accent: '#3B3B3B',         // paydine-elegant-gray
        background: '#FAFAFA',     // paydine-soft-white
        
        textPrimary: '#3B3B3B',    // paydine-elegant-gray
        textSecondary: '#7E7E7E',  // paydine-muted-gray
        textMuted: '#9CA3AF',
        
        border: '#EDEDED',         // paydine-border
        input: '#FFFFFF',
        button: '#E7CBA9',         // paydine-champagne
        buttonHover: '#D4B89A',
        
        menuItemBackground: '#FFFFFF',
        menuItemBorder: '#F3F4F6',
        categoryActive: '#E7CBA9', // paydine-champagne
        categoryInactive: '#9CA3AF',
        priceColor: '#EFC7B1',     // paydine-rose-beige
        
        cartBackground: '#FAFAFA', // paydine-soft-white
        cartBorder: '#EDEDED',     // paydine-border
        paymentButton: '#E7CBA9',  // paydine-champagne
        paymentButtonHover: '#D4B89A',
        
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    },
    
    'modern-dark': {
      id: 'modern-dark',
      name: 'Modern Dark',
      description: 'Sophisticated dark theme with warm rose gold accents',
      colors: {
        // Elegant rose gold palette
        primary: '#F0C6B1',        // Light rose gold
        secondary: '#E8B4A0',      // Deeper rose gold
        accent: '#FFE5D9',         // Soft peach accent
        background: '#0A0E12',     // Deep charcoal with blue undertones

        // Text colors for dark background
        textPrimary: '#F8FAFC',    // Crisp white
        textSecondary: '#CBD5E1',  // Light slate
        textMuted: '#94A3B8',

        // Surfaces and borders
        border: '#334155',         // Medium slate
        input: '#1E293B',          // Dark slate surface
        button: '#F0C6B1',         // Rose gold action
        buttonHover: '#E8B4A0',

        // Cards/list items
        menuItemBackground: '#1E293B',
        menuItemBorder: '#334155',
        categoryActive: '#F0C6B1', // Rose gold for active elements
        categoryInactive: '#64748B',
        priceColor: '#E8B4A0',     // Rose gold for prices

        // Cart and payment surfaces
        cartBackground: '#1E293B',
        cartBorder: '#334155',
        paymentButton: '#F0C6B1',
        paymentButtonHover: '#E8B4A0',

        // Status colors (enhanced for dark theme)
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA'
      }
    },
    
    'gold-luxury': {
      id: 'gold-luxury',
      name: 'Gold Luxury',
      description: 'Opulent dark theme with rich gold and bronze accents',
      colors: {
        // Luxurious gold and bronze palette
        primary: '#FFD700',        // Pure gold
        secondary: '#FFF8DC',      // Cornsilk
        accent: '#FFF8DC',         // Cornsilk accent
        background: '#0F0B05',     // Deep warm black

        textPrimary: '#FFF8DC',    // Warm white
        textSecondary: '#F5DEB3',  // Wheat
        textMuted: '#D2B48C',

        border: '#CD853F',         // Peru border
        input: '#1A1612',          // Dark warm surface
        button: '#FFD700',         // Gold button
        buttonHover: '#FFF8DC',

        menuItemBackground: '#1A1612',
        menuItemBorder: '#CD853F',
        categoryActive: '#FFF8DC', // Cornsilk for active category
        categoryInactive: '#8B7355',
        priceColor: '#FFF8DC',     // Cornsilk prices

        cartBackground: '#1A1612',
        cartBorder: '#CD853F',
        paymentButton: '#FFD700',
        paymentButtonHover: '#FFF8DC',

        success: '#32CD32',
        warning: '#FFD700',
        error: '#FF6347',
        info: '#1E90FF'
      }
    },
    
    'vibrant-colors': {
      id: 'vibrant-colors',
      name: 'Vibrant Colors',
      description: 'Energetic theme with electric coral and ocean turquoise',
      colors: {
        // Vibrant coral and turquoise palette
        primary: '#FF6B6B',        // Electric coral
        secondary: '#6b5e4f',      // Warm orange accent
        accent: '#45B7D1',         // Sky blue accent
        background: '#e2ceb1',     // Cooler, darker warm beige with subtle gray undertones

        textPrimary: '#1E293B',    // Deep slate
        textSecondary: '#475569',  // Medium slate
        textMuted: '#64748B',

        border: '#E2E8F0',         // Light slate border
        input: '#FFFFFF',
        button: '#FF6B6B',         // Electric coral
        buttonHover: '#FF5252',

        menuItemBackground: '#FAF7F2',
        menuItemBorder: '#E8E0D5',
        categoryActive: '#6b5e4f', // Warm brown for active category
        categoryInactive: '#94A3B8',
        priceColor: '#6b5e4f',     // Warm orange accent

        cartBackground: '#FAF7F2',
        cartBorder: '#E8E0D5',
        paymentButton: '#FF6B6B',
        paymentButtonHover: '#FF5252',

        success: '#FF9F43',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#6b5e4f'
      }
    },
    
    'minimal': {
      id: 'minimal',
      name: 'Minimal',
      description: 'Sophisticated monochrome theme with subtle gray tones',
      colors: {
        // Elegant monochrome palette
        primary: '#2D3748',        // Charcoal
        secondary: '#4A5568',      // Slate
        accent: '#718096',         // Light slate accent
        background: '#CFEBF7',     // Light Blue

        textPrimary: '#1A202C',    // Deep charcoal
        textSecondary: '#2D3748',  // Charcoal
        textMuted: '#718096',

        border: '#E2E8F0',         // Very light gray
        input: '#FFFFFF',
        button: '#2D3748',         // Charcoal
        buttonHover: '#1A202C',

        menuItemBackground: '#FFFFFF',
        menuItemBorder: '#F7FAFC',
        categoryActive: '#4A5568', // Slate for active category
        categoryInactive: '#A0AEC0',
        priceColor: '#4A5568',     // Slate

        cartBackground: '#FFFFFF',
        cartBorder: '#E2E8F0',
        paymentButton: '#2D3748',
        paymentButtonHover: '#1A202C',

        success: '#38A169',
        warning: '#D69E2E',
        error: '#E53E3E',
        info: '#3182CE'
      }
    }
  };
  
  // Convert theme colors to CSS variables (with optional runtime overrides)
  export function themeToCSSVariables(theme: Theme, overrides?: Partial<ThemeColors>): Record<string, string> {
    const colors: ThemeColors = { ...theme.colors, ...(overrides || {}) } as ThemeColors;
    return {
      // Core PayMyDine variables (for backward compatibility)
      '--paymydine-primary': colors.primary,
      '--paymydine-secondary': colors.secondary,
      '--paymydine-accent': colors.accent,
      '--paymydine-background': colors.background,
      
      // Legacy PayDine variables (for existing components)
      '--paydine-champagne': colors.primary,
      '--paydine-rose-beige': colors.secondary,
      '--paydine-elegant-gray': colors.textPrimary,
      '--paydine-soft-white': colors.background,
      '--paydine-muted-gray': colors.textSecondary,
      '--paydine-border': colors.border,
      
      // New semantic variables
      '--theme-primary': colors.primary,
      '--theme-secondary': colors.secondary,
      '--theme-accent': colors.accent,
      '--theme-background': colors.background,
      '--theme-text-primary': colors.textPrimary,
      '--theme-text-secondary': colors.textSecondary,
      '--theme-text-muted': colors.textMuted,
      '--theme-border': colors.border,
      '--theme-input': colors.input,
      '--theme-button': colors.button,
      '--theme-button-hover': colors.buttonHover,
      '--theme-menu-item-bg': colors.menuItemBackground,
      '--theme-menu-item-border': colors.menuItemBorder,
      '--theme-category-active': colors.categoryActive,
      '--theme-category-inactive': colors.categoryInactive,
      '--theme-price': colors.priceColor,
      '--theme-cart-bg': colors.cartBackground,
      '--theme-cart-border': colors.cartBorder,
      '--theme-payment-button': colors.paymentButton,
      '--theme-payment-button-hover': colors.paymentButtonHover,
      '--theme-background-rgb': hexToRgb(colors.background),
      '--theme-success': colors.success,
      '--theme-warning': colors.warning,
      '--theme-error': colors.error,
      '--theme-info': colors.info,
    };
  }
  
  // Apply theme to document
  export function applyTheme(themeId: string, overrides?: Partial<ThemeColors>): void {
    const theme = themes[themeId];
    if (!theme) {
      console.warn(`Theme ${themeId} not found, falling back to clean-light`);
      applyTheme('clean-light', overrides);
      return;
    }
    
    // Always set the HTML data attribute for CSS targeting
    document.documentElement.setAttribute('data-theme', themeId);
    
    // Set CSS variables
    const cssVars = themeToCSSVariables(theme, overrides);
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Toggle dark class to allow global overrides for dark designs
    const isDark = themeId === 'modern-dark' || themeId === 'gold-luxury';
    document.documentElement.classList.toggle('theme-dark', isDark);
    
    // NUCLEAR OPTION: Force background colors if overrides provided
    if (overrides?.background) {
      console.log('🚀 applyTheme: Forcing background color:', overrides.background);
      document.body.style.background = overrides.background;
      document.documentElement.style.background = overrides.background;
    } else {
      // Let CSS own the background - no more JS/CSS tug-of-war
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
    }
    
    // Store current theme in localStorage (only on client side)
    if (typeof window !== 'undefined') {
      localStorage.setItem('paymydine-theme', themeId);
    }
  }
  
  // Get current theme from localStorage (SSR safe)
  export function getCurrentTheme(): string {
    if (typeof window === 'undefined') {
      return 'clean-light'; // Default for SSR
    }
    return localStorage.getItem('paymydine-theme') || 'clean-light';
  }
  
  // Initialize theme on app load
  export function initializeTheme(): void {
    const currentTheme = getCurrentTheme();
    applyTheme(currentTheme);
  }