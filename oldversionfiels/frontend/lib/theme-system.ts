 // Theme System for PayMyDine
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
      description: 'Refined dark theme with warm champagne/rose accents',
      colors: {
        // Warm, elegant accents inspired by the light theme palette
        primary: '#E7CBA9',        // Champagne
        secondary: '#EFC7B1',      // Rose beige (can be used for highlights)
        accent: '#F0E7DF',         // Soft warm light for subtle accents
        background: '#0B0F14',     // Deep slate blue-black

        // Text colors for dark background
        textPrimary: '#F3F4F6',    // Near-white for strong contrast
        textSecondary: '#C7CDD4',  // Muted cool gray
        textMuted: '#9AA3AE',

        // Surfaces and borders
        border: '#223042',         // Desaturated blue-gray
        input: '#121923',          // Slightly lifted from background
        button: '#E7CBA9',         // Champagne action
        buttonHover: '#D6B890',

        // Cards/list items
        menuItemBackground: '#121923',
        menuItemBorder: '#223042',
        categoryActive: '#EFC7B1', // Rose beige for active pill/underline
        categoryInactive: '#6B7280',
        priceColor: '#EFC7B1',     // Keep prices in soft rose

        // Cart and payment surfaces
        cartBackground: '#121923',
        cartBorder: '#223042',
        paymentButton: '#E7CBA9',
        paymentButtonHover: '#D6B890',

        // Status colors (kept vivid but readable on dark)
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    },
    
    'gold-luxury': {
      id: 'gold-luxury',
      name: 'Gold Luxury',
      description: 'Luxurious dark theme with gold accents',
      colors: {
        primary: '#F59E0B',        // Gold
        secondary: '#FCD34D',      // Light gold
        accent: '#FEF3C7',         // Very light gold
        background: '#1F2937',     // Dark gray
        
        textPrimary: '#FEF3C7',    // Very light gold
        textSecondary: '#FCD34D',  // Light gold
        textMuted: '#F59E0B',
        
        border: '#374151',
        input: '#111827',
        button: '#F59E0B',         // Gold
        buttonHover: '#D97706',
        
        menuItemBackground: '#111827',
        menuItemBorder: '#374151',
        categoryActive: '#F59E0B', // Gold
        categoryInactive: '#6B7280',
        priceColor: '#FCD34D',     // Light gold
        
        cartBackground: '#111827',
        cartBorder: '#374151',
        paymentButton: '#F59E0B',  // Gold
        paymentButtonHover: '#D97706',
        
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    },
    
    'vibrant-colors': {
      id: 'vibrant-colors',
      name: 'Vibrant Colors',
      description: 'Bright and energetic coral and turquoise theme',
      colors: {
        primary: '#EF4444',        // Coral red
        secondary: '#10B981',      // Turquoise
        accent: '#1F2937',         // Dark gray
        background: '#FFFFFF',     // White
        
        textPrimary: '#1F2937',    // Dark gray
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',
        
        border: '#E5E7EB',
        input: '#FFFFFF',
        button: '#EF4444',         // Coral red
        buttonHover: '#DC2626',
        
        menuItemBackground: '#FFFFFF',
        menuItemBorder: '#F3F4F6',
        categoryActive: '#EF4444', // Coral red
        categoryInactive: '#9CA3AF',
        priceColor: '#10B981',     // Turquoise
        
        cartBackground: '#F9FAFB',
        cartBorder: '#E5E7EB',
        paymentButton: '#EF4444',  // Coral red
        paymentButtonHover: '#DC2626',
        
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    },
    
    'minimal': {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean black and white minimal theme',
      colors: {
        primary: '#374151',        // Dark gray
        secondary: '#6B7280',      // Medium gray
        accent: '#111827',         // Very dark gray
        background: '#FFFFFF',     // White
        
        textPrimary: '#111827',    // Very dark gray
        textSecondary: '#374151',  // Dark gray
        textMuted: '#6B7280',
        
        border: '#E5E7EB',
        input: '#FFFFFF',
        button: '#374151',         // Dark gray
        buttonHover: '#1F2937',
        
        menuItemBackground: '#FFFFFF',
        menuItemBorder: '#F3F4F6',
        categoryActive: '#374151', // Dark gray
        categoryInactive: '#9CA3AF',
        priceColor: '#6B7280',     // Medium gray
        
        cartBackground: '#F9FAFB',
        cartBorder: '#E5E7EB',
        paymentButton: '#374151',  // Dark gray
        paymentButtonHover: '#1F2937',
        
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
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
    
    const cssVars = themeToCSSVariables(theme, overrides);
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  // Toggle dark class to allow global overrides for dark designs
  const isDark = themeId === 'modern-dark' || themeId === 'gold-luxury';
  document.documentElement.classList.toggle('theme-dark', isDark);
  if (isDark) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--theme-background') || '#0B0F14';
    // Programmatic matte dark + vignette to guarantee effect regardless of CSS bundling
    const matteVignette = `radial-gradient(1200px 600px at 20% 0%, rgba(231,203,169,0.07), transparent 60%),
radial-gradient(900px 500px at 80% 10%, rgba(239,199,177,0.06), transparent 60%),
radial-gradient(1200px 800px at 50% 120%, rgba(0,0,0,0.70), transparent 70%),
radial-gradient(1200px 800px at -20% -20%, rgba(0,0,0,0.60), transparent 70%),
radial-gradient(1200px 800px at 120% -20%, rgba(0,0,0,0.60), transparent 70%), ${bg.trim()}`;
    document.body.style.background = matteVignette;
  } else {
    // Restore clean background on light themes
    document.body.style.background = '';
    document.body.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-background') || '#FAFAFA';
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