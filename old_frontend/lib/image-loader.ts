/**
 * Custom image loader for Next.js Image component
 * This handles both development and production image URLs properly
 */

export interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}

function imageLoader({ src, width, quality = 75 }: ImageLoaderProps): string {
  // If it's already a full URL, return as is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  
  // If it's a relative path starting with /api/media
  if (src.startsWith('/api/media/')) {
    // In development, use relative path (will go through Next.js proxy)
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return src
    }
    
    // In production, construct full URL to backend
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'amir.paymydine.com'
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'
    return `${protocol}//${currentDomain}${src}`
  }
  
  // For other relative paths (like /placeholder.svg), return as is
  return src
}

// Export as default function (required by Next.js)
export default imageLoader 