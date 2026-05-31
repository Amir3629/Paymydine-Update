import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import ClientLayout from "./clientLayout"
import { ThemeProvider } from "@/components/theme-provider"
import { FaviconSetter } from "@/components/favicon-setter"

export const metadata: Metadata = {
  title: "PayMyDine - A Luxurious Dining Experience",
  description: "Order, pay, and enjoy your meal seamlessly.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="theme-vars" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F0B05" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var path=window.location.pathname||"/";
              var isCustomer=path==="/"||path.indexOf("/menu")===0||path.indexOf("/table/")===0||path.indexOf("/valet")===0;
              if(isCustomer){
                document.documentElement.removeAttribute("data-theme");
                document.documentElement.setAttribute("data-pmd-customer-root","gold-v1");
                return;
              }
              var h=window.location.hostname.split(".");
              var tenant=(h.length>=3?h[0]:"default");
              var themeKey=tenant+":paymydine-theme";
              var ovKey=tenant+":paymydine-theme-overrides";
              var t=localStorage.getItem(themeKey);
              if(t){ document.documentElement.setAttribute("data-theme",t); }
              var ov=null; try{ ov=JSON.parse(localStorage.getItem(ovKey)||"null"); }catch(e){}
              if(ov && typeof ov==="object"){
                var r=document.documentElement.style;
                if(ov.primary) r.setProperty("--theme-primary",ov.primary);
                if(ov.secondary) r.setProperty("--theme-secondary",ov.secondary);
                if(ov.accent) r.setProperty("--theme-accent",ov.accent);
                if(ov.background) r.setProperty("--theme-background",ov.background);
              }
            }catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <FaviconSetter />
        <ThemeProvider>
          <ClientLayout className={cn("min-h-screen font-sans antialiased")}>
            {children}
            <Toaster />
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
