"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Head from "next/head"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { saveSubscription } from "./actions"
import { useThemeStore } from "@/store/theme-store"
import "@/lib/i18n" // Import i18n configuration
import CanonicalPaymentDisplayFix from "@/components/CanonicalPaymentDisplayFix"


function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function ClientLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const [mounted, setMounted] = useState(false)
  const { loadSettings, getCSSVariables, settings } = useThemeStore()

  // PMD_CUSTOMER_NO_HOVER_TITLES_R4
  // Classic PHP themes use the shared runtime; the React customer shell needs
  // its own DOM observer because Next.js can render buttons after hydration.
  // Preserve aria-labels and never disable dropdowns, popovers or action labels.
  useEffect(() => {
    const selector = '[title], [data-bs-original-title], [data-original-title], [data-bs-title]'
    const clean = (element: Element) => {
      if (element.tagName === 'IFRAME') return
      const hint = element.getAttribute('title') ||
        element.getAttribute('data-bs-original-title') ||
        element.getAttribute('data-original-title') ||
        element.getAttribute('data-bs-title') || ''
      if (hint && element.matches('button, a[href], [role="button"], [role="link"]') &&
          !element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby') &&
          !(element.textContent || '').trim()) {
        element.setAttribute('aria-label', hint)
      }
      for (const attr of ['title', 'data-bs-original-title', 'data-original-title', 'data-bs-title']) {
        if (element.hasAttribute(attr)) element.removeAttribute(attr)
      }
    }
    const scan = (node: Node) => {
      if (!(node instanceof Element)) return
      clean(node)
      node.querySelectorAll(selector).forEach(clean)
    }

    scan(document.documentElement)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') clean(record.target as Element)
        else record.addedNodes.forEach(scan)
      }
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title', 'data-bs-original-title', 'data-original-title', 'data-bs-title'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setMounted(true)
    // Load theme settings from admin panel
    loadSettings()
    // Ensure a class is present for CSS scope and legacy token mapping
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-vars')
    }
  }, [loadSettings])

  useEffect(() => {
    if (mounted) {
      // Apply CSS variables when settings change
      const cssVars = getCSSVariables()
      Object.entries(cssVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
      
      // Update meta theme-color based on primary color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', settings.primary_color)
      }
    }
  }, [mounted, getCSSVariables, settings.primary_color])

  // Use suppressHydrationWarning on the body element
  return (
    <div 
      className={cn(className, "pmd-font-fallbacks")}
      suppressHydrationWarning
    >
      {children}
      <CanonicalPaymentDisplayFix />
      <Toaster />
    </div>
  )
}
