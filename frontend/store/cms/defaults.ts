import type {
  CmsSettings,
  MerchantSettings,
  PaymentOption,
  PmdReviewSocialSettings,
  TipSettings,
  VATSettings,
} from "@/store/cms/types"

export const initialSettings: CmsSettings = {
  appName: "PayMyDine",
  logoUrl: "",
  tableNumber: 7,
}

export const initialPaymentOptions: PaymentOption[] = [
  { id: "visa", enabled: true },
  { id: "mastercard", enabled: true },
  { id: "paypal", enabled: true },
  { id: "cash", enabled: true },
  { id: "applepay", enabled: true },
  { id: "googlepay", enabled: true },
]

export const initialTipSettings: TipSettings = {
  enabled: true,
  percentages: [0, 5, 10],
  defaultPercentage: 10,
}

export const initialVATSettings: VATSettings = {
  enabled: false,
  percentage: 0,
  menuPrice: 1,
}

export const initialReviewSocialSettings: PmdReviewSocialSettings = {
  sharePromptEnabled: true,
  homepageSocialIconsEnabled: true,
  platforms: {
    trustpilot: { enabled: false, url: "" },
    instagram: { enabled: false, url: "" },
    google: { enabled: false, url: "" },
    website: { enabled: false, url: "" },
    reviews: { enabled: false, url: "" },
  },
}

export const initialMerchantSettings: MerchantSettings = {
  businessName: "PayMyDine Restaurant",
  accountId: "",
  stripeSecretKey: "",
  stripePublishableKey: "",
  paypalClientId: "",
  paypalClientSecret: "",
  bankAccountNumber: "",
  bankRoutingNumber: "",
  bankName: "",
  currency: "EUR",
  countryCode: "US",
  reviewSocial: initialReviewSocialSettings,
}
