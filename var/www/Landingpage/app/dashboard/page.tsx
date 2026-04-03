"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import CustomerDashboard from "@/components/dashboard/CustomerDashboard"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
    }
  }, [session, status, router])

  // Auto-zoom out to fit dashboard content on mobile
  useEffect(() => {
    if (status === "authenticated" && session) {
      const adjustZoom = () => {
        // Check if we're on mobile
        if (window.innerWidth <= 768) {
          // Get the dashboard content
          const dashboardContent = document.querySelector('main')
          if (dashboardContent) {
            const contentWidth = dashboardContent.scrollWidth
            const viewportWidth = window.innerWidth
            
            // Calculate the zoom level needed to fit content
            const zoomLevel = Math.min(viewportWidth / contentWidth, 1)
            
            // Apply zoom using CSS transform
            document.body.style.transform = `scale(${zoomLevel})`
            document.body.style.transformOrigin = 'top left'
            document.body.style.width = `${100 / zoomLevel}%`
            document.body.style.height = `${100 / zoomLevel}%`
          }
        }
      }

      // Wait a bit for the dashboard to render
      setTimeout(adjustZoom, 100)
      
      // Also adjust on window resize
      window.addEventListener('resize', adjustZoom)
      
      return () => {
        // Reset zoom when component unmounts (navigating away)
        document.body.style.transform = ''
        document.body.style.transformOrigin = ''
        document.body.style.width = ''
        document.body.style.height = ''
        window.removeEventListener('resize', adjustZoom)
      }
    }
  }, [session, status])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <CustomerDashboard />
}
