"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

type ProviderCode = "stripe" | "paypal" | "worldline" | "sumup" | "square"

type PaymentProvider = {
  code: ProviderCode
  name: string
  enabled: boolean
  supported_methods: string[]
  config: Record<string, string>
}

const providerFieldMap: Record<ProviderCode, Array<{ key: string; label: string; type?: string; options?: string[] }>> = {
  stripe: [
    { key: "transaction_mode", label: "Mode", options: ["test", "live"] },
    { key: "test_secret_key", label: "Test Secret Key", type: "password" },
    { key: "live_secret_key", label: "Live Secret Key", type: "password" },
    { key: "currency", label: "Currency" },
  ],
  paypal: [
    { key: "transaction_mode", label: "Mode", options: ["test", "live"] },
    { key: "test_client_id", label: "Sandbox Client ID" },
    { key: "test_client_secret", label: "Sandbox Client Secret", type: "password" },
    { key: "live_client_id", label: "Live Client ID" },
    { key: "live_client_secret", label: "Live Client Secret", type: "password" },
    { key: "brand_name", label: "Brand Name" },
    { key: "currency", label: "Currency" },
  ],
  worldline: [
    { key: "api_endpoint", label: "API Endpoint" },
    { key: "merchant_id", label: "Merchant ID" },
    { key: "api_key_id", label: "API Key ID" },
    { key: "secret_api_key", label: "Secret API Key", type: "password" },
    { key: "webhook_secret", label: "Webhook Secret", type: "password" },
  ],
  sumup: [
    { key: "access_token", label: "Access Token", type: "password" },
    { key: "url", label: "API Base URL" },
    { key: "id_application", label: "Merchant Code" },
  ],
  square: [
    { key: "transaction_mode", label: "Mode", options: ["test", "live"] },
    { key: "test_access_token", label: "Sandbox Access Token", type: "password" },
    { key: "test_location_id", label: "Sandbox Location ID" },
    { key: "live_access_token", label: "Live Access Token", type: "password" },
    { key: "live_location_id", label: "Live Location ID" },
    { key: "currency", label: "Currency" },
  ],
}

export default function PaymentProvidersPage() {
  const { toast } = useToast()
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/v1/payment-providers-admin")
        const json = await response.json()
        if (!cancelled) {
          setProviders(Array.isArray(json?.data) ? json.data : [])
        }
      } catch {
        if (!cancelled) {
          toast({ title: "Load failed", description: "Could not load providers", variant: "destructive" })
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

  const updateProvider = (code: ProviderCode, patch: Partial<PaymentProvider>) => {
    setProviders((prev) => prev.map((provider) => (provider.code === code ? { ...provider, ...patch } : provider)))
  }

  const updateConfig = (code: ProviderCode, key: string, value: string) => {
    setProviders((prev) =>
      prev.map((provider) =>
        provider.code === code ? { ...provider, config: { ...(provider.config || {}), [key]: value } } : provider,
      ),
    )
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/v1/payment-providers-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      })
      const json = await response.json()
      if (!response.ok || !json?.success) throw new Error("save failed")
      toast({ title: "Saved", description: "Payment providers updated" })
    } catch {
      toast({ title: "Save failed", description: "Could not save providers", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">Provider integrations and credentials are managed separately from UI payment methods.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl p-6 shadow text-sm text-muted-foreground">Loading providers...</div>
        ) : (
          providers.map((provider) => {
            const fields = providerFieldMap[provider.code] || []
            return (
              <div key={provider.code} className="bg-white rounded-xl p-6 shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{provider.name}</h2>
                    <p className="text-xs text-muted-foreground">code: {provider.code}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: {(provider.supported_methods || []).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`provider-enabled-${provider.code}`}>Enabled</Label>
                    <Switch
                      id={`provider-enabled-${provider.code}`}
                      checked={provider.enabled}
                      onCheckedChange={(checked) => updateProvider(provider.code, { enabled: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <div key={`${provider.code}-${field.key}`} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      {field.options ? (
                        <Select
                          value={String(provider.config?.[field.key] || field.options[0])}
                          onValueChange={(value) => updateConfig(provider.code, field.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={`${provider.code}-${field.key}-${option}`} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type || "text"}
                          value={String(provider.config?.[field.key] || "")}
                          onChange={(e) => updateConfig(provider.code, field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isLoading || isSaving}>
          {isSaving ? "Saving..." : "Save Providers"}
        </Button>
      </div>
    </div>
  )
}
