"use client"
import { useEffect, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MultiTenantConfig } from "@/lib/multi-tenant-config"

function TableMenuContent({ table_id }: { table_id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const multiTenantConfig = MultiTenantConfig.getInstance()
  
  useEffect(() => {
    const initializeTenant = async () => {
      // Detect tenant from subdomain
      await multiTenantConfig.detectTenant()
      
      // Redirect to main menu with table context
      const menuUrl = new URL("/menu", window.location.origin)
      menuUrl.searchParams.set("table_id", table_id)
      
      // Add any additional parameters
      const location = searchParams.get("location")
      const guest = searchParams.get("guest")
      const qr = searchParams.get("qr")
      const date = searchParams.get("date")
      const time = searchParams.get("time")
      
      if (location) menuUrl.searchParams.set("location", location)
      if (guest) menuUrl.searchParams.set("guest", guest)
      if (qr) menuUrl.searchParams.set("qr", qr)
      if (date) menuUrl.searchParams.set("date", date)
      if (time) menuUrl.searchParams.set("time", time)
      
      router.replace(menuUrl.pathname + menuUrl.search)
    }
    
    initializeTenant()
  }, [table_id, searchParams, router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading restaurant menu...</p>
        <p className="text-sm text-gray-500 mt-2">Table {table_id}</p>
      </div>
    </div>
  )
}

export default function TenantTableMenu({ params }: { params: Promise<{ table_id: string }> }) {
  const { table_id } = use(params)
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    }>
      <TableMenuContent table_id={table_id} />
    </Suspense>
  )
} 