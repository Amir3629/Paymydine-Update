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
        const res = await fetch(`/settings?ts=${Date.now()}`, {
          credentials: 'omit',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        
        if (!res.ok) {
          console.warn('Failed to fetch settings for favicon')
          return
        }
        
        const json = await res.json()
        const faviconPath = (json?.favicon_logo_url || json?.favicon_logo || json?.data?.favicon_logo_url || json?.data?.favicon_logo);
        
        if (!faviconPath) {
          // No favicon set, keep default or remove
          return
        }
        
        // /settings already normalizes favicon_logo_url/favicon_logo when available.
        const BASE = typeof window !== 'undefined' ? window.location.origin : EnvironmentConfig.getInstance().backendBaseUrl()
        const faviconUrl = /^https?:\/\//i.test(faviconPath)
          ? faviconPath
          : `${BASE.replace(/\/$/, '')}${faviconPath.startsWith('/') ? faviconPath : `/assets/media/uploads/${faviconPath}`}`
        
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

