"use client"

import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  Heart, 
  CheckCircle, 
  Zap, 
  Star,
  Smartphone,
  Shield,
  Globe,
  Tablet,
  Monitor,
  Cloud,
  Database,
  Lock,
  Wifi,
  Smile
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import Navigation from "@/components/Navigation"

export default function CustomerExperiencePage() {
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: Heart,
      title: language === 'de' ? "Personalisierte Erfahrung" : "Personalized Experience",
      description: language === 'de' 
        ? "Maßgeschneiderte Erlebnisse für jeden Gast"
        : "Tailored experiences for every guest"
    },
    {
      icon: Star,
      title: language === 'de' ? "Loyalitätsprogramme" : "Loyalty Programs",
      description: language === 'de'
        ? "Belohnen Sie treue Kunden automatisch"
        : "Automatically reward loyal customers"
    },
    {
      icon: Smile,
      title: language === 'de' ? "Kundenzufriedenheit" : "Customer Satisfaction",
      description: language === 'de'
        ? "Echtzeit-Feedback und Bewertungen"
        : "Real-time feedback and ratings"
    },
    {
      icon: Zap,
      title: language === 'de' ? "Schneller Service" : "Fast Service",
      description: language === 'de'
        ? "Reduzieren Sie Wartezeiten erheblich"
        : "Significantly reduce wait times"
    },
    {
      icon: Smartphone,
      title: language === 'de' ? "Mobile Optimierung" : "Mobile Optimization",
      description: language === 'de'
        ? "Perfekte Erfahrung auf allen Geräten"
        : "Perfect experience on all devices"
    },
    {
      icon: Shield,
      title: language === 'de' ? "Datenschutz" : "Data Privacy",
      description: language === 'de'
        ? "Sichere und geschützte Kundendaten"
        : "Secure and protected customer data"
    }
  ]

  const benefits = language === 'de' ? [
    "Erhöhen Sie die Kundenbindung um 50%",
    "Verbessern Sie die Bewertungen um 30%",
    "Steigern Sie die Wiederkaufsrate",
    "Reduzieren Sie Beschwerden erheblich",
    "Erhöhen Sie die Empfehlungsrate",
    "Optimieren Sie die Kundenzufriedenheit"
  ] : [
    "Increase customer retention by 50%",
    "Improve ratings by 30%",
    "Boost repeat visit rate",
    "Significantly reduce complaints",
    "Increase referral rate",
    "Optimize customer satisfaction"
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
        backgroundImage: "url('/images/features/Außergewöhnliche Kundenerfahrung.jpg')",
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
                {language === 'de' ? 'Außergewöhnliche Kundenerfahrung' : 'Exceptional Customer Experience'}
              </h1>
              <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-8 drop-shadow-lg">
                {language === 'de' 
                  ? 'Schaffen Sie unvergessliche Erlebnisse für Ihre Gäste mit personalisierten Services und nahtloser Technologie.'
                  : 'Create unforgettable experiences for your guests with personalized services and seamless technology.'
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
              {language === 'de' ? 'Kundenerfahrungs-Funktionen' : 'Customer Experience Features'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Alles was Sie für außergewöhnliche Kundenerfahrungen benötigen'
                : 'Everything you need for exceptional customer experiences'
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
              {language === 'de' ? 'Warum außergewöhnliche Kundenerfahrung?' : 'Why Exceptional Customer Experience?'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'de' 
                ? 'Entdecken Sie die Vorteile einer personalisierten Kundenerfahrung'
                : 'Discover the benefits of personalized customer experience'
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
