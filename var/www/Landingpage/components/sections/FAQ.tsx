"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface FAQProps {
  faqs: Array<{
    id: string
    question: string
    answer: string
    order: number
  }>
}

const FAQ = ({ faqs }: FAQProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
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

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const sortedFaqs = [...faqs].sort((a, b) => a.order - b.order)

  const getTranslatedFAQ = (faq: any) => {
    const faqTranslations = {
      "1": { // Tech Stack
        question: t("faq.techStack.question"),
        answer: t("faq.techStack.answer")
      },
      "2": { // Multi-tenant
        question: t("faq.multiTenant.question"),
        answer: t("faq.multiTenant.answer")
      },
      "3": { // POS Integration
        question: t("faq.posIntegration.question"),
        answer: t("faq.posIntegration.answer")
      },
      "4": { // Support
        question: t("faq.support.question"),
        answer: t("faq.support.answer")
      },
      "5": { // Free Trial
        question: t("faq.freeTrial.question"),
        answer: t("faq.freeTrial.answer")
      },
      "6": { // Security
        question: t("faq.security.question"),
        answer: t("faq.security.answer")
      }
    }

    return faqTranslations[faq.id as keyof typeof faqTranslations] || {
      question: faq.question,
      answer: faq.answer
    }
  }

  return (
    <section 
      id="faq" 
      ref={sectionRef} 
      className="relative py-20 lg:py-32 overflow-hidden bg-[url('/images/backgrounds/FQ.png')] bg-cover bg-no-repeat bg-center bg-fixed min-h-screen"
    >
      {/* Very light white overlay */}
      <div className="absolute inset-0 bg-white/40"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-900 mb-6">
            {t("faq.title")}
          </h2>
          <p className="text-xl text-gray-600">{t("faq.subtitle")}</p>
        </div>

        <div className="space-y-4">
          {sortedFaqs.map((faq, index) => {
            const translatedFAQ = getTranslatedFAQ(faq)
            
            return (
              <div
                key={faq.id}
                className={`bg-white/30 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-500 shadow-lg ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-white/20 transition-colors duration-200"
                >
                  <h3 className="font-semibold text-lg text-primary-900 pr-4">{translatedFAQ.question}</h3>
                  <ChevronDown
                    className={`w-6 h-6 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">{translatedFAQ.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ
