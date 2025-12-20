"use client"

import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore } from "@/store/cart-store"
import { Logo } from "@/components/logo"
import { buildTablePath } from "@/lib/table-url"
import { stickySearch } from "@/lib/sticky-query"
import { getHomeHrefFallback } from "@/lib/table-home-util"
import { Button } from "@/components/ui/button"
import { Car, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { ApiClient } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"

export default function ValetPage() {
  const { table_id } = useParams<{ table_id: string }>()
  const { toast } = useToast()
  const apiClient = new ApiClient()
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const { tableInfo } = useCartStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [name, setName] = useState("")
  const [plate, setPlate] = useState("")
  const [carMake, setCarMake] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!table_id) {
      toast({ 
        title: "Missing table", 
        description: "Open valet from a table link.", 
        variant: "destructive" 
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await apiClient.createValetRequest({
        table_id: String(table_id),
        name: name.trim(),
        license_plate: plate.trim(),
        car_make: carMake.trim() || undefined,
      })
      
      toast({ 
        title: "Valet requested", 
        description: "We'll be right with you." 
      })
      
      setName("")
      setPlate("")
      setCarMake("")
      setIsSuccess(true)
    } catch (err: any) {
      console.error("[valet] submit failed", err)
      toast({ 
        title: "Valet request failed", 
        description: err?.message ?? "Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
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
              className="bg-white rounded-2xl shadow-sm border border-paydine-border p-4 sm:p-6"
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
                  <Label htmlFor="name" className="text-paydine-elegant-gray">{t("enter_your_name")} *</Label>
                  <Input 
                    id="name" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t("enter_your_name")}
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
                  <Label htmlFor="plate" className="text-paydine-elegant-gray">{t("license_plate")} *</Label>
                  <Input 
                    id="plate" 
                    value={plate}
                    onChange={e => setPlate(e.target.value)}
                    placeholder={t("license_plate")}
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
                  <Label htmlFor="carMake" className="text-paydine-elegant-gray flex items-center">
                    {t("car_make")} <span className="text-gray-400">({t("optional")})</span>
                  </Label>
                  <Input 
                    id="carMake" 
                    value={carMake}
                    onChange={e => setCarMake(e.target.value)}
                    placeholder={t("car_make_placeholder")}
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
                    disabled={isSubmitting || !table_id}
                  >
                    {isSubmitting ? t("submitting") : t("requestValet")}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              className="bg-white rounded-2xl shadow-sm border border-paydine-border p-6 sm:p-8 text-center"
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
                onClick={() => router.push(getHomeHrefFallback({ pathParam: table_id, tableInfo }))}
              >
                {t("backToHome")}
          </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="mt-4 text-sm text-paydine-muted-gray bg-white rounded-xl p-4 border border-paydine-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="mb-2">{t("valetAvailability")}</p>
          <p>{t("valetTicket")}</p>
        </motion.div>
      </div>
    </div>
  )
} 