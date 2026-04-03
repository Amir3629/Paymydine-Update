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
      className="relative w-12 h-10 rounded-full text-paydine-elegant-gray hover:bg-paydine-champagne/20 overflow-hidden font-semibold"
    >
      <motion.div
        key={language}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {language.toUpperCase()}
      </motion.div>
    </Button>
  )
}