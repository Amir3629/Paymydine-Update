import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
        // New Logo-Based Color Palette - Elegant restaurant theme
        brown: {
          50: "#fdf7dd",   // Very light cream
          100: "#fbedb1",  // Light cream  
          200: "#f7d686",  // Soft beige
          300: "#efbe5a",  // Light brown
          400: "#e6a636",  // Medium brown
          500: "#d8b686",  // Primary brown (logo color)
          600: "#c19a5a",  // Darker brown
          700: "#a67f47",  // Deep brown
          800: "#8b6635",  // Very deep brown
          900: "#704f26",  // Darkest brown
        },
        cream: {
          50: "#fefefe",   // Pure white
          100: "#fdf7dd",  // Very light cream
          200: "#fbedb1",  // Light cream
          300: "#f7d686",  // Soft cream
          400: "#efbe5a",  // Warm cream
          500: "#ffedb1",  // Primary cream (logo color)
          600: "#f7d686",  // Medium cream
          700: "#efbe5a",  // Rich cream
          800: "#e6a636",  // Deep cream
          900: "#d89025",  // Darkest cream
        },
        // Legacy mappings for existing components
        gold: {
          50: "#fdf7dd",   // Map to cream
          100: "#fbedb1",
          200: "#f7d686", 
          300: "#efbe5a",
          400: "#e6a636",
          500: "#d8b686",  // Map to primary brown
          600: "#c19a5a",
          700: "#a67f47",
          800: "#8b6635",
          900: "#704f26",
        },
        amber: {
          50: "#fdf7dd",
          100: "#fbedb1",
          200: "#f7d686",
          300: "#efbe5a", 
          400: "#e6a636",
          500: "#ffedb1",  // Map to primary cream
          600: "#f7d686",
          700: "#efbe5a",
          800: "#e6a636",
          900: "#d89025",
        },
        // Keep cyan/navy/lime mappings for backward compatibility
        cyan: {
          50: "#fdf7dd",
          100: "#fbedb1",
          200: "#f7d686",
          300: "#efbe5a",
          400: "#e6a636",
          500: "#d8b686",
          600: "#c19a5a",
          700: "#a67f47",
          800: "#8b6635",
          900: "#704f26",
        },
        navy: {
          50: "#fdf7dd",
          100: "#fbedb1",
          200: "#f7d686",
          300: "#efbe5a",
          400: "#e6a636",
          500: "#d8b686",
          600: "#c19a5a",
          700: "#a67f47",
          800: "#8b6635",
          900: "#704f26",
        },
        lime: {
          50: "#fdf7dd",
          100: "#fbedb1",
          200: "#f7d686",
          300: "#efbe5a",
          400: "#e6a636",
          500: "#ffedb1",
          600: "#f7d686",
          700: "#efbe5a",
          800: "#e6a636",
          900: "#d89025",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
