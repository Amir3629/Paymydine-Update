"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, HandPlatter, NotebookPen, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"

type WaiterProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  tableId: string
  tableName?: string
}

type NoteProps = WaiterProps & {
  note: string
  setNote: (value: string) => void
  onSend: () => void | Promise<void>
}

function OrganicCardStyle() {
  return (
    <style>{`
      [data-pmd-organic-guest-v2] {
        font-family: Georgia, "Times New Roman", serif !important;
        isolation: isolate !important;
      }

      [data-pmd-organic-guest-v2],
      [data-pmd-organic-guest-v2] * {
        box-sizing: border-box !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-card {
        width: min(420px, calc(100vw - 28px)) !important;
        max-width: 420px !important;
        min-width: 0 !important;
        border-radius: 30px !important;
        padding: 28px !important;
        background:
          radial-gradient(circle at 18% 12%, rgba(184,137,64,.18), transparent 26%),
          radial-gradient(circle at 84% 86%, rgba(116,125,85,.18), transparent 28%),
          linear-gradient(180deg, #fff4dc 0%, #f3e4c7 54%, #ead7b6 100%) !important;
        background-size: auto !important;
        border: 2px solid #ded2ba !important;
        box-shadow: 0 28px 90px rgba(60,53,41,.34), inset 0 1px 0 rgba(255,255,255,.92) !important;
        color: #343529 !important;
        -webkit-text-fill-color: #343529 !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-close {
        position: absolute !important;
        right: 16px !important;
        top: 16px !important;
        width: 38px !important;
        height: 38px !important;
        border-radius: 999px !important;
        border: 1px solid #ded2ba !important;
        background: #fffaf0 !important;
        color: #343529 !important;
        -webkit-text-fill-color: #343529 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-icon {
        width: 64px !important;
        height: 64px !important;
        margin: 0 auto 18px !important;
        border-radius: 999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: linear-gradient(180deg, rgba(116,125,85,.24), rgba(184,137,64,.14)) !important;
        border: 1px solid rgba(116,125,85,.42) !important;
        color: #5f6845 !important;
        -webkit-text-fill-color: #747d55 !important;
      }

      [data-pmd-organic-guest-v2] svg,
      [data-pmd-organic-guest-v2] svg * {
        stroke: currentColor !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-eyebrow {
        margin: 0 0 8px !important;
        text-align: center !important;
        font-size: 11px !important;
        letter-spacing: .22em !important;
        text-transform: uppercase !important;
        color: #747d55 !important;
        -webkit-text-fill-color: #747d55 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-title {
        margin: 0 !important;
        text-align: center !important;
        font-size: 28px !important;
        line-height: 1.08 !important;
        font-weight: 850 !important;
        letter-spacing: -.04em !important;
        color: #343529 !important;
        -webkit-text-fill-color: #343529 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-text {
        max-width: 300px !important;
        margin: 12px auto 0 !important;
        text-align: center !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        color: #5f5748 !important;
        -webkit-text-fill-color: #5f5748 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-actions {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        margin-top: 24px !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-btn {
        min-height: 50px !important;
        border-radius: 999px !important;
        border: 1px solid #ded2ba !important;
        font-weight: 850 !important;
        font-size: 14px !important;
        opacity: 1 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-btn-secondary {
        background: #fffaf0 !important;
        color: #343529 !important;
        -webkit-text-fill-color: #343529 !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-btn-primary {
        background: linear-gradient(180deg, #7f8a5d, #5f6845) !important;
        border-color: #5f6845 !important;
        color: #fffaf0 !important;
        -webkit-text-fill-color: #fffaf0 !important;
        box-shadow: 0 14px 28px rgba(95,104,69,.2) !important;
      }

      [data-pmd-organic-guest-v2] .org-v2-input {
        width: 100% !important;
        min-height: 120px !important;
        margin-top: 20px !important;
        resize: none !important;
        border-radius: 20px !important;
        padding: 16px !important;
        background: #fffaf0 !important;
        border: 1px solid #ded2ba !important;
        color: #343529 !important;
        -webkit-text-fill-color: #343529 !important;
        outline: none !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
      }

      @media (max-width: 460px) {
        [data-pmd-organic-guest-v2] .org-v2-card {
          width: calc(100vw - 24px) !important;
          padding: 24px !important;
        }
        [data-pmd-organic-guest-v2] .org-v2-actions {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  )
}

function Shell({
  isOpen,
  onOpenChange,
  type,
  children,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  type: "waiter" | "note"
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      console.info("PMD_ORGANIC_GUEST_V2_PORTAL_OPEN", type)
    }
  }, [isOpen, type])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          data-pmd-organic-guest-v2={type}
          data-pmd-organic-portal="1"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 14px",
            background: "rgba(35,31,26,.62)",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            opacity: 1,
            visibility: "visible",
            pointerEvents: "auto",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false)
          }}
        >
          <OrganicCardStyle />
          <motion.div
            className="org-v2-card"
            style={{
              position: "relative",
              zIndex: 2147483647,
              display: "block",
              opacity: 1,
              visibility: "visible",
              pointerEvents: "auto",
            }}
            initial={{ opacity: 0, y: 18, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: .97 }}
            transition={{ duration: .2, ease: "easeOut" }}
          >
            <button type="button" className="org-v2-close" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function OrganicWaiterCardV2({ isOpen, onOpenChange, tableId }: WaiterProps) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await apiClient.callWaiter(String(tableId || "delivery"), ".")
      setDone(true)
      toast({ title: "Waiter called", description: "The team has been notified." })
      window.setTimeout(() => {
        setDone(false)
        onOpenChange(false)
      }, 950)
    } catch (error: any) {
      toast({ title: "Waiter call failed", description: error?.message || "Failed to call waiter.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell isOpen={isOpen} onOpenChange={onOpenChange} type="waiter">
      <div className="org-v2-icon">
        {done ? <CheckCircle2 className="h-8 w-8" /> : <HandPlatter className="h-8 w-8" />}
      </div>
      <p className="org-v2-eyebrow">BOTANICAL SERVICE</p>
      <h3 className="org-v2-title">{done ? "Waiter is coming" : "Call Waiter"}</h3>
      {!done && <p className="org-v2-text">Would you like to call a waiter to your table?</p>}
      {!done && (
        <div className="org-v2-actions">
          <button type="button" className="org-v2-btn org-v2-btn-secondary" onClick={() => onOpenChange(false)}>No</button>
          <button type="button" className="org-v2-btn org-v2-btn-primary" disabled={busy} onClick={confirm}>{busy ? "..." : "Yes"}</button>
        </div>
      )}
    </Shell>
  )
}

export function OrganicNoteCardV2({ isOpen, onOpenChange, note, setNote, onSend }: NoteProps) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const send = async () => {
    if (!note.trim() || busy) return
    setBusy(true)
    try {
      await Promise.resolve(onSend())
      setDone(true)
      window.setTimeout(() => {
        setDone(false)
        onOpenChange(false)
      }, 900)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell isOpen={isOpen} onOpenChange={onOpenChange} type="note">
      <div className="org-v2-icon">
        {done ? <CheckCircle2 className="h-8 w-8" /> : <NotebookPen className="h-8 w-8" />}
      </div>
      <p className="org-v2-eyebrow">BOTANICAL NOTE</p>
      <h3 className="org-v2-title">{done ? "Message received" : "Leave a note"}</h3>
      {!done && <p className="org-v2-text">Send a short message to the restaurant team.</p>}
      {!done && (
        <>
          <textarea className="org-v2-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write your note..." />
          <div className="org-v2-actions">
            <button type="button" className="org-v2-btn org-v2-btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="button" className="org-v2-btn org-v2-btn-primary" disabled={!note.trim() || busy} onClick={send}>{busy ? "..." : "Send"}</button>
          </div>
        </>
      )}
    </Shell>
  )
}
