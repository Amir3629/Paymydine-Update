"use client"

import { useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function TableMenuRedirect({ params }: { params: Promise<{ table_id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // FIXED: Unwrap params Promise with React.use()
  const { table_id } = use(params)
  
  useEffect(() => {
    // Get all URL parameters
    const location = searchParams.get("location")
    const guest = searchParams.get("guest") 
    const qr = searchParams.get("qr")
    const date = searchParams.get("date")
    const time = searchParams.get("time")

    // Build the URL for the existing menu page with table info
    const menuUrl = new URL("/menu", window.location.origin)
    menuUrl.searchParams.set("table_id", table_id)
    if (location) menuUrl.searchParams.set("location", location)
    if (guest) menuUrl.searchParams.set("guest", guest)
    if (qr) menuUrl.searchParams.set("qr", qr)
    if (date) menuUrl.searchParams.set("date", date)
    if (time) menuUrl.searchParams.set("time", time)
    
    // Redirect to the existing beautiful menu page
    router.replace(menuUrl.pathname + menuUrl.search)
  }, [table_id, searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-paydine-elegant-gray">Redirecting to menu...</div>
    </div>
  )
}