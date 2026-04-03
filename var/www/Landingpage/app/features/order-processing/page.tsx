"use client"

import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  ShoppingCart, 
  CheckCircle, 
  Zap, 
  Clock,
  Users,
  Shield,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Cloud,
  Database,
  Lock,
  Bell,
  Settings,
  Truck
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import Navigation from "@/components/Navigation"

export default function OrderProcessingPage() {
  const [isVisible, setIsVisible] = useState(false)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: ShoppingCart,
      title: "Order Queue Management",
      description: "Efficient order queue system with priority handling"
    },
    {
      icon: Clock,
      title: "Real-time Processing",
      description: "Instant order processing and status updates"
    },
    {
      icon: Bell,
      title: "Kitchen Notifications",
      description: "Automated notifications to kitchen staff"
    },
    {
      icon: Users,
      title: "Staff Coordination",
      description: "Seamless coordination between front and back of house"
    },
    {
      icon: Settings,
      title: "Customizable Workflows",
      description: "Adapt the system to your restaurant's unique processes"
    },
    {
      icon: Truck,
      title: "Delivery Integration",
      description: "Integrated delivery and pickup management"
    }
  ]

  const benefits = [
    "Reduce order processing time by 60%",
    "Minimize kitchen errors by 45%",
    "Improve order accuracy",
    "Enhance customer satisfaction",
    "Streamline kitchen operations",
    "Increase order throughput"
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
                Advanced Order Processing
              </h1>
              <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-8 drop-shadow-lg">
                Streamline your restaurant's order management with intelligent processing systems that reduce errors and improve efficiency.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleChoosePlan}
                  className="bg-gradient-to-r from-gold-500 to-gold-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-gold-600 hover:to-gold-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Choose Plan
                </button>
                <button 
                  onClick={handleContactNow}
                  className="bg-white/90 backdrop-blur-sm text-gray-800 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Contact Now
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
              Advanced Order Processing Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to handle orders efficiently and accurately
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
              Why Advanced Order Processing?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the benefits of streamlined order management
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
