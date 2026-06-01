"use client"

import React, { useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { Logo } from "@/components/logo"
import { ValetView, type ValetFormData } from "@/customer/valet/ValetView"

export default function ValetPage() {
  const { t } = useLanguageStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState<ValetFormData>({ name: "", car: "", plate: "" })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  return (
    <ValetView
      logo={<Logo />}
      isSuccess={isSuccess}
      isSubmitting={isSubmitting}
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      onHome={() => { window.location.href = "/" }}
      labels={{
        valetService: t("valetService"),
        valetAvailability: t("valetAvailability"),
        enterName: t("enterName"),
        licensePlate: t("licensePlate"),
        enterLicensePlate: t("enterLicensePlate"),
        carDetails: t("carDetails"),
        enterCarDetails: t("enterCarDetails"),
        optional: t("optional"),
        submitting: t("submitting"),
        requestValet: t("requestValet"),
        valetRequestSuccess: t("valetRequestSuccess"),
        valetConfirmation: t("valetConfirmation"),
        backToHome: t("backToHome"),
        valetTicket: t("valetTicket"),
      }}
    />
  )
}
