"use client"

import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  QrCode, 
  CheckCircle, 
  Zap, 
  Shield,
  Smartphone,
  Globe,
  Tablet,
  Monitor,
  Cloud,
  Database,
  Lock,
  CreditCard,
  Wifi,
  DollarSign,
  Users
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import Navigation from "@/components/Navigation"

export default function QRPaymentPage() {
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: QrCode,
      title: language === 'de' ? "QR-Code Generation" : "QR Code Generation",
      description: language === 'de' 
        ? "Automatische Erstellung von QR-Codes für jeden Tisch"
        : "Automatic QR code generation for every table"
    },
    {
      icon: Shield,
      title: language === 'de' ? "Sichere Zahlungen" : "Secure Payments",
      description: language === 'de'
        ? "Bank-Level Sicherheit für alle Transaktionen"
        : "Bank-level security for all transactions"
    },
    {
      icon: Zap,
      title: language === 'de' ? "Sofortige Abwicklung" : "Instant Processing",
      description: language === 'de'
        ? "Schnelle Zahlungsabwicklung in Sekunden"
        : "Fast payment processing in seconds"
    },
    {
      icon: Smartphone,
      title: language === 'de' ? "Mobile Optimiert" : "Mobile Optimized",
      description: language === 'de'
        ? "Perfekte Erfahrung auf allen Geräten"
        : "Perfect experience on all devices"
    },
    {
      icon: DollarSign,
      title: language === 'de' ? "Mehrere Währungen" : "Multiple Currencies",
      description: language === 'de'
        ? "Unterstützung für verschiedene Währungen"
        : "Support for multiple currencies"
    },
    {
      icon: Users,
      title: language === 'de' ? "Geteilte Rechnungen" : "Split Bills",
      description: language === 'de'
        ? "Einfache Aufteilung von Rechnungen"
        : "Easy bill splitting between customers"
    }
  ]

  const benefits = language === 'de' ? [
    "Reduzieren Sie Wartezeiten um 70%",
    "Steigern Sie die Kundenzufriedenheit",
    "Senken Sie die Betriebskosten",
    "Verbessern Sie die Tischrotation",
    "Kontaktlose Zahlungen",
    "Detaillierte Zahlungsanalysen"
  ] : [
    "Reduce wait times by 70%",
    "Increase customer satisfaction",
    "Lower operational costs",
    "Improve table turnover",
    "Contactless payments",
    "Detailed payment analytics"
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
        backgroundImage: "url('/images/features/QR-Code Zahlung.jpg')",
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
                {language === 'de' ? 'QR-Code Zahlung' : 'QR Code Payment'}
              </h1>
              <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-8 drop-shadow-lg">
                {language === 'de' 
                  ? 'Revolutionieren Sie die Zahlungsabwicklung in Ihrem Restaurant mit modernster QR-Code-Technologie für schnelle und sichere Transaktionen.'
                  : 'Revolutionize payment processing in your restaurant with cutting-edge QR code technology for fast and secure transactions.'
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
              {language === 'de' ? 'QR-Zahlungsfunktionen' : 'QR Payment Features'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Alles was Sie für moderne Zahlungsabwicklung benötigen'
                : 'Everything you need for modern payment processing'
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
              {language === 'de' ? 'Warum QR-Zahlung wählen?' : 'Why Choose QR Payment?'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Entdecken Sie die Vorteile der modernen Zahlungsabwicklung'
                : 'Discover the benefits of modern payment processing'
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
