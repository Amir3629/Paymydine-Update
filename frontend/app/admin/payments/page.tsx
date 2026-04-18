"use client"

import type React from "react"
import { useCmsStore } from "@/store/cms-store"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function PaymentOptionsPage() {
  const { paymentOptions, togglePaymentOption, tipSettings, updateTipSettings } = useCmsStore()
  const { toast } = useToast()

  const handleTipSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const percentages = (formData.get("percentages") as string)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Boolean)

    updateTipSettings({ percentages })
    toast({ title: "Tip Settings Updated" })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payment & Tip Settings</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl shadow space-y-6">
          <h2 className="text-xl font-semibold">Payment Methods</h2>
          {paymentOptions.map((option) => (
            <div key={option.id} className="flex items-center justify-between">
              <Label htmlFor={option.id} className="capitalize text-lg">
                {option.id === "applepay" ? "Apple Pay" : option.id === "googlepay" ? "Google Pay" : option.id}
              </Label>
              <Switch
                id={option.id}
                checked={option.enabled}
                onCheckedChange={() => {
                  togglePaymentOption(option.id)
                  toast({ title: "Payment Option Updated" })
                }}
              />
            </div>
          ))}
        </div>

        <div className="bg-white p-8 rounded-xl shadow space-y-6">
          <h2 className="text-xl font-semibold">Tip Settings</h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-tips" className="text-lg">
              Enable Tipping
            </Label>
            <Switch
              id="enable-tips"
              checked={tipSettings.enabled}
              onCheckedChange={(checked) => updateTipSettings({ enabled: checked })}
            />
          </div>
          <form onSubmit={handleTipSettingsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="percentages">Tip Percentages (comma-separated)</Label>
              <Input
                id="percentages"
                name="percentages"
                defaultValue={tipSettings.percentages.join(", ")}
                disabled={!tipSettings.enabled}
              />
            </div>
            <Button type="submit" disabled={!tipSettings.enabled}>
              Save Tip Settings
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}