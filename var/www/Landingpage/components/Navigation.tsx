"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface NavigationProps {
  navigation: {
    items: Array<{
      id: string
      title: string
      href: string
      order: number
    }>
  }
}

const Navigation = ({ navigation }: NavigationProps) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const { language, toggleLanguage } = useLanguage()
  const { t } = useTranslation(language)

  // Check if we're on feature pages or homepage
  const isFeaturePage = pathname?.startsWith('/features')
  const isHomePage = pathname === '/' || pathname === '/en' || pathname === '/de'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.demo"), href: "#demo" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.faq"), href: "#faq" },
    { label: t("nav.contact"), href: "#contact" },
  ]

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
    setIsMobileMenuOpen(false)
  }

  // Helper function to get text color for nav items
  const getTextColor = () => "text-white hover:text-cream-200";

  // Helper function to get language button color
  const getLanguageButtonColor = () => "text-white hover:text-cream-200";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-brown-900/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          <div className="flex-shrink-0">
            <Link href="/">
              <Image 
                src="/images/logo.png" 
                alt="PayMyDine" 
                width={400} 
                height={120} 
                className="h-16 lg:h-20 w-auto" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navItems.map((item) => (
              <div key={item.href}>
                {isFeaturePage ? (
                  <Link
                    href={`/${item.href}`}
                    className={`transition-colors duration-200 font-medium ${getTextColor()}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    onClick={() => scrollToSection(item.href)}
                    className={`transition-colors duration-200 font-medium ${getTextColor()}`}
                  >
                    {item.label}
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={toggleLanguage}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${getLanguageButtonColor()}`}
            >
              {language === "en" ? "EN" : "DE"}
            </button>
            {session ? (
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${getLanguageButtonColor()}`}
            >
              {language === "en" ? "EN" : "DE"}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`transition-colors ${getTextColor()}`}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-brown-900/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <div key={item.href}>
                  {isFeaturePage ? (
                    <Link
                      href={`/${item.href}`}
                      className="block px-3 py-2 text-white hover:text-cream-200 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollToSection(item.href)}
                      className="block w-full text-left px-3 py-2 text-white hover:text-cream-200 transition-colors"
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
              {session ? (
                <Link
                  href="/dashboard"
                  className="block w-full mt-4 bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-2 rounded-xl font-semibold text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block w-full mt-4 bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-2 rounded-xl font-semibold text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation