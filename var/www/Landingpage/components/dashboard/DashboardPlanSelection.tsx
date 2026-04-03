// components/dashboard/DashboardPlanSelection.tsx
import { Check, CreditCard, Clock, Shield, Users, Zap, Star } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

const plans = [
  {
    id: "single",
    name: "Single Plan",
    description: "Perfect for small restaurants and cafes",
    price: "55 EUR",
    features: [
      "Single location",
      "Basic menu management",
      "Standard ordering system", 
      "Email support",
      "Mobile-responsive design",
      "Basic analytics"
    ],
    popular: false
  },
  {
    id: "professional",
    name: "Professional Plan", 
    description: "Ideal for growing restaurant chains",
    price: "80 EUR",
    features: [
      "Up to 3 locations",
      "Advanced analytics",
      "Custom branding",
      "Priority support", 
      "Inventory management",
      "Marketing tools",
      "Loyalty programs"
    ],
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    description: "For large restaurant groups and franchises", 
    price: "130 EUR",
    features: [
      "Unlimited locations",
      "White-label options",
      "API access",
      "Dedicated support",
      "Custom integrations", 
      "Advanced security",
      "Multi-tenant isolation"
    ],
    popular: false
  }
]

const paymentMethods = [
  { id: "card", name: "dashboard.plans.creditCard", icon: CreditCard },
  { id: "bank", name: "dashboard.plans.bankTransfer", icon: Shield },
  { id: "invoice", name: "dashboard.plans.invoice", icon: Clock }
]

export default function DashboardPlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string>("card")
  const [loading, setLoading] = useState<string | null>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const handlePlanSelection = async (planId: string) => {
    setLoading(planId)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSelectedPlan(planId)
    setLoading(null)
  }

  const handleCheckout = async () => {
    if (!selectedPlan) return
    
    setLoading('checkout')
    // Simulate checkout process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(null)
    
    // In real app, this would redirect to payment processor
    alert(`Plan selected: ${selectedPlan}\nPayment method: ${selectedPayment}\nProceeding to checkout...`)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-brown-900 mb-4">{t("dashboard.plans.title")}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t("dashboard.plans.subtitle")}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`relative bg-white rounded-lg shadow-sm border-2 p-6 transition-all duration-300 ${
            plan.popular ? 'border-gold-500 ring-2 ring-gold-200' : 
            selectedPlan === plan.id ? 'border-gold-500 ring-2 ring-gold-200' : 'border-gray-200 hover:border-gray-300'
          }`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gold-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {t("dashboard.plans.mostPopular")}
                </span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-brown-900 mb-2">{t(plan.name)}</h3>
              <div className="flex items-baseline justify-center mb-2">
                <span className="text-3xl font-bold text-brown-900">{plan.price}</span>
                <span className="text-gray-500 ml-1">{t(plan.period)}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Setup: {plan.setupTime}
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Contract: {plan.contractLength}
                </div>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePlanSelection(plan.id)}
              disabled={loading === plan.id}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                selectedPlan === plan.id
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : plan.popular 
                    ? 'bg-gold-600 text-white hover:bg-gold-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {loading === plan.id ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : selectedPlan === plan.id ? (
                '✓ Selected'
              ) : (
                plan.popular ? t("dashboard.plans.selectProfessional") : t("dashboard.plans.selectPlan")
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      {selectedPlan && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">{t("dashboard.plans.paymentMethod")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              <label key={method.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPayment === method.id ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gold-300'
              }`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value={method.id} 
                  checked={selectedPayment === method.id}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="mr-3" 
                />
                <method.icon className="w-5 h-5 mr-2 text-gray-600" />
                <span className="font-medium">{t(method.name)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Contract Terms */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">{t("dashboard.plans.contractTerms")}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-brown-900">{t("dashboard.plans.freeTrial")}</div>
              <div className="text-sm text-gray-600">{t("dashboard.plans.freeTrialDesc")}</div>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-brown-900">{t("dashboard.plans.setupIncluded")}</div>
              <div className="text-sm text-gray-600">{t("dashboard.plans.setupIncludedDesc")}</div>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-brown-900">{t("dashboard.plans.supportIncluded")}</div>
              <div className="text-sm text-gray-600">{t("dashboard.plans.supportIncludedDesc")}</div>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Checkout Section */}
      {selectedPlan && (
        <div className="bg-gradient-to-r from-gold-500 to-amber-500 rounded-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">{t("dashboard.plans.readyToStart")}</h3>
          <p className="text-gold-100 mb-6">
            {t("dashboard.plans.readyToStartDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCheckout}
              disabled={loading === 'checkout'}
              className="bg-white text-gold-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {loading === 'checkout' ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold-600 mr-2"></div>
                  Processing...
                </div>
              ) : (
                t("dashboard.plans.continueToDocs")
              )}
            </button>
            <button className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-gold-600 transition-colors">
              {t("dashboard.plans.scheduleDemo")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
