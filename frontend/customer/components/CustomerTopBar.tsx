import Link from "next/link"
import { useLanguageStore } from "@/store/language-store"

export function CustomerTopBar({ contextLabel = "Delivery", backHref = "/" }: { contextLabel?: string; backHref?: string }) {
  const { language, setLanguage } = useLanguageStore()
  const toggleLanguage = () => setLanguage(language === "en" ? "de" : "en")

  return (
    <div className="pmd-customer-topbar" aria-label="Customer navigation">
      <Link href={backHref} className="pmd-customer-topbar__button" aria-label="Back">←</Link>
      <div className="pmd-customer-topbar__context">{contextLabel}</div>
      <button type="button" className="pmd-customer-topbar__button" onClick={toggleLanguage} aria-label="Change language">
        {language.toUpperCase()}
      </button>
    </div>
  )
}
