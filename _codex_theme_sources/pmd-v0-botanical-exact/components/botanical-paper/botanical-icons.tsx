import type React from "react"

/**
 * Lightweight hand-drawn botanical glyphs used across the theme.
 * They inherit `currentColor` so they can be tinted per-context.
 */

type GlyphProps = React.SVGProps<SVGSVGElement>

export function LeafGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" {...props}>
      <path d="M12 21V9" />
      <path d="M12 13c0-3 1.8-5.6 5-6.4C16.6 10 14.8 12.4 12 13Z" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 10C12 7 10.2 4.6 7 3.8 7.4 7 9.2 9.4 12 10Z" fill="currentColor" fillOpacity={0.15} />
    </svg>
  )
}

export function BowlGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11h18a9 9 0 0 1-18 0Z" />
      <path d="M12 11c-1.6-1.2-1.6-3 0-4.5" />
    </svg>
  )
}

export function SproutGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20v-7" />
      <path d="M12 13c0-2.6 1.6-4.8 4.4-5.4C16 10 14.4 12.2 12 13Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M12 11c0-2.6-1.6-4.4-4.4-5C8 8.4 9.6 10.4 12 11Z" fill="currentColor" fillOpacity={0.18} />
    </svg>
  )
}

export function CakeGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" />
      <path d="M4 16h16" />
      <path d="M12 9V6" />
      <circle cx="12" cy="5" r="0.8" fill="currentColor" />
    </svg>
  )
}

export function Grid2Glyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 8c0-1.7 1.3-3 3-3M19 16c0 1.7-1.3 3-3 3" />
      <path d="M9 5h2.5M5 9.5V12M19 14.5V12M14.5 19H12" />
      <path d="M8.5 12.5l3-3M12.5 14.5l3-3" />
    </svg>
  )
}

/** Small twig used to flank section titles. Flip with `mirror`. */
export function OrnamentTwig({ mirror, ...props }: GlyphProps & { mirror?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
      {...props}
    >
      <path d="M2 8h30" />
      <path d="M32 8c3-1 5-3 6-6M32 8c3 1 5 3 6 6" />
      <path d="M20 8c1.2-1.4 3-2 5-2M14 8c1.2 1.4 3 2 5 2" fill="currentColor" fillOpacity={0.15} />
    </svg>
  )
}
