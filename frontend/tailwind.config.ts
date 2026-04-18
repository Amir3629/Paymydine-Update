import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./*.{ts,tsx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Theme-based colors using CSS variables
        "theme-primary": "var(--theme-primary)",
        "theme-secondary": "var(--theme-secondary)",
        "theme-accent": "var(--theme-accent)",
        "theme-background": "var(--theme-background)",
        "theme-text-primary": "var(--theme-text-primary)",
        "theme-text-secondary": "var(--theme-text-secondary)",
        "theme-text-muted": "var(--theme-text-muted)",
        "theme-border": "var(--theme-border)",
        "theme-input": "var(--theme-input)",
        "theme-button": "var(--theme-button)",
        "theme-button-hover": "var(--theme-button-hover)",
        "theme-menu-item-bg": "var(--theme-menu-item-bg)",
        "theme-menu-item-border": "var(--theme-menu-item-border)",
        "theme-category-active": "var(--theme-category-active)",
        "theme-category-inactive": "var(--theme-category-inactive)",
        "theme-price": "var(--theme-price)",
        "theme-cart-bg": "var(--theme-cart-bg)",
        "theme-cart-border": "var(--theme-cart-border)",
        "theme-payment-button": "var(--theme-payment-button)",
        "theme-payment-button-hover": "var(--theme-payment-button-hover)",
        "theme-success": "var(--theme-success)",
        "theme-warning": "var(--theme-warning)",
        "theme-error": "var(--theme-error)",
        "theme-info": "var(--theme-info)",
        
        // Legacy colors for backward compatibility (with fallbacks)
        "paydine-champagne": "var(--paydine-champagne, #E7CBA9)",
        "paydine-rose-beige": "var(--paydine-rose-beige, #EFC7B1)",
        "paydine-soft-white": "var(--paydine-soft-white, #FAFAFA)",
        "paydine-elegant-gray": "var(--paydine-elegant-gray, #3B3B3B)",
        "paydine-muted-gray": "var(--paydine-muted-gray, #7E7E7E)",
        "paydine-border": "var(--paydine-border, #EDEDED)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-inter)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config