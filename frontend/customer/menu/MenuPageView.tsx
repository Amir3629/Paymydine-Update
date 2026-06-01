import type { ReactNode } from "react"
import Link from "next/link"
import { CustomerShell } from "../components/CustomerShell"
import { useLanguageStore } from "@/store/language-store"

export function MenuPageView({
  contextLabel = "Delivery",
  backHref = "/",
  children,
}: {
  title?: string
  subtitle?: string
  contextLabel?: string
  backHref?: string
  children: ReactNode
}) {
  const { language, setLanguage } = useLanguageStore()
  const toggleLanguage = () => setLanguage(language === "en" ? "de" : "en")

  return (
    <CustomerShell page="menu">
      <main className="pmd-customer-shell__inner pmd-customer-menu-page">
        <div className="pmd-customer-menu-topbar" aria-label="Menu navigation">
          <Link href={backHref} className="pmd-customer-menu-topbar__back">← Back</Link>
          <div className="pmd-customer-menu-topbar__context">{contextLabel}</div>
          <button type="button" className="pmd-customer-menu-topbar__lang" onClick={toggleLanguage} aria-label="Change language">
            {language.toUpperCase()}
          </button>
        </div>
        {children}
      </main>
    </CustomerShell>
  )
}
