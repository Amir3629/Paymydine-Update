"use client"

import { Building2, Activity, BarChart3, Megaphone, Star, Users, Globe, Shield, ArrowRight, CheckCircle, Zap, TrendingUp, Menu, ShoppingCart, UserCheck, LineChart, QrCode, CreditCard, Smartphone } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface FeaturesProps {
  features: Array<{
    id: string
    title: string
    description: string
    icon: string
    order: number
  }>
}

const iconMap = {
  Building2,
  Activity,
  BarChart3,
  Megaphone,
  Star,
  Users,
  Globe,
  Shield,
  ArrowRight,
  CheckCircle,
  Zap,
  TrendingUp,
  Menu,
  ShoppingCart,
  UserCheck,
  LineChart,
  QrCode,
  CreditCard,
  Smartphone
}

const Features = ({ features }: FeaturesProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  const router = useRouter()

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

  const sortedFeatures = [...features].sort((a, b) => a.order - b.order)

  // Map features to appropriate styling and content - Updated to match logo colors
  const getFeatureEnhancements = (feature: any, index: number) => {
    const enhancements = [
      {
        gradient: "from-brown-600 to-brown-700",
        accentColor: "text-brown-600", 
        bgAccent: "bg-brown-50",
        borderAccent: "border-brown-200",
        title: t("features.qrPayment.title"),
        description: t("features.qrPayment.description"),
        stats: t("features.qrPayment.stats"),
        highlight: t("features.qrPayment.highlight"),
        icon: "QrCode",
        features: [
          t("features.qrPayment.feature1"),
          t("features.qrPayment.feature2"), 
          t("features.qrPayment.feature3"),
          t("features.qrPayment.feature4")
        ],
        link: "/features/qr-payment"
      },
      {
        gradient: "from-brown-500 to-cream-500",
        accentColor: "text-brown-600",
        bgAccent: "bg-cream-50",
        borderAccent: "border-cream-200",
        title: t("features.tableService.title"),
        description: t("features.tableService.description"),
        stats: t("features.tableService.stats"),
        highlight: t("features.tableService.highlight"),
        icon: "Smartphone",
        features: [
          t("features.tableService.feature1"),
          t("features.tableService.feature2"),
          t("features.tableService.feature3"),
          t("features.tableService.feature4")
        ],
        link: "/features/table-service"
      },
      {
        gradient: "from-brown-700 to-cream-600",
        accentColor: "text-brown-700",
        bgAccent: "bg-brown-50",
        borderAccent: "border-brown-200",
        title: t("features.customerExperience.title"),
        description: t("features.customerExperience.description"),
        stats: t("features.customerExperience.stats"),
        highlight: t("features.customerExperience.highlight"),
        icon: "Users",
        features: [
          t("features.customerExperience.feature1"),
          t("features.customerExperience.feature2"),
          t("features.customerExperience.feature3"),
          t("features.customerExperience.feature4")
        ],
        link: "/features/customer-experience"
      },
      {
        gradient: "from-cream-500 to-brown-600",
        accentColor: "text-cream-600",
        bgAccent: "bg-cream-50",
        borderAccent: "border-cream-200",
        title: t("features.paymentAnalytics.title"),
        description: t("features.paymentAnalytics.description"),
        stats: t("features.paymentAnalytics.stats"),
        highlight: t("features.paymentAnalytics.highlight"),
        icon: "BarChart3",
        features: [
          t("features.paymentAnalytics.feature1"),
          t("features.paymentAnalytics.feature2"),
          t("features.paymentAnalytics.feature3"),
          t("features.paymentAnalytics.feature4")
        ],
        link: "/features/payment-analytics"
      }
    ]

    return enhancements[index] || enhancements[0]
  }

  const handleLearnMoreClick = (link: string) => {
    router.push(link)
  }

  return (
    <section id="features" ref={sectionRef} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent-100 text-accent-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            Premium Restaurant Management
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-900 mb-6">
            {t("features.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Enhanced Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {sortedFeatures.map((feature, index) => {
            const enhancements = getFeatureEnhancements(feature, index)
            const IconComponent = iconMap[enhancements.icon as keyof typeof iconMap] || iconMap[feature.icon as keyof typeof iconMap] || Star

            return (
              <div
                key={feature.id}
                className={`group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-2 flex flex-col h-full ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                } ${
                  hoveredCard === feature.id ? "border-accent-300 shadow-xl" : "border-transparent"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Enhanced Icon Container - Centered properly */}
                <div className={`relative bg-gradient-to-br ${enhancements.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg mx-auto`}>
                  <IconComponent className="w-8 h-8 text-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  </div>
                </div>

                {/* Title with Highlight */}
                <h3 className="font-serif text-xl font-bold text-primary-900 mb-4 group-hover:text-accent-600 transition-colors duration-300">
                  {enhancements.title}
                  <span className={`block text-sm font-normal ${enhancements.accentColor} mt-1`}>
                    {enhancements.highlight}
                  </span>
                </h3>

                {/* Enhanced Description */}
                <p className="text-gray-600 leading-relaxed mb-6">{enhancements.description}</p>

                {/* Feature List with Left-Aligned Text */}
                <div className="space-y-2 mb-6">
                  {enhancements.features.map((featureItem, featureIndex) => (
                    <div key={featureIndex} className="flex items-start text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-left">{featureItem}</span>
                    </div>
                  ))}
                </div>

                {/* Learn More Button */}
                <div className="mt-auto pt-4 flex">
                  <button
                    onClick={() => handleLearnMoreClick(enhancements.link)}
                    className="flex items-center text-gold-600 font-medium text-base underline underline-offset-4 hover:text-gold-800 transition-colors duration-200"
                  >
                    {t("features.learnMore")}
                    <ArrowRight className="w-4 h-4 ml-1" />
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

export default Features
