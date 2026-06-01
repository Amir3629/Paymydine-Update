"use client"

import React, { Suspense } from "react"
import { useLanguageStore } from "@/store/language-store"
import { Logo } from "@/components/logo"
import { useCmsStore } from "@/store/cms-store"
import { CustomerHomeView } from "@/customer/home/CustomerHomeView"

function HomePageContent() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const restaurantName = (settings as any)?.restaurant_name || (settings as any)?.restaurantName || (settings as any)?.siteName || "Welcome"
  return <CustomerHomeView logo={<Logo />} restaurantName={restaurantName} menuLabel={t("menuCard")} valetLabel={t("valetCard")} />
}

function LoadingFallback() {
  return (
    <div data-pmd-customer-app="gold-v1" data-pmd-customer-page="home" className="pmd-customer-shell pmd-customer-home">
      <div className="pmd-customer-card p-6">Loading...</div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageContent />
    </Suspense>
  )
}
