// components/sections/FeaturesShowcase.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Zap, BarChart2, BookOpen, Users, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

export default function FeaturesShowcase() {
  const [current, setCurrent] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % features.length)
    }, 5000)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [current])

  const next = () => setCurrent((prev) => (prev + 1) % features.length)
  const prev = () => setCurrent((prev) => (prev - 1 + features.length) % features.length)

  // Get translated features
  const features = [
    {
      icon: <Zap className="w-12 h-12 text-gold-400 drop-shadow-lg" />,
      title: t("featuresShowcase.lightningFast.title"),
      description: t("featuresShowcase.lightningFast.description")
    },
    {
      icon: <BarChart2 className="w-12 h-12 text-gold-400 drop-shadow-lg" />,
      title: t("featuresShowcase.realTimeAnalytics.title"),
      description: t("featuresShowcase.realTimeAnalytics.description")
    },
    {
      icon: <BookOpen className="w-12 h-12 text-gold-400 drop-shadow-lg" />,
      title: t("featuresShowcase.easyMenuManagement.title"),
      description: t("featuresShowcase.easyMenuManagement.description")
    },
    {
      icon: <Users className="w-12 h-12 text-gold-400 drop-shadow-lg" />,
      title: t("featuresShowcase.customerInsights.title"),
      description: t("featuresShowcase.customerInsights.description")
    }
  ]

  const slideVariants = {
    initial: { opacity: 0, y: 40, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, type: "spring" } },
    exit: { opacity: 0, y: -40, scale: 0.95, transition: { duration: 0.4 } }
  }

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t("featuresShowcase.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t("featuresShowcase.subtitle")}
          </p>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="rounded-3xl shadow-2xl p-12 lg:p-16 bg-white/60 backdrop-blur-md border border-gold-100 flex flex-col items-center transition-all duration-700"
              style={{
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
                border: "1.5px solid rgba(218,165,32,0.15)",
              }}
            >
              <div className="mb-8">{features[current].icon}</div>
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 text-center drop-shadow">
                {features[current].title}
              </h3>
              <p className="text-lg text-gray-700 text-center mb-6">{features[current].description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-10"
            aria-label="Previous feature"
          >
            <ChevronLeft className="w-6 h-6 text-gold-500" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-10"
            aria-label="Next feature"
          >
            <ChevronRight className="w-6 h-6 text-gold-500" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {features.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                idx === current ? "bg-gold-500" : "bg-gold-200 hover:bg-gold-400"
              }`}
              aria-label={`Go to feature ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
