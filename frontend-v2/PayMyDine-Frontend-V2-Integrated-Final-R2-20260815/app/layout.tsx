import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { isRtlLocale, localeBase } from '@/src/lib/i18n'
import { PaymentCheckoutUXEnhancer } from '@/src/runtime/components/PaymentCheckoutUXEnhancer'
import { ReviewShareEnhancer } from '@/src/runtime/components/ReviewShareEnhancer'
import { ThemeFallbackStyleBridge } from '@/src/runtime/components/ThemeFallbackStyleBridge'
import { VatSummaryEnhancer } from '@/src/runtime/components/VatSummaryEnhancer'
import { WorldlineEmbeddedCheckoutBridge } from '@/src/runtime/components/WorldlineEmbeddedCheckoutBridge'
import { WorldlineSingleActionUX } from '@/src/runtime/components/WorldlineSingleActionUX'
import './globals.css'

export const metadata: Metadata = {
  title: 'PayMyDine Menu',
  description: 'Restaurant menu, table ordering, service requests and payments powered by PayMyDine.',
  applicationName: 'PayMyDine',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0f0e',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const locale = localeBase(cookieStore.get('pmd_locale')?.value || 'en')
  const direction = isRtlLocale(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={direction}>
      <body><ThemeFallbackStyleBridge />{children}<ReviewShareEnhancer /><VatSummaryEnhancer /><PaymentCheckoutUXEnhancer /><WorldlineSingleActionUX /><WorldlineEmbeddedCheckoutBridge /></body>
    </html>
  )
}
