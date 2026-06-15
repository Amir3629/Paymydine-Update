"use client"

import React, { useEffect, useState } from "react"
import { CheckCircle, HandPlatter, NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguageStore } from "@/store/language-store"

const organicModalCardStyle = {
  // PMD_ORGANIC_MODAL_BG_LAYER_FIX_20260609
  "--pmd-paper-soft": "#f5fff8af0",
  "--pmd-paper": "#f6efe2",
  "--pmd-line": "#ded2ba",
  "--pmd-ink": "#343529",
  "--pmd-muted": "#746f61",
  "--pmd-primary": "#747d55",
  "--pmd-primary-dark": "#5f6746",
  "--pmd-accent": "#b88940",
  background: "transparent",
  backgroundColor: "transparent",
  color: "#343529",
  border: "1px solid #ded2ba",
  opacity: 1,
  isolation: "isolate",
  filter: "none",
  mixBlendMode: "normal",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "0 -10px 50px -12px rgba(60,53,41,0.5), inset 0 1px 0 rgba(255,255,255,0.72)",
} as React.CSSProperties

const organicModalGrainStyle = {
  display: "none",
} as React.CSSProperties

const organicPrimaryButtonStyle: React.CSSProperties = {
  background: "#747d55",
  backgroundColor: "#747d55",
  borderColor: "#747d55",
  color: "#f5fff8af0",
  WebkitTextFillColor: "#f5fff8af0",
  boxShadow: "0 12px 24px -14px rgba(60,53,41,.72)",
}

const organicSecondaryButtonStyle: React.CSSProperties = {
  background: "#f5fff8af0",
  backgroundColor: "#f5fff8af0",
  borderColor: "#ded2ba",
  color: "#343529",
  WebkitTextFillColor: "#343529",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.72)",
}



export const OrganicBotanicalValetFeature = () => {
  // PMD_ORGANIC_INLINE_VALET_CARD_20260609
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle")
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    car: "",
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    if (params.get("valet") === "1" || params.get("openValet") === "1") {
      setIsOpen(true)
      params.delete("valet")
      params.delete("openValet")
      const nextQuery = params.toString()
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`
      window.history.replaceState(null, "", nextUrl)
    }
  }, [])

  // PMD_ORGANIC_VALET_IFRAME_MESSAGE_LISTENER_20260609
  useEffect(() => {
    if (typeof window === "undefined") return

    const openValet = () => {
      setStatus("idle")
      setIsOpen(true)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data

      if (
        data === "pmd-open-organic-valet" ||
        data?.type === "pmd-open-organic-valet" ||
        data?.action === "pmd-open-organic-valet"
      ) {
        openValet()
      }
    }

    window.addEventListener("message", onMessage)
    window.addEventListener("pmd-open-organic-valet", openValet)

    return () => {
      window.removeEventListener("message", onMessage)
      window.removeEventListener("pmd-open-organic-valet", openValet)
    }
  }, [])

  // PMD_ORGANIC_VALET_DIRECT_OPEN_LISTENER_20260609
  useEffect(() => {
    if (typeof window === "undefined") return

    const openValet = () => {
      setStatus("idle")
      setIsOpen(true)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data

      if (
        data === "pmd-open-organic-valet" ||
        data?.type === "pmd-open-organic-valet" ||
        data?.action === "pmd-open-organic-valet"
      ) {
        openValet()
      }
    }

    const onDirectEvent = () => openValet()

    window.addEventListener("message", onMessage)
    window.addEventListener("pmd-open-organic-valet", onDirectEvent)
    document.addEventListener("pmd-open-organic-valet", onDirectEvent)

    return () => {
      window.removeEventListener("message", onMessage)
      window.removeEventListener("pmd-open-organic-valet", onDirectEvent)
      document.removeEventListener("pmd-open-organic-valet", onDirectEvent)
    }
  }, [])

  const resetAndClose = () => {
    setIsOpen(false)
    setStatus("idle")
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.plate.trim()) return

    setStatus("submitting")

    try {
      window.localStorage.setItem(
        "pmd-organic-valet-last-request",
        JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString(),
          source: "organic-inline-menu-card",
        })
      )
    } catch (error) {}

    await new Promise((resolve) => window.setTimeout(resolve, 650))
    setStatus("success")
  }

  return (
    <>
      <style
        data-pmd-organic-valet-card-style="1"
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pmdOrganicValetIn {
              from { opacity: 0; transform: translateY(18px) scale(.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            
            /* PMD_HIDE_PARENT_FLOATING_VALET_BUTTON_20260609 */
            [data-pmd-organic-valet-button="1"] {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }

            @keyframes pmdOrganicValetBackdrop {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `,
        }}
      />

      <button
        hidden
        type="button"
        data-pmd-organic-valet-button="1"
        aria-label="Valet Parking Service"
        onClick={() => {
          setStatus("idle")
          setIsOpen(true)
        }}
        className="fixed left-4 top-4 z-[85] inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition active:scale-[0.98]"
        style={{
          backgroundColor: "#f5fff8af0",
          borderColor: "#ded2ba",
          color: "#747d55",
          boxShadow: "0 16px 34px -22px rgba(60,53,41,.82), inset 0 1px 0 rgba(255,255,255,.72)",
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#747d55", stroke: "#747d55" }}
        >
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </button>

      {isOpen ? (
        <div
          data-pmd-organic-valet-modal="1"
          className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-8"
          style={{
            background: "rgba(35,31,26,.46)",
            backdropFilter: "blur(8px) saturate(.95)",
            WebkitBackdropFilter: "blur(8px) saturate(.95)",
            animation: "pmdOrganicValetBackdrop .18s ease-out",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resetAndClose()
          }}
        >
          <div
            className="relative w-full max-w-[27rem] overflow-hidden rounded-[2rem] border p-6 sm:p-7"
            style={{
              backgroundColor: "transparent",
              borderColor: "#ded2ba",
              color: "#343529",
              boxShadow: "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)",
              animation: "pmdOrganicValetIn .22s ease-out",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2rem]"
              style={{
                backgroundColor: "#f5fff8af0",
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)",
                backgroundSize: "100% 100%, 16px 16px",
                backgroundRepeat: "no-repeat, repeat",
                zIndex: 0,
              }}
            />

            <div className="relative z-[1]">
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: "#f5fff8af0",
                    borderColor: "#ded2ba",
                    color: "#747d55",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.72)",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#747d55", stroke: "#747d55" }}
                  >
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: "#343529" }}>
                    Valet Parking Service
                  </h2>
                  <p className="text-xs" style={{ color: "#746f61" }}>
                    Request valet without leaving the menu.
                  </p>
                </div>
              </div>

              {status === "success" ? (
                <div className="space-y-5 text-center">
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: "#747d55",
                      borderColor: "#747d55",
                      color: "#f5fff8af0",
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="26"
                      height="26"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#343529" }}>
                      Valet request received
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: "#746f61" }}>
                      Please keep your ticket ready when retrieving your vehicle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#f5fff8af0",
                      border: "1px solid #747d55",
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="organic-valet-name" className="text-sm font-semibold" style={{ color: "#343529" }}>
                      Enter your name *
                    </label>
                    <input
                      id="organic-valet-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your name"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="organic-valet-plate" className="text-sm font-semibold" style={{ color: "#343529" }}>
                      License Plate *
                    </label>
                    <input
                      id="organic-valet-plate"
                      name="plate"
                      value={formData.plate}
                      onChange={handleChange}
                      required
                      placeholder="Enter license plate number"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="organic-valet-car" className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#343529" }}>
                      Car Details
                      <span className="text-xs font-normal" style={{ color: "#746f61" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      id="organic-valet-car"
                      name="car"
                      value={formData.car}
                      onChange={handleChange}
                      placeholder="Make, model, and color"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold transition disabled:opacity-70"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#f5fff8af0",
                      border: "1px solid #747d55",
                    }}
                  >
                    {status === "submitting" ? "Submitting..." : "Request Valet Service"}
                  </button>

                  <div
                    className="rounded-2xl border p-4 text-sm"
                    style={{
                      backgroundColor: "#f6efe2",
                      borderColor: "#ded2ba",
                      color: "#746f61",
                    }}
                  >
                    <p className="mb-2">Our valet service is available during restaurant hours.</p>
                    <p>Please have your ticket ready when retrieving your vehicle.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


export const OrganicBotanicalCheckoutScopedStyles = () => (
  <style
    data-pmd-organic-checkout-style="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_ORGANIC_CHECKOUT_EXACT_SELECTORS_20260609 */

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"].pmd-checkout-modal,
        html[data-pmd-organic-botanical-active="1"] .pmd-checkout-modal[data-pmd-checkout-design-system="1"] {
          background-color: #f5fff8af0 !important;
          background-image:
            linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)),
            radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0) !important;
          background-size: 100% 100%, 16px 16px !important;
          background-repeat: no-repeat, repeat !important;
          border: 1px solid #ded2ba !important;
          color: #343529 !important;
          box-shadow: 0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72) !important;
        }

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-scroll="1"],
        html[data-pmd-organic-botanical-active="1"] .pmd-checkout-body {
          background-color: #f6efe2 !important;
          background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0) !important;
          background-size: 16px 16px !important;
          color: #343529 !important;
        }

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-flat-section,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-item-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-total-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-payment-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-meta-row {
          background-color: #f5fff8af0 !important;
          background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.065) 1px, transparent 0) !important;
          background-size: 16px 16px !important;
          border-color: #ded2ba !important;
          color: #343529 !important;
          box-shadow: 0 10px 24px rgba(60,53,41,.06) !important;
        }

        html[data-pmd-organic-botanical-active="1"] button[data-pmd-organic-action="primary"] {
          background: #747d55 !important;
          background-color: #747d55 !important;
          border-color: #747d55 !important;
          color: #f5fff8af0 !important;
          -webkit-text-fill-color: #f5fff8af0 !important;
        }

        html[data-pmd-organic-botanical-active="1"] button[data-pmd-organic-action="secondary"] {
          background: #f5fff8af0 !important;
          background-color: #f5fff8af0 !important;
          border-color: #ded2ba !important;
          color: #343529 !important;
          -webkit-text-fill-color: #343529 !important;
        }
      `,
    }}
  />
)


export const OrganicBotanicalModalShell = ({
  isOpen,
  modalName,
  children,
}: {
  isOpen: boolean
  modalName: string
  children: React.ReactNode
}) => (
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        data-pmd-organic-modal={modalName}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
        style={{
          background: "rgba(35, 31, 26, 0.48)",
          backdropFilter: "blur(6px) saturate(0.92)",
          WebkitBackdropFilter: "blur(6px) saturate(0.92)",
        }}
        style={{
          background: "rgba(35, 31, 26, 0.46)",
          backdropFilter: "blur(8px) saturate(0.95)",
          WebkitBackdropFilter: "blur(8px) saturate(0.95)",
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="pmd-organic-modal-card relative w-full max-w-[25rem] overflow-hidden rounded-[2rem] border p-7 text-center sm:p-8"
          style={organicModalCardStyle}
        >
          <div
            aria-hidden="true"
            data-pmd-organic-modal-bg="1"
            className="pointer-events-none absolute inset-0 rounded-[2rem]"
            style={{
              backgroundColor: "#f5fff8af0",
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,0.09) 1px, transparent 0)",
              backgroundSize: "100% 100%, 16px 16px",
              backgroundRepeat: "no-repeat, repeat",
              opacity: 1,
              zIndex: 0,
            }}
          />
          <div className="pointer-events-none absolute inset-0" style={organicModalGrainStyle} />
          <div className="relative z-10">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export const OrganicBotanicalIconBadge = ({ children }: { children: React.ReactNode }) => (
  <div
    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border shadow-inner"
    style={{
      background: "rgba(255, 250, 240, 0.96)",
      borderColor: "#DED2BA",
      color: "#747D55",
      boxShadow: "0 12px 28px -18px rgba(60,53,41,.72), inset 0 1px 0 rgba(255,255,255,.72)",
    }}
  >
    {children}
  </div>
)

export const OrganicBotanicalWaiterDialog = ({
  isOpen,
  onOpenChange,
  tableId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId: string
}) => {
  const { t } = useLanguageStore()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    setIsConfirmed(false)
  }

  const handleConfirm = async () => {
    if (isSubmitting) return
    const msg = '.'
    const resolvedTableId = tableId || 'delivery'
    setIsSubmitting(true)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[waiter-call] payload', { tableId: resolvedTableId, msg, source: tableId ? 'table' : 'delivery_menu' })
    }
    try {
      await apiClient.callWaiter(String(resolvedTableId), msg)
      toast({ title: 'Waiter Called', description: tableId ? 'We are on the way!' : 'We received your assistance request.' })
      setIsConfirmed(true)
      window.setTimeout(() => {
        setIsConfirmed(false)
        onOpenChange(false)
      }, 1200)
    } catch (e: any) {
      toast({ title: 'Error', description: (e?.message || 'Failed to call waiter'), variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OrganicBotanicalModalShell isOpen={isOpen} modalName="waiter">
      {isConfirmed ? (
        <>
          <OrganicBotanicalIconBadge><CheckCircle className="h-8 w-8" /></OrganicBotanicalIconBadge>
          <h3 className="mb-2 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('waiterComing')}</h3>
          <p className="text-base leading-relaxed text-[#5f584b]">{tableId ? 'We are on the way!' : 'We received your assistance request.'}</p>
        </>
      ) : (
        <>
          <OrganicBotanicalIconBadge><HandPlatter className="h-8 w-8" /></OrganicBotanicalIconBadge>
          <h3 className="mb-3 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('callWaiter')}</h3>
          <p className="mx-auto mb-7 max-w-[18rem] text-base font-medium leading-relaxed text-[#5f584b]">{t('callWaiterConfirm')}</p>
          <div className="flex gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
              data-pmd-organic-action="secondary" style={organicSecondaryButtonStyle}
            >
              {t('no')}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-[0_12px_24px_rgba(115,122,85,0.22)] transition-opacity disabled:opacity-70"
              data-pmd-organic-action="primary" style={organicPrimaryButtonStyle}
            >
              {isSubmitting ? 'Calling…' : t('yes')}
            </motion.button>
          </div>
        </>
      )}
    </OrganicBotanicalModalShell>
  )
}

export const OrganicBotanicalNoteDialog = ({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void
}) => {
  const { t } = useLanguageStore()

  return (
    <OrganicBotanicalModalShell isOpen={isOpen} modalName="note">
      <OrganicBotanicalIconBadge><NotebookPen className="h-8 w-8" /></OrganicBotanicalIconBadge>
      <h3 className="mb-3 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('leaveNoteTitle')}</h3>
      <p className="mx-auto mb-5 max-w-[19rem] text-base leading-relaxed text-[#5f584b]">{t('leaveNoteDesc')}</p>
      <Textarea
        placeholder={t('notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-5 min-h-[118px] w-full rounded-[1.35rem] border px-4 py-3 text-left text-base shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-[#737A55]/35"
        style={{ background: '#FFFDF7', borderColor: 'var(--pmd-line, #D8CBAF)', color: '#352F28' }}
      />
      <div className="flex gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenChange(false)}
          className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold"
          data-pmd-organic-action="secondary" style={organicSecondaryButtonStyle}
        >
          {t('cancel')}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSend}
          className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-[0_12px_24px_rgba(115,122,85,0.22)]"
          data-pmd-organic-action="primary" style={organicPrimaryButtonStyle}
        >
          {t('sendNote')}
        </motion.button>
      </div>
    </OrganicBotanicalModalShell>
  )
}

// Enhanced Waiter Dialog Component
