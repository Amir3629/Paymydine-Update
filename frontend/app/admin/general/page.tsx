"use client"

import type React from "react"

import { useCmsStore } from "@/store/cms-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function GeneralSettingsPage() {
  const { settings, updateSettings } = useCmsStore()
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newSettings = {
      appName: formData.get("appName") as string,
      tableNumber: Number(formData.get("tableNumber")),
    }
    updateSettings(newSettings)
    toast({ title: "Settings Updated", description: "General settings have been saved." })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">General Settings</h1>
      <form onSubmit={handleSubmit} className="max-w-lg bg-white p-8 rounded-xl shadow space-y-6">
        <div className="space-y-2">
          <Label htmlFor="appName">App Name</Label>
          <Input id="appName" name="appName" defaultValue={settings.appName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tableNumber">Table Number</Label>
          <Input id="tableNumber" name="tableNumber" type="number" defaultValue={settings.tableNumber} />
        </div>
        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  )
}
