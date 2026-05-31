"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useLanguageStore } from "@/store/language-store"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "de" : "en")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative h-10 w-12 overflow-hidden rounded-full border font-semibold hover:opacity-90"
      style={{
        backgroundColor: "var(--pmd-v2-action-bg)",
        color: "var(--pmd-v2-action-text)",
        WebkitTextFillColor: "var(--pmd-v2-action-text)",
        borderColor: "var(--pmd-v2-action-border)",
      }}
    >
      <motion.div
        key={language}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: "var(--pmd-v2-action-text)",
          WebkitTextFillColor: "var(--pmd-v2-action-text)",
        }}
      >
        {language.toUpperCase()}
      </motion.div>
    </Button>
  )
}
