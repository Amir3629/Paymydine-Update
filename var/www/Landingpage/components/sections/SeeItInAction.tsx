"use client"

import { useEffect, useRef, useState } from "react"
import { Smartphone, Tablet } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

const SeeItInAction = () => {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="demo" ref={sectionRef} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-brown-900 mb-6">
            {t("demo.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t("demo.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* iPhone Mockup */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative mx-auto device-float" style={{ width: "300px", height: "600px" }}>
              {/* iPhone Frame */}
              <div className="absolute inset-0 bg-black rounded-[3rem] p-2 shadow-2xl device-shadow">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* iPhone Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>

                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full opacity-30"></div>

                  {/* Screen Content */}
                  <div className="w-full h-full pt-8 pb-6 iframe-container">
                    <iframe
                      src="https://paymydine-amir3629-amir3629s-projects.vercel.app/ "
                      className="w-full h-full border-0 rounded-[2rem]"
                      loading="lazy"
                      title="Mobile Ordering Interface"
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: "2rem",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-gold-600" />
                <h3 className="font-semibold text-lg text-brown-900">{t("demo.mobileLabel")}</h3>
              </div>
              <p className="text-gray-600">{t("demo.mobileDescription")}</p>
            </div>
          </div>

          {/* iPad Mockup */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative mx-auto device-float w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg" style={{ height: "360px" }}>
              {/* iPad Frame */}
              <div className="absolute inset-0 bg-gray-800 rounded-2xl p-3 shadow-2xl device-shadow">
                <div className="w-full h-full bg-white rounded-xl overflow-hidden relative">
                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-black rounded-full opacity-30"></div>

                  {/* Screen Content */}
                  <div className="w-full h-full pb-4 iframe-container">
                    <div
                      className="w-full h-full rounded-xl overflow-hidden"
                      style={{
                        transform: "scale(0.9)",
                        transformOrigin: "center center",
                        width: "111.11%",
                        height: "111.11%",
                        marginLeft: "-5.56%",
                        marginTop: "-5.56%"
                      }}
                    >
                      <iframe
                        src="https://paymydine-amir3629-amir3629s-projects.vercel.app/"
                        className="w-full h-full border-0"
                        loading="lazy"
                        title="Tablet View for In-House Browsing"
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Tablet className="w-5 h-5 text-gold-600" />
                <h3 className="font-semibold text-lg text-brown-900">{t("demo.tabletLabel")}</h3>
              </div>
              <p className="text-gray-600">{t("demo.tabletDescription")}</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default SeeItInAction
