"use client"

import { ArrowRight, QrCode, Smartphone, CreditCard } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import Image from "next/image"
import { useEffect, useState } from "react"

export default function Hero() {
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/features/codescanning.png"
          alt="Customer scanning QR code in restaurant"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent" />
      </div>

      {/* All hero content stays above the background */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 sm:pt-40">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text Content */}
          <div className={`text-center lg:text-left space-y-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
                {t("hero.titleLine1")}{" "}
                <span className="bg-gradient-to-r from-brown-400 to-cream-200 bg-clip-text text-transparent">
                  {t("hero.titleLine2")}
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-white max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {t("hero.subtitle")}
              </p>
            </div>

            {/* Rounded, Modern Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => scrollToSection("#pricing")}
                className="group bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-3 rounded-full font-semibold text-base shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 cursor-pointer"
              >
                {t("hero.primaryCTA")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollToSection("#contact")}
                className="border border-brown-400 text-brown-600 px-6 py-3 rounded-full font-semibold text-base bg-white/80 shadow-sm hover:border-brown-500 hover:text-brown-700 transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 cursor-pointer"
              >
                {t("hero.secondaryCTA")}
              </button>
            </div>

            {/* Process Flow */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-12 mt-12">
              {/* Scan */}
              <div className="flex flex-col items-center">
                <QrCode className="w-8 h-8 text-cream-100 mb-2" />
                <span className="text-sm font-medium text-cream-100">Scan</span>
              </div>
              <ArrowRight className="w-4 h-4 text-cream-200 mt-3 hidden sm:block" />
              {/* Order */}
              <div className="flex flex-col items-center">
                <Smartphone className="w-8 h-8 text-cream-100 mb-2" />
                <span className="text-sm font-medium text-cream-100">Order</span>
              </div>
              <ArrowRight className="w-4 h-4 text-cream-200 mt-3 hidden sm:block" />
              {/* Pay */}
              <div className="flex flex-col items-center">
                <CreditCard className="w-8 h-8 text-cream-100 mb-2" />
                <span className="text-sm font-medium text-cream-100">Pay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}