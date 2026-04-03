// components/dashboard/DashboardSupport.tsx
import { MessageSquare, Mail, Phone, HelpCircle } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

const supportOptions = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "dashboard.support.liveChat",
    description: "dashboard.support.liveChatDesc",
    action: "dashboard.support.startChat",
    color: "bg-gold-100 text-gold-600"
  },
  {
    id: "email",
    icon: Mail,
    title: "dashboard.support.emailSupport",
    description: "dashboard.support.emailSupportDesc",
    action: "Sales@paymydine.con",
    color: "bg-green-100 text-green-600"
  },
  {
    id: "phone",
    icon: Phone,
    title: "dashboard.support.phoneSupport",
    description: "dashboard.support.phoneSupportDesc",
    action: "+1 (555) 123-4567",
    color: "bg-blue-100 text-blue-600"
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "dashboard.support.faq",
    description: "dashboard.support.faqDesc",
    action: "dashboard.support.viewFaq",
          color: "bg-cream-100 text-brown-600"
  }
]

export default function DashboardSupport() {
  const [loading, setLoading] = useState<string | null>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const handleSupportAction = async (optionId: string) => {
    setLoading(optionId)
    // Simulate API call or action
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(null)
    
    // Handle different actions
    switch (optionId) {
      case 'chat':
        // Open chat widget
        console.log('Opening chat widget...')
        break
      case 'email':
        // Open email client
        window.location.href = 'mailto:Sales@paymydine.con';
        break
      case 'phone':
        // Show phone number or trigger call
        console.log('Calling support...')
        break
      case 'faq':
        // Navigate to FAQ
        console.log('Opening FAQ...')
        break
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-brown-900 mb-4">{t("dashboard.support.title")}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t("dashboard.support.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {supportOptions.map((option) => (
          <div key={option.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${option.color}`}>
                <option.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-brown-900 mb-1">{t(option.title)}</div>
                <div className="text-sm text-gray-500 mb-3">{t(option.description)}</div>
                <button
                  onClick={() => handleSupportAction(option.id)}
                  disabled={loading === option.id}
                  className="text-sm font-medium text-gold-600 hover:text-gold-700 transition-colors disabled:opacity-50"
                >
                  {loading === option.id ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-600 mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    option.id === 'email' || option.id === 'phone' ? option.action : t(option.action)
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">Send us a message</h3>
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="How can we help?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Describe your question or issue..."
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-gold-600 text-white px-6 py-2 rounded-lg hover:bg-gold-700 transition-colors"
          >
            Send Message
          </button>
        </form>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-gold-500 to-amber-500 rounded-lg p-8 text-white">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">Quick Help</h3>
          <p className="text-gold-100">
            Find answers to common questions or get in touch with our team.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-center transition-colors">
            <div className="font-semibold mb-1">Getting Started</div>
            <div className="text-sm text-gold-100">Setup guide and tutorials</div>
          </button>
          <button className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-center transition-colors">
            <div className="font-semibold mb-1">Billing Questions</div>
            <div className="text-sm text-gold-100">Plans, payments, and invoices</div>
          </button>
          <button className="bg-white/10 hover:bg-white/20 rounded-lg p-4 text-center transition-colors">
            <div className="font-semibold mb-1">Technical Support</div>
            <div className="text-sm text-gold-100">App issues and troubleshooting</div>
          </button>
        </div>
      </div>
    </div>
  )
}
