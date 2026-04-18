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
        const res = await fetch(
          `${EnvironmentConfig.getInstance().backendBaseUrl().replace(/\/$/, '')}/api/v1/settings`,
          { credentials: 'omit', cache: 'no-store' }
        )
        
        if (!res.ok) {
          console.warn('Failed to fetch settings for favicon')
          return
        }
        
        const json = await res.json()
        const faviconPath = json.favicon_logo
        
        if (!faviconPath) {
          // No favicon set, keep default or remove
          return
        }
        
        // Convert relative path to full URL
        const BASE = EnvironmentConfig.getInstance().backendBaseUrl()
        const normalized = faviconPath.startsWith('/') ? faviconPath : `/${faviconPath}`
        const faviconUrl = `${BASE.replace(/\/$/, '')}/assets/media/uploads${normalized}`
        
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

