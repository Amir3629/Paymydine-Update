"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import { Check, CreditCard, Lock } from "lucide-react"

export default function Checkout() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    restaurant: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Germany",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const plans = {
    starter: {
      name: "Starter Plan",
      price: "€99",
      period: "/month",
      description: "Perfect for small restaurants getting started",
      features: [
        "Basic menu & ordering system",
        "Email support",
        "Basic analytics",
        "Mobile-responsive design",
        "Payment processing",
      ],
    },
    professional: {
      name: "Professional Plan",
      price: "€199",
      period: "/month",
      description: "Most popular choice for growing restaurants",
      features: [
        "Everything in Starter",
        "Advanced analytics & reports",
        "Marketing tools & campaigns",
        "Priority support",
        "Custom branding",
        "Inventory management",
      ],
    },
    enterprise: {
      name: "Enterprise Plan",
      price: "€399",
      period: "/month",
      description: "For restaurant chains and large operations",
      features: [
        "Everything in Professional",
        "Multi-location management",
        "Custom integrations",
        "Dedicated account manager",
        "White-label solution",
        "Advanced security features",
      ],
    },
  }

  useEffect(() => {
    const plan = searchParams.get("plan")
    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const restaurant = searchParams.get("restaurant")

    if (plan && plans[plan as keyof typeof plans]) {
      setSelectedPlan(plans[plan as keyof typeof plans])
    } else {
      setSelectedPlan(plans.professional) // Default to professional
    }

    if (email) setFormData((prev) => ({ ...prev, email }))
    if (name) {
      const nameParts = name.split(" ")
      setFormData((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
      }))
    }
    if (restaurant) setFormData((prev) => ({ ...prev, restaurant }))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success("Payment successful! Welcome to PayMyDine!")
      router.push("/dashboard")
    } catch (error) {
      toast.error("Payment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setFormData({ ...formData, cardNumber: formatted })
  }

  if (!selectedPlan) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const subtotal = Number.parseFloat(selectedPlan.price.replace("€", ""))
  const tax = subtotal * 0.19 // 19% VAT
  const total = subtotal + tax

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-50 to-brown-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="PayMyDine" width={200} height={60} className="mx-auto h-12 w-auto" />
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-brown-900">{t("checkout.title")}</h1>
          <p className="mt-2 text-gray-600">{t("checkout.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-brown-900 mb-6">{t("checkout.orderSummary")}</h2>

            <div className="border border-gold-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-brown-900">{selectedPlan.name}</h3>
                <span className="text-2xl font-bold text-brown-900">
                  {selectedPlan.price}
                  <span className="text-sm text-gray-600">{selectedPlan.period}</span>
                </span>
              </div>
              <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
              <ul className="space-y-2">
                {selectedPlan.features.slice(0, 3).map((feature: string, index: number) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {selectedPlan.features.length > 3 && (
                  <li className="text-sm text-gray-500">+ {selectedPlan.features.length - 3} more features</li>
                )}
              </ul>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("checkout.subtotal")}</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("checkout.tax")} (19%)</span>
                <span className="font-medium">€{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-brown-900 border-t pt-3">
                <span>{t("checkout.total")}</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-brown-900 mb-6">{t("checkout.billingInfo")}</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.firstName")}</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.lastName")}</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-brown-700 mb-2">{t("auth.email")}</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-brown-700 mb-2">{t("auth.restaurant")}</label>
                  <input
                    type="text"
                    name="restaurant"
                    required
                    value={formData.restaurant}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.address")}</label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.city")}</label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.postalCode")}</label>
                    <input
                      type="text"
                      name="postalCode"
                      required
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-brown-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  {t("checkout.paymentMethod")}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.cardNumber")}</label>
                  <input
                    type="text"
                    name="cardNumber"
                    required
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.expiryDate")}</label>
                    <input
                      type="text"
                      name="expiryDate"
                      required
                      value={formData.expiryDate}
                      onChange={handleChange}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">{t("checkout.cvv")}</label>
                    <input
                      type="text"
                      name="cvv"
                      required
                      value={formData.cvv}
                      onChange={handleChange}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                <Lock className="w-5 h-5 mr-2" />
                {loading ? t("checkout.processing") : `${t("checkout.completePurchase")} - €${total.toFixed(2)}`}
              </button>

              <p className="text-xs text-gray-500 text-center">🔒 Your payment information is secure and encrypted</p>
            </form>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-gold-600 hover:text-gold-700 font-medium">
            ← {t("common.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  )
}
