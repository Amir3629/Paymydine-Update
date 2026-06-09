"use client"

import React, { useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Car, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { apiClient } from "@/lib/api-client"

export default function ValetPage() {
  const { t } = useLanguageStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    car: "",
    plate: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const readTableContext = () => {
    if (typeof window === "undefined") {
      return { tableId: "delivery", tableNo: undefined, qr: undefined }
    }

    const params = new URLSearchParams(window.location.search)
    const clean = (value: string | null) => {
      const trimmed = String(value || "").trim()
      return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : undefined
    }

    const tableId = clean(params.get("table_id"))
    const tableNo = clean(params.get("table_no"))
    const table = clean(params.get("table"))
    const qr = clean(params.get("qr"))

    return {
      tableId: tableId || tableNo || table || qr || "delivery",
      tableNo,
      qr,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const name = formData.name.trim()
    const licensePlate = formData.plate.trim()
    const carMake = formData.car.trim()

    if (!name) {
      setErrorMessage("Please enter your name.")
      return
    }

    if (!licensePlate) {
      setErrorMessage("Please enter your license plate.")
      return
    }

    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const tableContext = readTableContext()
      await apiClient.createValetRequest({
        name,
        license_plate: licensePlate,
        car_make: carMake || undefined,
        table_id: tableContext.tableId,
        table_no: tableContext.tableNo,
        qr: tableContext.qr,
      })

      setIsSuccess(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not submit valet request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pmd-customer-page page--valet" data-pmd-customer-page="valet">
      <div className="min-h-screen bg-theme-background pmd-v2-page p-4 sm:p-6">
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
              className="rounded-2xl shadow-sm p-4 sm:p-6 dark-surface pmd-v2-card"
              style={{ backgroundColor: 'var(--theme-input, #121923)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <span className="inline-flex items-center justify-center pmd-v2-action-circle pmd-v2-valet-car-icon-circle w-10 h-10 mr-3"><Car className="h-6 w-6" /></span>
                <h2 className="text-xl font-semibold pmd-v2-text">{t("valetService")}</h2>
              </div>
        
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Label htmlFor="name" className="pmd-v2-text">{t("enterName")} *</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t("enterName")}
                    className="pmd-v2-input"
                    required
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Label htmlFor="plate" className="pmd-v2-text">{t("licensePlate")} *</Label>
                  <Input 
                    id="plate" 
                    value={formData.plate}
                    onChange={handleInputChange}
                    placeholder={t("enterLicensePlate")}
                    className="pmd-v2-input"
                    required
                  />
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <Label htmlFor="car" className="pmd-v2-text flex items-center">
                    {t("carDetails")}
                    <span className="text-sm pmd-v2-text-muted ml-2">{t("optional")}</span>
                  </Label>
                  <Input 
                    id="car" 
                    value={formData.car}
                    onChange={handleInputChange}
                    placeholder={t("enterCarDetails")}
                    className="pmd-v2-input"
                  />
                </motion.div>
                
                {errorMessage && (
                  <p className="text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <Button 
                    className="w-full valet-request-btn transition-colors pmd-v2-action-button"
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
              className="rounded-2xl shadow-sm p-6 sm:p-8 text-center dark-surface pmd-v2-card"
              style={{ backgroundColor: 'var(--theme-input, #121923)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-full pmd-v2-action-circle flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-8 h-8" />
              </motion.div>
              
              <h2 className="text-2xl font-semibold pmd-v2-text mb-4">
                {t("valetRequestSuccess")}
              </h2>
              
              <p className="pmd-v2-text-muted mb-8">
                {t("valetConfirmation")}
              </p>
              
              <Button
                className="valet-request-btn transition-colors pmd-v2-action-button"
                size="lg"
                onClick={() => window.location.href = '/'}
              >
                {t("backToHome")}
          </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="mt-4 text-sm pmd-v2-text-muted rounded-xl p-4 dark-surface pmd-v2-card-sub"
          style={{ backgroundColor: 'var(--theme-surface, var(--theme-input))', borderColor: 'var(--theme-border)' }}
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
