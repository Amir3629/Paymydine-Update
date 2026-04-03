// components/sections/PayAtTableJourney.tsx
"use client"

import { QrCode, Smartphone, CreditCard, CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

export default function PayAtTableJourney() {
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-brown-900 mb-6">
            {t("payAtTable.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("payAtTable.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-br from-brown-600 to-brown-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-brown-900 mb-2">{t("payAtTable.step1.title")}</h3>
            <p className="text-gray-600">
              {t("payAtTable.step1.description")}
            </p>
          </div>
          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-br from-brown-500 to-cream-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-brown-900 mb-2">{t("payAtTable.step2.title")}</h3>
            <p className="text-gray-600">
              {t("payAtTable.step2.description")}
            </p>
          </div>
          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-br from-cream-500 to-cream-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-brown-900 mb-2">{t("payAtTable.step3.title")}</h3>
            <p className="text-gray-600">
              {t("payAtTable.step3.description")}
            </p>
          </div>
          {/* Step 4 */}
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-br from-cream-600 to-brown-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-brown-900 mb-2">{t("payAtTable.step4.title")}</h3>
            <p className="text-gray-600">
              {t("payAtTable.step4.description")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
