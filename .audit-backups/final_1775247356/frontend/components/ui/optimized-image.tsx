"use client"

import React from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
}

export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  ...props
}: OptimizedImageProps) {
  // Check if this is an API media URL - these need special handling
  const isApiMedia = src?.startsWith('/api/media/') || src?.includes('/api/media/')
  
  // For API media URLs, use regular img tag to bypass Next.js image optimization
  // This ensures images load directly from the backend without going through _next/image
  if (isApiMedia) {
    if (fill) {
      return (
        <img
          src={src}
          alt={alt}
          className={className}
          style={{ objectFit: 'contain', width: '100%', height: '100%' }}
          {...(props as any)}
        />
      )
    }
    
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        {...(props as any)}
      />
    )
  }
  
  // For other images, use Next.js Image component
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        quality={quality}
        unoptimized={true}
        {...props}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={quality}
      unoptimized={true}
      {...props}
    />
  )
} 