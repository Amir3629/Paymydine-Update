import { normalizeThemeForCustomerPages, enforceCustomerPageTheme, PMD_CLEAN_LIGHT_PAGE_BG } from "@/lib/theme-normalizer"
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
        background: PMD_CLEAN_LIGHT_PAGE_BG,     // paydine-soft-white
        
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
        
        cartBackground: '#ffeee2', // paydine-soft-white
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
      description: 'Premium white, dark jade, and champagne gold restaurant theme',
      colors: {
        primary: '#062F2A',
        secondary: '#062F2A',
        accent: '#C89B4A',
        background: '#FAF9F4',

        textPrimary: '#0D1B1E',
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',

        border: '#E8E2D8',
        input: '#FFFFFF',
        button: '#062F2A',
        buttonHover: '#021F1C',

        menuItemBackground: '#FFFFFF',
        menuItemBorder: '#E8E2D8',
        categoryActive: '#C89B4A',
        categoryInactive: '#6B7280',
        priceColor: '#B8893F',

        cartBackground: '#FFFFFF',
        cartBorder: '#E8E2D8',
        paymentButton: '#062F2A',
        paymentButtonHover: '#021F1C',

        success: '#15803D',
        warning: '#C89B4A',
        error: '#B42318',
        info: '#0E7490'
      }
    },

    'organic_botanical_paper': {
      id: 'organic_botanical_paper',
      name: 'Organic Botanical Paper',
      description: 'Warm handcrafted paper theme with sage botanical accents',
      colors: {
        primary: '#737A55',
        secondary: '#FFF9EF',
        accent: '#B8864B',
        background: '#F3EBDD',

        textPrimary: '#352F28',
        textSecondary: '#7D7467',
        textMuted: '#9A907F',

        border: '#D8CBAF',
        input: '#FFF9EF',
        button: '#737A55',
        buttonHover: '#5F6747',

        menuItemBackground: '#FFF9EF',
        menuItemBorder: '#E0D3B8',
        categoryActive: '#737A55',
        categoryInactive: '#A69A83',
        priceColor: '#B8864B',

        cartBackground: '#FFF9EF',
        cartBorder: '#D8CBAF',
        paymentButton: '#737A55',
        paymentButtonHover: '#5F6747',

        success: '#537A4D',
        warning: '#B8864B',
        error: '#A65748',
        info: '#6F7651'
      }
    },
    

    'modern_green': {
      id: 'modern_green',
      name: 'Modern Green',
      description: 'Premium dark green glass restaurant theme',
      colors: {
        primary: '#29BC7E',
        secondary: '#07110D',
        accent: '#29BC7E',
        background: '#030504',

        textPrimary: '#F4F8F5',
        textSecondary: '#B8C4BC',
        textMuted: '#7C8B82',

        border: '#20342A',
        input: '#101A15',
        button: '#29BC7E',
        buttonHover: '#20A96E',

        menuItemBackground: '#0D1712',
        menuItemBorder: '#20342A',
        categoryActive: '#29BC7E',
        categoryInactive: '#7C8B82',
        priceColor: '#F4F8F5',

        cartBackground: '#101A15',
        cartBorder: '#20342A',
        paymentButton: '#29BC7E',
        paymentButtonHover: '#20A96E',

        success: '#29BC7E',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA'
      }
    },


    'kazen_japanese': {
      id: 'kazen_japanese',
      name: 'Kazen Japanese Minimal',
      description: 'Quiet Japanese editorial menu with ink, paper, seasonal mist, and muted red accents',
      colors: {
        primary: '#242320',
        secondary: '#F7F3EC',
        accent: '#B85D59',
        background: '#F7F3EC',

        textPrimary: '#242320',
        textSecondary: '#77716A',
        textMuted: '#9B948B',

        border: '#D8D1C6',
        input: '#FBF8F2',
        button: '#B85D59',
        buttonHover: '#9F4F4B',

        menuItemBackground: '#FBF8F2',
        menuItemBorder: '#D8D1C6',
        categoryActive: '#B85D59',
        categoryInactive: '#77716A',
        priceColor: '#242320',

        cartBackground: '#FBF8F2',
        cartBorder: '#D8D1C6',
        paymentButton: '#242320',
        paymentButtonHover: '#11100E',

        success: '#6F7651',
        warning: '#B8864B',
        error: '#B85D59',
        info: '#6A7477'
      }
    },
    'vibrant-colors': {
      id: 'vibrant-colors',
      name: 'Vibrant Colors',
      description: 'Energetic theme with electric coral and ocean turquoise',
      colors: {
        // Vibrant coral and turquoise palette
        primary: '#efc6b1',        // Electric coral
        secondary: '#efc6b1',      // Electric coral (matching primary)
        accent: '#45B7D1',         // Sky blue accent
        background: '#e2ceb1',     // Cooler, darker warm beige with subtle gray undertones

        textPrimary: '#1E293B',    // Deep slate
        textSecondary: '#475569',  // Medium slate
        textMuted: '#64748B',

        border: '#E2E8F0',         // Light slate border
        input: '#FFFFFF',
        button: '#efc6b1',         // BUTTON/ICONS1 source color
        buttonHover: '#FF5252',

        menuItemBackground: '#FAF7F2',
        menuItemBorder: '#E8E0D5',
        categoryActive: '#efc6b1', // Electric coral for active category
        categoryInactive: '#94A3B8',
        priceColor: '#efc6b1',     // Electric coral

        cartBackground: '#FAF7F2',
        cartBorder: '#E8E0D5',
        paymentButton: '#efc6b1',
        paymentButtonHover: '#FF5252',

        success: '#FF9F43',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#efc6b1'
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
      '--pmd-customer-page-bg': colors.background,
      '--pmd-customer-surface': colors.cartBackground,
      '--pmd-customer-surface-sub': colors.menuItemBackground,
      '--pmd-customer-text': colors.textPrimary,
      '--pmd-customer-text-muted': colors.textSecondary,
      '--pmd-customer-action-bg': colors.button,
      '--pmd-customer-button-icons1-bg': colors.button,
      '--pmd-customer-action-text': (theme.id === 'clean-light' || theme.id === 'vibrant-colors' || theme.id === 'minimal') ? '#111827' : '#F8FAFC',
      '--pmd-customer-button-icons1-text': (theme.id === 'clean-light' || theme.id === 'vibrant-colors' || theme.id === 'minimal') ? '#111827' : '#F8FAFC',
      '--pmd-customer-action-border': colors.border,
      '--pmd-customer-button-icons1-border': colors.border,
      '--pmd-customer-frame-border': colors.border,
      '--pmd-customer-border': colors.border,
      '--pmd-customer-input-bg': colors.input,
      '--pmd-customer-input-text': colors.textPrimary,
      '--pmd-customer-price-text': colors.priceColor,
      '--pmd-customer-category-active-bg': colors.categoryActive,
      '--pmd-customer-category-active-text': theme.id === 'modern-dark' ? '#111827' : colors.textPrimary,
      '--pmd-customer-badge-bg': colors.button,
      '--pmd-customer-badge-text': (theme.id === 'clean-light' || theme.id === 'vibrant-colors' || theme.id === 'minimal') ? '#111827' : '#F8FAFC',
      '--pmd-customer-badge-border': colors.border,
    };
  }
  
  // Apply theme to document
  export function applyTheme(themeId: string, overrides?: Partial<ThemeColors>): void {
    const theme = themes[themeId];
    if (!theme) {
      console.warn(`Theme ${themeId} not found, falling back to gold-luxury`);
      applyTheme('gold-luxury', overrides);
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
    const isDark = themeId === 'modern-dark';
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
      return 'gold-luxury'; // Default for SSR
    }
    return localStorage.getItem('paymydine-theme') || 'gold-luxury';
  }
  
  // Initialize theme on app load
  export function initializeTheme(): void {
    const currentTheme = getCurrentTheme();
    applyTheme(currentTheme);
  }
