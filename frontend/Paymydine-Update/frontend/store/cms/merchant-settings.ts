import { initialMerchantSettings, initialReviewSocialSettings } from "@/store/cms/defaults"
import type { MerchantSettings, PmdReviewSocialSettings, PmdSocialPlatformId } from "@/store/cms/types"

export function parseCmsBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback
  const normalized = String(value).trim().toLowerCase()
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false
  return fallback
}

export function buildMerchantSettingsFromSettingsPayload(payload: any): MerchantSettings {
  const data: any = payload?.data ?? payload ?? {}

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = data?.[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
    return undefined
  }

  const platformIds: PmdSocialPlatformId[] = ["trustpilot", "instagram", "google", "website", "reviews"]
  const reviewSocial: PmdReviewSocialSettings = {
    sharePromptEnabled: parseCmsBoolean(get("pmd_review_share_prompt_enabled"), initialReviewSocialSettings.sharePromptEnabled),
    homepageSocialIconsEnabled: parseCmsBoolean(get("pmd_homepage_social_icons_enabled"), initialReviewSocialSettings.homepageSocialIconsEnabled),
    platforms: { ...initialReviewSocialSettings.platforms },
  }

  platformIds.forEach((platformId) => {
    reviewSocial.platforms[platformId] = {
      enabled: parseCmsBoolean(get(`pmd_social_${platformId}_enabled`), initialReviewSocialSettings.platforms[platformId].enabled),
      url: String(get(`pmd_social_${platformId}_url`) || "").trim(),
    }
  })

  return {
    ...initialMerchantSettings,
    businessName: get("businessName", "business_name", "restaurant_name", "name") || initialMerchantSettings.businessName,
    accountId: get("accountId", "account_id", "restaurant_id", "tenant", "slug") || "",
    stripeSecretKey: get("stripeSecretKey", "stripe_secret_key") || "",
    stripePublishableKey: get("stripePublishableKey", "stripe_publishable_key", "stripe_key") || "",
    paypalClientId: get("paypalClientId", "paypal_client_id", "paypal_clientid") || "",
    paypalClientSecret: get("paypalClientSecret", "paypal_client_secret", "paypal_secret") || "",
    bankAccountNumber: get("bankAccountNumber", "bank_account_number") || "",
    bankRoutingNumber: get("bankRoutingNumber", "bank_routing_number") || "",
    bankName: get("bankName", "bank_name") || "",
    currency: get("currency", "currency_code") || initialMerchantSettings.currency,
    countryCode: get("countryCode", "country_code") || initialMerchantSettings.countryCode,
    reviewSocial,
  }
}
