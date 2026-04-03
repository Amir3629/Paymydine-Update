"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface HowItWorksProps {
  steps: Array<{
    id: string
    title: string
    description: string
    icon: string
    order: number
  }>
}

const HowItWorks = ({ steps }: HowItWorksProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const stepsWithEmojis = [
    {
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description"),
      emoji: "🚀",
      order: 1,
    },
    {
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description"),
      emoji: "🌐",
      order: 2,
    },
    {
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description"),
      emoji: "📈",
      order: 3,
    },
  ]

  return (
    <section id="how-it-works" ref={sectionRef} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-brown-900 mb-6">
            {t("howItWorks.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t("howItWorks.subtitle")}</p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {stepsWithEmojis.map((step, index) => (
              <div key={step.order} className="relative">
                <div
                  className={`text-center transition-all duration-700 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  {/* Step number and emoji */}
                  <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-brown-500 to-brown-600 rounded-full mb-6 shadow-lg">
                    <span className="text-4xl">{step.emoji}</span>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-brown-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-brown-900 mb-4">{step.title}</h3>

                  <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">{step.description}</p>
                </div>

                {/* Arrow for desktop */}
                {index < stepsWithEmojis.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-gold-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
