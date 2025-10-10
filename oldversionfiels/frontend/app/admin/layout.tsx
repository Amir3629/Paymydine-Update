import type React from "react"
import Link from "next/link"
import { Home, Settings, Utensils, CreditCard, Building2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
      <aside className="w-64 flex-shrink-0 bg-white border-r p-6">
        <h1 className="font-serif text-2xl font-bold mb-8">PayMyDine CMS</h1>
        <nav className="space-y-2">
          <Link
            href="/admin"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/general"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span>General Settings</span>
          </Link>
          <Link
            href="/admin/menu"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Utensils className="h-5 w-5" />
            <span>Menu Management</span>
          </Link>
          <Link
            href="/admin/payments"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <CreditCard className="h-5 w-5" />
            <span>Payment & Tips</span>
          </Link>
          <Link
            href="/admin/merchant"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Building2 className="h-5 w-5" />
            <span>Merchant Settings</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
