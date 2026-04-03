"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import toast from "react-hot-toast"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"
import { Eye, EyeOff } from "lucide-react"

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    restaurant: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Demo signup - in production, create user in database
      toast.success("Account created successfully!")

      // Check if there's a plan parameter for checkout
      const plan = searchParams.get("plan")
      if (plan) {
        router.push(
          `/checkout?plan=${plan}&email=${formData.email}&name=${formData.name}&restaurant=${formData.restaurant}`,
        )
      } else {
        router.push("/auth/signin")
      }
    } catch (error) {
      toast.error("Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-50 to-brown-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/">
            <Image src="/images/logo.png" alt="PayMyDine" width={200} height={60} className="mx-auto h-12 w-auto" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-brown-900">{t("auth.signup")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("auth.createNewAccount")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brown-700 mb-2">
                {t("auth.name")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brown-700 mb-2">
                {t("auth.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="restaurant" className="block text-sm font-medium text-brown-700 mb-2">
                {t("auth.restaurant")}
              </label>
              <input
                id="restaurant"
                name="restaurant"
                type="text"
                required
                value={formData.restaurant}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200"
                placeholder="Your Restaurant Name"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brown-700 mb-2">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? t("common.loading") : t("auth.createAccount")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link href="/auth/signin" className="font-medium text-gold-600 hover:text-gold-500">
                {t("auth.signin")}
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gold-600 hover:text-gold-700 font-medium">
            ← {t("common.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  )
}
