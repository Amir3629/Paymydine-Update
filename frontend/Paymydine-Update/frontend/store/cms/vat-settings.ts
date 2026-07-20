import type { VATSettings } from "@/store/cms/types"

export function parseVATModeEnabled(raw: unknown): boolean {
  const normalized = String(raw ?? "").trim().toLowerCase()
  if (["1", "true", "enabled", "on"].includes(normalized)) return true
  if (["0", "false", "disabled", "off", ""].includes(normalized)) return false
  return Number(normalized) === 1
}

export function buildVATSettingsFromApiData(data: any): VATSettings {
  const taxModeRaw = data?.vat_mode ?? data?.tax_mode ?? "0"
  const taxPercentage = parseFloat(data?.vat_percentage || data?.tax_percentage || "0")
  const taxMenuPrice = parseInt(data?.vat_menu_price || data?.tax_menu_price || "1", 10)

  return {
    enabled: parseVATModeEnabled(taxModeRaw),
    percentage: Number.isFinite(taxPercentage) ? taxPercentage : 0,
    menuPrice: Number.isFinite(taxMenuPrice) ? taxMenuPrice : 1,
  }
}
