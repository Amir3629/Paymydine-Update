"use client"

import { useLanguage } from "@/lib/language-context"

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "de" : "en")
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
    >
      <span className="text-base">
        {language === "en" ? "🇺🇸" : "🇩🇪"}
      </span>
      <span className="font-medium">
        {language === "en" ? "EN" : "DE"}
      </span>
    </button>
  )
}
