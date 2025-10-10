import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import ClientLayout from "./clientLayout"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "PayMyDine - A Luxurious Dining Experience",
  description: "Order, pay, and enjoy your meal seamlessly.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="theme-vars">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E7CBA9" />
        <style id="dark-matte-inline">{`
          html.theme-dark{background-color: var(--theme-background, #0B0F14);}
          .theme-dark body{background: radial-gradient(1200px 600px at 20% 0%, rgba(231,203,169,0.07), transparent 60%),
            radial-gradient(900px 500px at 80% 10%, rgba(239,199,177,0.06), transparent 60%),
            radial-gradient(1200px 800px at 50% 120%, rgba(0,0,0,0.70), transparent 70%),
            radial-gradient(1200px 800px at -20% -20%, rgba(0,0,0,0.60), transparent 70%),
            radial-gradient(1200px 800px at 120% -20%, rgba(0,0,0,0.60), transparent 70%),
            var(--theme-background, #0B0F14);
          }
          .theme-dark .bg-theme{background: transparent !important;}
        `}</style>
      </head>
      <body className={inter.className + ' text-theme'}>
        <ThemeProvider>
          <ClientLayout className={cn("min-h-screen font-sans antialiased", inter.variable)}>
            {children}
            <Toaster />
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}