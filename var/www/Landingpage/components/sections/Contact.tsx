"use client"

import { useEffect, useRef, useState } from "react"
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import { Card, CardContent } from "@/components/ui/card"

interface ContactProps {
  contact: {
    title: string
    subtitle: string
    email: string
    phone: string
    address: string
  }
}

const Contact = ({ contact }: ContactProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    restaurant: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Auto-dismiss notification after 2 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        // Show the notification modal
        setShowNotification(true)
        setFormData({ name: "", email: "", restaurant: "", message: "" })
      } else {
        toast.error(result.error || "Failed to send message")
      }
    } catch (error) {
      toast.error("Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section
        id="contact"
        ref={sectionRef}
        className="py-20 lg:py-32 bg-gradient-to-br from-brown-50 via-white to-cream-50 relative overflow-hidden"
      >
        {/* Decorative background blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-brown-200 to-brown-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-cream-200 to-cream-400 rounded-full opacity-20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-brown-900 mb-6 drop-shadow-lg">
              {contact.title}
            </h2>
            <p className="text-xl text-brown-700 max-w-3xl mx-auto">{contact.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div
              className={`transition-all duration-700 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
            >
                          <div className="bg-white/90 border-2 border-gold-200 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
              <h3 className="font-serif text-2xl font-bold text-gold-700 mb-6">{t("contact.scheduleDemo")}</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brown-900 mb-2">
                      {t("contact.fullName")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gold-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200 bg-gold-50"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brown-900 mb-2">
                      {t("contact.emailAddress")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gold-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200 bg-gold-50"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="restaurant" className="block text-sm font-medium text-brown-900 mb-2">
                      {t("contact.restaurantName")}
                    </label>
                    <input
                      type="text"
                      id="restaurant"
                      name="restaurant"
                      value={formData.restaurant}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gold-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200 bg-gold-50"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-brown-900 mb-2">
                      {t("contact.message")}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gold-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200 bg-gold-50 resize-none"
                      placeholder={t("contact.messagePlaceholder")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    {isSubmitting ? t("contact.sending") : t("contact.scheduleDemo")}
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Information */}
            <div
              className={`transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              }`}
            >
              <div className="space-y-8">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-brown-900 mb-6">{t("contact.getInTouch")}</h3>
                  <p className="text-gold-700 text-lg leading-relaxed mb-8">
                    {t("contact.getInTouchDescription")}
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-gold-100 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-gold-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-brown-900 mb-1">{t("contact.emailUs")}</h4>
                      <p className="text-gold-700">{contact.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-gold-100 p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-gold-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-brown-900 mb-1">{t("contact.callUs")}</h4>
                      <p className="text-gold-700">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-brown-900 mb-1">{t("contact.visitUs")}</h4>
                      <p className="text-gold-700">
                        Grand Towers, Europa Allee 2<br />
                        60327 Frankfurt am Main<br />
                        Germany
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Google Maps Embed */}
                <Card className="overflow-hidden shadow-lg">
                  <CardContent className="p-0">
                    <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2550.1234567890123!2d8.654475!3d50.1083512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bd0bfd4c4c2be1%3A0xcc6c8a1ea5e2d97!2sGrand+Towers,+Europa+Allee+2,+60327+Frankfurt+am+Main,+Germany!5e0!3m2!1sen!2sus!4v1654321234567!5m2!1sen!2sus"
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="I Cube Solutions Office Location"
                      className="rounded-b-xl"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Notification Modal */}
      {showNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred Background */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          
          {/* Notification Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 transform transition-all duration-500 scale-100 opacity-100">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Content */}
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-brown-900 mb-4">
                {language === 'de' ? 'Vielen Dank!' : 'Thank You!'}
              </h3>
              <p className="text-gray-600">
                {language === 'de' 
                  ? 'Vielen Dank für Ihre Nachricht. Wir werden uns bald bei Ihnen melden!'
                  : 'Thank you for your message. We\'ll get back to you soon!'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Contact
