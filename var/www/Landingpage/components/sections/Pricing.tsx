"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Star } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface PricingProps {
  plans: Array<{
    id: string
    name: string
    price: string
    period: string
    description: string
    features: string[]
    popular: boolean
    stripeLink: string
    order: number
  }>
}

const Pricing = ({ plans }: PricingProps) => {
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

  const sortedPlans = [...plans].sort((a, b) => a.order - b.order)

  const handlePlanClick = (planId: string) => {
    // Map plan IDs to checkout plan names
    const planMap: { [key: string]: string } = {
      "1": "starter",
      "2": "professional",
      "3": "enterprise",
    }

    const checkoutPlan = planMap[planId] || "professional"
    window.location.href = `/auth/signup?plan=${checkoutPlan}`
  }

  const getTranslatedPlan = (plan: any) => {
    const planTranslations = {
      "1": { // Starter Plan
        name: t("pricing.starter.name"),
        description: t("pricing.starter.description"),
        features: [
          t("pricing.starter.feature1"),
          t("pricing.starter.feature2"),
          t("pricing.starter.feature3"),
          t("pricing.starter.feature4"),
          t("pricing.starter.feature5"),
          t("pricing.starter.feature6")
        ]
      },
      "2": { // Professional Plan
        name: t("pricing.professional.name"),
        description: t("pricing.professional.description"),
        features: [
          t("pricing.professional.feature1"),
          t("pricing.professional.feature2"),
          t("pricing.professional.feature3"),
          t("pricing.professional.feature4"),
          t("pricing.professional.feature5"),
          t("pricing.professional.feature6"),
          t("pricing.professional.feature7")
        ]
      },
      "3": { // Enterprise Plan
        name: t("pricing.enterprise.name"),
        description: t("pricing.enterprise.description"),
        features: [
          t("pricing.enterprise.feature1"),
          t("pricing.enterprise.feature2"),
          t("pricing.enterprise.feature3"),
          t("pricing.enterprise.feature4"),
          t("pricing.enterprise.feature5"),
          t("pricing.enterprise.feature6"),
          t("pricing.enterprise.feature7")
        ]
      }
    }

    return planTranslations[plan.id as keyof typeof planTranslations] || {
      name: plan.name,
      description: plan.description,
      features: plan.features
    }
  }

  return (
    <section id="pricing" ref={sectionRef} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-brown-900 mb-6">
            {t("pricing.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {sortedPlans.map((plan, index) => {
            const translatedPlan = getTranslatedPlan(plan)
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                  plan.popular ? "ring-2 ring-brown-500 scale-105" : ""
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-cream-500 to-cream-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      {t("pricing.mostPopular")}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="font-serif text-2xl font-bold text-brown-900 mb-2">{translatedPlan.name}</h3>

                  <p className="text-gray-600 mb-6">{translatedPlan.description}</p>

                  <div className="mb-8">
                    <span className="text-4xl font-bold text-brown-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {translatedPlan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-cream-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      plan.popular
                        ? "bg-gradient-to-r from-brown-500 to-brown-600 text-white hover:shadow-lg transform hover:scale-105"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {t("pricing.getStarted")}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Pricing
