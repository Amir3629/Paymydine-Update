'use client'

import type { CSSProperties, HTMLAttributes } from 'react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

type HeadingTag = 'h1' | 'h2' | 'h3'

type ResponsiveRestaurantNameProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'children'> & {
  as?: HeadingTag
  style?: CSSProperties
}

function responsiveFontSize(length: number): CSSProperties['fontSize'] {
  if (length > 52) return 'clamp(1.15rem, 4.2vw, 2.35rem)'
  if (length > 42) return 'clamp(1.3rem, 4.8vw, 2.7rem)'
  if (length > 34) return 'clamp(1.5rem, 5.6vw, 3.15rem)'
  if (length > 26) return 'clamp(1.75rem, 6.6vw, 3.65rem)'
  if (length > 18) return 'clamp(2rem, 7.8vw, 4.15rem)'
  return 'clamp(2.4rem, 10.5vw, 5.2rem)'
}

export function ResponsiveRestaurantName({
  as = 'h1',
  style,
  ...props
}: ResponsiveRestaurantNameProps) {
  const { bootstrap } = useMenuRuntime()
  const name = bootstrap.restaurant.name?.trim() || 'Restaurant'
  const length = Array.from(name).length
  const Heading = as
  const hasVeryLongToken = name.split(/\s+/).some((part) => Array.from(part).length > 24)

  const safetyStyle: CSSProperties = {
    maxWidth: '100%',
    minWidth: 0,
    display: 'block',
    whiteSpace: 'normal',
    overflowWrap: hasVeryLongToken ? 'anywhere' : 'normal',
    wordBreak: 'normal',
    hyphens: 'none',
    fontSize: responsiveFontSize(length),
    lineHeight: length > 34 ? 0.98 : 1.02,
    letterSpacing: length > 42 ? '-0.025em' : undefined,
  }

  return (
    <Heading
      {...props}
      data-pmd-hero-restaurant-name="r47"
      data-pmd-name-length={length}
      style={{ ...style, ...safetyStyle }}
    >
      {name}
    </Heading>
  )
}
