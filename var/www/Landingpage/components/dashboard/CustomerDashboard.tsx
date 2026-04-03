// components/dashboard/CustomerDashboard.tsx
"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  BarChart3,
  ShoppingBag,
  Users,
  Settings,
  CreditCard,
  HelpCircle,
  FileText,
  MessageSquare,
  User
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import DashboardLayout from "./DashboardLayout"
import DashboardOnboarding from "./DashboardOnboarding"
import DashboardPlanSelection from "./DashboardPlanSelection"
import DashboardDocuments from "./DashboardDocuments"
import DashboardSupport from "./DashboardSupport"
import DashboardAccount from "./DashboardAccount"

export default function CustomerDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("onboarding")
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const menuItems = [
    { id: "onboarding", label: t("dashboard.nav.dashboard"), icon: BarChart3 },
    { id: "plans", label: t("dashboard.nav.choosePlan"), icon: CreditCard },
    { id: "documents", label: t("dashboard.nav.documents"), icon: FileText },
    { id: "support", label: t("dashboard.nav.support"), icon: MessageSquare },
    { id: "account", label: t("dashboard.nav.account"), icon: User },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "onboarding":
        return <DashboardOnboarding />
      case "plans":
        return <DashboardPlanSelection />
      case "documents":
        return <DashboardDocuments />
      case "support":
        return <DashboardSupport />
      case "account":
        return <DashboardAccount />
      default:
        return <DashboardOnboarding />
    }
  }

  return (
    <DashboardLayout
      userName={session?.user?.name || "Admin User"}
      onSignOut={() => signOut()}
      menuItems={menuItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </DashboardLayout>
  )
}
