"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

type PaymentMethod = {
  code: "card" | "apple_pay" | "google_pay" | "paypal" | "cod"
  name: string
  provider_code: "stripe" | "paypal" | "worldline" | "sumup" | "square" | null
  enabled: boolean
  priority: number
}

type PaymentProvider = {
  code: "stripe" | "paypal" | "worldline" | "sumup" | "square"
  name: string
  enabled: boolean
  supported_methods: PaymentMethod["code"][]
}

export default function PaymentMethodsPage() {
  const { toast } = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [methodsRes, providersRes] = await Promise.all([
          fetch("/api/v1/payment-methods-admin"),
          fetch("/api/v1/payment-providers-admin"),
        ])
        const methodsJson = await methodsRes.json()
        const providersJson = await providersRes.json()
        if (cancelled) return

        setMethods(Array.isArray(methodsJson?.data) ? methodsJson.data : [])
        setProviders(Array.isArray(providersJson?.data) ? providersJson.data : [])
      } catch {
        if (!cancelled) {
          toast({ title: "Load failed", description: "Could not load payment methods/providers", variant: "destructive" })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  const enabledProviderCodes = useMemo(() => new Set(providers.filter((p) => p.enabled).map((p) => p.code)), [providers])

  const updateMethod = (code: PaymentMethod["code"], patch: Partial<PaymentMethod>) => {
    setMethods((prev) => prev.map((method) => (method.code === code ? { ...method, ...patch } : method)))
  }

  const saveMethods = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/v1/payment-methods-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error("save failed")
      toast({ title: "Saved", description: "Payment methods updated successfully" })
    } catch {
      toast({ title: "Save failed", description: "Could not save payment methods", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 mt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold">Payment Methods</h1>
        <p className="text-sm text-muted-foreground mt-1">UI methods are separated from providers. Assign a provider per method.</p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/admin/payment-providers">Manage Providers</Link>
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payment methods...</p>
        ) : (
          methods
            .sort((a, b) => a.priority - b.priority)
            .map((method) => {
              const options =
                method.code === "cod"
                  ? [{ code: null, label: "No Provider", enabled: true }]
                  : providers
                      .filter((provider) => provider.supported_methods?.includes(method.code))
                      .map((provider) => ({
                        code: provider.code as PaymentMethod["provider_code"],
                        label: provider.name,
                        enabled: provider.enabled,
                      }))
              const providerIsEnabled = method.provider_code ? enabledProviderCodes.has(method.provider_code) : true

              return (
                <div key={method.code} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center border rounded-lg p-4">
                  <div>
                    <Label className="text-base font-semibold">{method.name}</Label>
                    <p className="text-xs text-muted-foreground">code: {method.code}</p>
                  </div>

                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input value={method.name} onChange={(e) => updateMethod(method.code, { name: e.target.value })} />
                  </div>

                  <div>
                    <Label className="text-xs">Provider</Label>
                    <Select
                      value={method.provider_code ?? "none"}
                      onValueChange={(value) => updateMethod(method.code, { provider_code: value === "none" ? null : (value as PaymentMethod["provider_code"]) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={`${method.code}-${option.code ?? "none"}`} value={option.code ?? "none"}>
                            {option.label}{option.enabled ? "" : " (Disabled)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!providerIsEnabled && <p className="text-xs text-amber-600 mt-1">Selected provider is currently disabled.</p>}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <Label htmlFor={`enabled-${method.code}`} className="text-sm">Enabled</Label>
                    <Switch
                      id={`enabled-${method.code}`}
                      checked={method.enabled}
                      onCheckedChange={(checked) => updateMethod(method.code, { enabled: checked })}
                    />
                  </div>
                </div>
              )
            })
        )}

        <div className="pt-2 flex justify-end">
          <Button onClick={saveMethods} disabled={isLoading || isSaving}>
            {isSaving ? "Saving..." : "Save Payment Methods"}
          </Button>
        </div>
      </div>
    </div>
  )
}
