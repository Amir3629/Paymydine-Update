'use client'

import { useEffect } from 'react'
import { EnvironmentConfig } from '@/lib/environment-config'

/**
 * Component that dynamically sets the favicon from admin settings
 * Fetches favicon_logo from API and updates the favicon link tag
 */
export function FaviconSetter() {
  useEffect(() => {
    const setFavicon = async () => {
      try {
        const env = EnvironmentConfig.getInstance()
        const res = await fetch(env.getApiEndpoint('/settings'), {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        
        if (!res.ok) {
          console.warn('Failed to fetch settings for favicon')
          return
        }
        
        const json = await res.json()
        const settings = json?.data && typeof json.data === 'object' ? json.data : json
        const faviconPath = (
          settings?.favicon_logo_url ||
          settings?.favicon_logo ||
          settings?.site_logo_url ||
          settings?.site_logo
        )
        
        if (!faviconPath) {
          // No favicon set, keep default or remove
          return
        }
        
        // Convert relative path to full URL. API may already return a normalized URL.
        const BASE = env.backendBaseUrl().replace(/\/$/, '')
        const rawFaviconPath = String(faviconPath)
        const faviconUrl = /^https?:\/\//i.test(rawFaviconPath)
          ? rawFaviconPath
          : rawFaviconPath.startsWith('/assets/') || rawFaviconPath.startsWith('/storage/')
            ? `${BASE}${rawFaviconPath}`
            : `${BASE}/assets/media/uploads/${rawFaviconPath.replace(/^\/+/, '')}`
        
        // Remove existing favicon links
        const existingLinks = document.querySelectorAll('link[rel*="icon"]')
        existingLinks.forEach(link => link.remove())
        
        // Determine MIME type based on file extension
        const extension = faviconPath.split('.').pop()?.toLowerCase() || 'png'
        let mimeType = 'image/png'
        if (extension === 'ico') {
          mimeType = 'image/x-icon'
        } else if (extension === 'svg') {
          mimeType = 'image/svg+xml'
        } else if (extension === 'png') {
          mimeType = 'image/png'
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg'
        }
        
        // Create and add new favicon link
        const link = document.createElement('link')
        link.rel = 'shortcut icon'
        link.type = mimeType
        link.href = faviconUrl
        document.head.appendChild(link)
        
        // Also add apple-touch-icon for better mobile support
        const appleLink = document.createElement('link')
        appleLink.rel = 'apple-touch-icon'
        appleLink.href = faviconUrl
        document.head.appendChild(appleLink)
        
      } catch (e) {
        console.warn('Error setting favicon:', e)
      }
    }
    
    setFavicon()
  }, [])
  
  // This component doesn't render anything
  return null
}

