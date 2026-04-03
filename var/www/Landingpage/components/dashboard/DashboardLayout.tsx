// components/dashboard/DashboardLayout.tsx
"use client"

import Image from "next/image"
import { useState } from "react"
import { LogOut, Menu, X, Bell } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import LanguageSwitcher from "@/components/LanguageSwitcher"

interface DashboardLayoutProps {
  userName?: string
  onSignOut?: () => void
  children: React.ReactNode
  menuItems: { id: string; label: string; icon: React.ElementType }[]
  activeTab: string
  setActiveTab: (id: string) => void
}

export default function DashboardLayout({
  userName = "Admin User",
  onSignOut,
  children,
  menuItems,
  activeTab,
  setActiveTab,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-brown-900">
          <Image src="/images/logo.png" alt="PayMyDine" width={300} height={80} className="h-16 w-auto" />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                activeTab === item.id ? "bg-gold-50 text-gold-600 border-r-2 border-gold-600" : "text-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200">
          <button
            onClick={onSignOut}
            className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t("dashboard.nav.signOut")}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-brown-900 shadow-sm border-b border-brown-800 h-16 flex items-center justify-between px-6">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4">
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">
              {t("dashboard.welcome")}, {userName}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button className="p-2 text-white hover:text-cream-200 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-brown-600 rounded-full flex items-center justify-center text-white font-semibold">
              {userName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page content - now fills the remaining space */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
