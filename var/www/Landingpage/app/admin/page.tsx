"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import AdminDashboard from "@/components/admin/AdminDashboard"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session || (session.user as any)?.role !== "admin") {
      router.push("/admin/login")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-accent-500"></div>
      </div>
    )
  }

  if (!session || (session.user as any)?.role !== "admin") {
    return null
  }

  return <AdminDashboard />
}
