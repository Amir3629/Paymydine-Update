"use client"

import Link from "next/link"
import { useCmsStore } from "@/store/cms-store"
import { motion } from "framer-motion"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export default function AdminDashboard() {
  const { settings, menuItems } = useCmsStore()
  const { t } = useTranslation()

  const [waiterConfirmOpen, setWaiterConfirmOpen] = useState(false)
  const [waiterConfirmMessage, setWaiterConfirmMessage] = useState("")
  const [isWaiterConfirmed, setIsWaiterConfirmed] = useState(false)

  const handleWaiterClick = () => {
    setWaiterConfirmMessage(t("callWaiterConfirm"))
    setWaiterConfirmOpen(true)
  }

  const handleWaiterConfirm = () => {
    setIsWaiterConfirmed(true)
    setWaiterConfirmMessage(t("waiterComing"))
    
    // Auto close after 2 seconds
    setTimeout(() => {
      setIsWaiterConfirmed(false)
      setWaiterConfirmMessage("")
      setWaiterConfirmOpen(false)
    }, 2000)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to the CMS, {settings.appName}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Menu Items</h2>
          <p className="text-4xl font-bold mt-2">{menuItems.length}</p>
          <Link href="/admin/menu" className="text-blue-600 hover:underline mt-4 inline-block">
            Manage Menu
          </Link>
        </div>
        <div className="p-6 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Table Number</h2>
          <p className="text-4xl font-bold mt-2">{settings.tableNumber}</p>
          <Link href="/admin/general" className="text-blue-600 hover:underline mt-4 inline-block">
            Change Settings
          </Link>
        </div>
      </div>

      {/* Replace the existing Waiter Confirmation Dialog with this smooth one */}
      {waiterConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl text-center">
            <motion.div
              key={waiterConfirmMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-gray-600 pt-2 text-lg"
            >
              {waiterConfirmMessage}
            </motion.div>
            {!isWaiterConfirmed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-row gap-4 pt-6 justify-center"
              >
                <Button variant="outline" onClick={() => setWaiterConfirmOpen(false)} className="rounded-xl w-20">
                  {t("no")}
                </Button>
                <Button
                  onClick={handleWaiterConfirm}
                  className="bg-paydine-champagne hover:bg-paydine-champagne/90 text-paydine-elegant-gray rounded-xl w-20"
                >
                  {t("yes")}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
