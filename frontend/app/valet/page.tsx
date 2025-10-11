"use client"

import React, { useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Car, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"

export default function ValetPage() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    car: "",
    plate: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSuccess(true)
  }

  return (
    <div className="page--valet">
      <div className="min-h-screen bg-theme-background p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo className="mb-8" />
        </motion.div>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div 
              key="form"
              className="rounded-2xl shadow-sm p-4 sm:p-6 dark-surface"
              style={{ backgroundColor: 'var(--theme-input, #121923)', border: '1px solid var(--theme-menu-item-border, #223042)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <Car className="h-6 w-6 text-paydine-champagne mr-3" />
                <h2 className="text-xl font-semibold text-paydine-elegant-gray">{t("valetService")}</h2>
              </div>
        
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Label htmlFor="name" className="text-paydine-elegant-gray">{t("enterName")} *</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t("enterName")}
                    className="border-paydine-border focus:border-paydine-champagne focus:ring-paydine-champagne"
                    required
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Label htmlFor="plate" className="text-paydine-elegant-gray">{t("licensePlate")} *</Label>
                  <Input 
                    id="plate" 
                    value={formData.plate}
                    onChange={handleInputChange}
                    placeholder={t("enterLicensePlate")}
                    className="border-paydine-border focus:border-paydine-champagne focus:ring-paydine-champagne"
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <Label htmlFor="car" className="text-paydine-elegant-gray flex items-center">
                    {t("carDetails")}
                    <span className="text-sm text-paydine-muted-gray ml-2">{t("optional")}</span>
                  </Label>
                  <Input 
                    id="car" 
                    value={formData.car}
                    onChange={handleInputChange}
                    placeholder={t("enterCarDetails")}
                    className="border-paydine-border focus:border-paydine-champagne focus:ring-paydine-champagne"
                  />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <Button 
                    className="w-full bg-paydine-champagne hover:bg-paydine-rose-beige text-paydine-elegant-gray transition-colors"
                    size="lg"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("submitting") : t("requestValet")}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              className="rounded-2xl shadow-sm p-6 sm:p-8 text-center dark-surface"
              style={{ backgroundColor: 'var(--theme-input, #121923)', border: '1px solid var(--theme-menu-item-border, #223042)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-full bg-paydine-champagne/10 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-8 h-8 text-paydine-champagne" />
              </motion.div>
              
              <h2 className="text-2xl font-semibold text-paydine-elegant-gray mb-4">
                {t("valetRequestSuccess")}
              </h2>
              
              <p className="text-paydine-muted-gray mb-8">
                {t("valetConfirmation")}
              </p>
              
              <Button
                className="bg-paydine-champagne hover:bg-paydine-rose-beige text-paydine-elegant-gray transition-colors"
                size="lg"
                onClick={() => window.location.href = '/'}
              >
                {t("backToHome")}
          </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="mt-4 text-sm text-paydine-muted-gray rounded-xl p-4 dark-surface"
          style={{ backgroundColor: '#222529', border: '1px solid var(--theme-menu-item-border, #223042)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="mb-2">{t("valetAvailability")}</p>
          <p>{t("valetTicket")}</p>
        </motion.div>
      </div>
    </div>
    </div>
  )
} 