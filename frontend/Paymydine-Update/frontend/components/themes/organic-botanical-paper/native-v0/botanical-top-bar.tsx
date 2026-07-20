"use client"

import { useState } from "react"
import { ChevronLeft, Menu, Utensils, CarFront, Languages } from "lucide-react"
import { cn } from "@/lib/utils"

export type BotanicalTopBarProps = {
  restaurantName?: string
  tagline?: string
  onMenu?: () => void
  onLanguage?: () => void
  onOpenValet?: () => void
  className?: string
}

export function BotanicalTopBar({
  restaurantName = "Mimoza Restaurant",
  tagline = "Farm to Table",
  onMenu,
  onLanguage,
  onOpenValet,
  className,
}: BotanicalTopBarProps) {

  // PMD_V0_REAL_MENU_BUTTON_TO_VALET_20260609
  const [pmdValetOpen, setPmdValetOpen] = useState(false)
  const [pmdValetStatus, setPmdValetStatus] = useState<"idle" | "submitting" | "success">("idle")

  const [open, setOpen] = useState(false)

  return (
    <div className={cn("relative z-40 mx-auto flex max-w-2xl items-center justify-center px-5 pt-5 pb-2", className)}>
      <div className="absolute left-5 top-5">
        <button
      type="button"
      aria-label="Valet Parking Service"
      title="Valet Parking Service"
      data-pmd-v0-real-valet-button="1"
      className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--pmd-line)] bg-[rgba(255,250,240,0.88)] text-[var(--pmd-ink)] shadow-[0_8px_22px_rgba(52,53,41,0.10)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[var(--pmd-paper-soft)]"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setPmdValetStatus("idle")
        setPmdValetOpen(true)
      }}
    >
      <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
    </button>

      {pmdValetOpen ? (
        <div
          data-pmd-v0-valet-card="1"
          role="dialog"
          aria-modal="true"
          aria-label="Valet Parking Service"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8"
          style={{
            background: "rgba(35,31,26,.46)",
            backdropFilter: "blur(8px) saturate(.95)",
            WebkitBackdropFilter: "blur(8px) saturate(.95)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPmdValetOpen(false)
              setPmdValetStatus("idle")
            }
          }}
        >
          <div
            className="relative w-full max-w-[27rem] overflow-hidden rounded-[2rem] border p-6 sm:p-7"
            style={{
              borderColor: "#ded2ba",
              color: "#343529",
              boxShadow: "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2rem]"
              style={{
                backgroundColor: "#fffaf0",
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
                    backgroundColor: "#fffaf0",
                    borderColor: "#ded2ba",
                    color: "#747d55",
                  }}
                >
                  <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
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

              {pmdValetStatus === "success" ? (
                <div className="space-y-5 text-center">
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-2xl font-bold"
                    style={{
                      backgroundColor: "#747d55",
                      borderColor: "#747d55",
                      color: "#fffaf0",
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#343529" }}>
                      Valet request received
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: "#746f61" }}>
                      Please have your ticket ready when retrieving your vehicle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPmdValetOpen(false)
                      setPmdValetStatus("idle")
                    }}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#fffaf0",
                      border: "1px solid #747d55",
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    const form = event.currentTarget
                    const formData = new FormData(form)
                    const name = String(formData.get("name") || "").trim()
                    const plate = String(formData.get("plate") || "").trim()
                    const car = String(formData.get("car") || "").trim()

                    if (!name || !plate) return

                    setPmdValetStatus("submitting")

                    try {
                      window.localStorage.setItem(
                        "pmd-v0-organic-valet-request",
                        JSON.stringify({
                          name,
                          plate,
                          car,
                          createdAt: new Date().toISOString(),
                          source: "v0-real-menu-button",
                        })
                      )
                    } catch (error) {}

                    await new Promise((resolve) => window.setTimeout(resolve, 650))
                    setPmdValetStatus("success")
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold" style={{ color: "#343529" }}>
                      Enter your name *
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="Enter your name"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#fffaf0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold" style={{ color: "#343529" }}>
                      License Plate *
                    </label>
                    <input
                      name="plate"
                      required
                      placeholder="Enter license plate number"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#fffaf0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#343529" }}>
                      Car Details
                      <span className="text-xs font-normal" style={{ color: "#746f61" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      name="car"
                      placeholder="Make, model, and color"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#fffaf0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pmdValetStatus === "submitting"}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold transition disabled:opacity-70"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#fffaf0",
                      border: "1px solid #747d55",
                    }}
                  >
                    {pmdValetStatus === "submitting" ? "Submitting..." : "Request Valet Service"}
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

        {open && (
          <div className="absolute left-0 mt-3 w-44 overflow-hidden rounded-[1.4rem] border border-[var(--pmd-line)] bg-[rgba(255,250,240,0.96)] p-2 shadow-[0_18px_45px_rgba(52,53,41,0.16)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[var(--pmd-ink)] transition hover:bg-[rgba(111,118,84,0.10)]"
            >
              <Utensils className="h-4 w-4 text-[var(--pmd-primary)]" strokeWidth={1.5} />
              Menu
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenValet?.()
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[var(--pmd-ink)] transition hover:bg-[rgba(111,118,84,0.10)]"
            >
              <CarFront className="h-4 w-4 text-[var(--pmd-primary)]" strokeWidth={1.5} />
              Valet
            </button>
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="font-serif text-[1.35rem] font-semibold uppercase tracking-[0.34em] text-[var(--pmd-ink)] sm:text-[1.55rem]">
          {restaurantName}
        </div>
        <div className="mt-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.42em] text-[var(--pmd-muted)]">
          {tagline}
        </div>
      </div>

      <button
        type="button"
        aria-label="Change language"
        onClick={() => {
          onLanguage?.()
        }}
        className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--pmd-line)] bg-[rgba(255,250,240,0.88)] text-[var(--pmd-ink)] shadow-[0_8px_22px_rgba(52,53,41,0.10)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[var(--pmd-paper-soft)]"
      >
        <span className="text-xs font-bold uppercase">EN</span>
        <Languages className="sr-only h-4 w-4" />
      </button>
    </div>
  )
}
