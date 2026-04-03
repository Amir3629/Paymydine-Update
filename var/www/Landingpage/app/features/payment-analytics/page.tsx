"use client"

import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  BarChart3, 
  CheckCircle, 
  Zap, 
  DollarSign,
  TrendingUp,
  Shield,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Cloud,
  Database,
  Lock,
  Activity,
  Target,
  Users
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import Navigation from "@/components/Navigation"

export default function PaymentAnalyticsPage() {
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: BarChart3,
      title: language === 'de' ? "Echtzeit-Dashboards" : "Real-time Dashboards",
      description: language === 'de' 
        ? "Übersichtliche Anzeige aller Zahlungsmetriken"
        : "Clear display of all payment metrics"
    },
    {
      icon: TrendingUp,
      title: language === 'de' ? "Trend-Analyse" : "Trend Analysis",
      description: language === 'de'
        ? "Identifizieren Sie Zahlungstrends und -muster"
        : "Identify payment trends and patterns"
    },
    {
      icon: Target,
      title: language === 'de' ? "Umsatz-Tracking" : "Revenue Tracking",
      description: language === 'de'
        ? "Verfolgen Sie Ihren Umsatz in Echtzeit"
        : "Track your revenue in real-time"
    },
    {
      icon: Activity,
      title: language === 'de' ? "Transaktions-Analyse" : "Transaction Analysis",
      description: language === 'de'
        ? "Detaillierte Analyse aller Transaktionen"
        : "Detailed analysis of all transactions"
    },
    {
      icon: Users,
      title: language === 'de' ? "Kundenverhalten" : "Customer Behavior",
      description: language === 'de'
        ? "Verstehen Sie das Zahlungsverhalten Ihrer Kunden"
        : "Understand your customers' payment behavior"
    },
    {
      icon: Shield,
      title: language === 'de' ? "Betrugs-Erkennung" : "Fraud Detection",
      description: language === 'de'
        ? "Automatische Erkennung verdächtiger Transaktionen"
        : "Automatic detection of suspicious transactions"
    }
  ]

  const benefits = language === 'de' ? [
    "Steigern Sie den Umsatz um 25%",
    "Reduzieren Sie Zahlungsausfälle um 40%",
    "Optimieren Sie Ihre Preisstrategien",
    "Verbessern Sie die Cashflow-Prognose",
    "Identifizieren Sie profitable Zeiten",
    "Automatisierte Berichte und Alerts"
  ] : [
    "Increase revenue by 25%",
    "Reduce payment failures by 40%",
    "Optimize your pricing strategies",
    "Improve cash flow forecasting",
    "Identify profitable time periods",
    "Automated reports and alerts"
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleChoosePlan = () => {
    scrollToSection("#pricing")
  }

  const handleContactNow = () => {
    scrollToSection("#contact")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <Navigation navigation={[]} />

      {/* Hero Section */}
      <section className="py-20 lg:py-32 relative" style={{
        backgroundImage: "url('/images/features/Smart Payment Analytics.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                {language === 'de' ? 'Smart Payment Analytics' : 'Smart Payment Analytics'}
              </h1>
              <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-8 drop-shadow-lg">
                {language === 'de' 
                  ? 'Gewinnen Sie wertvolle Einblicke in Ihr Zahlungsverhalten, Trends und optimieren Sie Ihre Finanzstrategie mit umfassenden Analysen.'
                  : 'Gain valuable insights into your payment behavior, trends and optimize your financial strategy with comprehensive analytics.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleChoosePlan}
                  className="bg-gradient-to-r from-gold-500 to-gold-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-gold-600 hover:to-gold-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {language === 'de' ? 'Plan wählen' : 'Choose Plan'}
                </button>
                <button 
                  onClick={handleContactNow}
                  className="bg-white/90 backdrop-blur-sm text-gray-800 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {language === 'de' ? 'Jetzt kontaktieren' : 'Contact Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {language === 'de' ? 'Zahlungsanalyse-Funktionen' : 'Payment Analytics Features'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Alles was Sie für umfassende Zahlungsanalysen benötigen'
                : 'Everything you need for comprehensive payment analytics'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-amber-500 to-gold-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {language === 'de' ? 'Warum Smart Payment Analytics?' : 'Why Smart Payment Analytics?'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Entdecken Sie die Vorteile datengestützter Entscheidungen'
                : 'Discover the benefits of data-driven decisions'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`flex items-start space-x-4 p-6 bg-gradient-to-br from-amber-50 to-gold-50 rounded-2xl transition-all duration-300 hover:shadow-md ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-amber-500 to-gold-500 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <p className="text-gray-700 font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
