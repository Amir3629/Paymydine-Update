"use client"

import React, { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, HandPlatter, NotebookPen, X } from "lucide-react"
import { useLanguageStore } from "@/store/language-store"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"

type WaiterProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId: string
  tableName?: string
}

type NoteProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void | Promise<void>
  tableId: string
  tableName?: string
}

type Variant = "kazen" | "modernGreen" | "organic" | "gold"

type ThemeSkin = {
  overlay: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  text: string
  muted: string
  accent: string
  primaryBg: string
  primaryText: string
  secondaryBg: string
  secondaryText: string
  secondaryBorder: string
  inputBg: string
  inputText: string
  inputBorder: string
  radius: string
  fontFamily: string
  eyebrow: string
}

const skins: Record<Variant, ThemeSkin> = {
  kazen: {
    overlay: "rgba(32, 29, 24, .42)",
    cardBg: "linear-gradient(180deg, rgba(250,249,244,.99), rgba(242,237,226,.99))",
    cardBorder: "rgba(93, 72, 55, .20)",
    cardShadow: "0 26px 72px rgba(38,30,22,.20)",
    text: "#25211c",
    muted: "rgba(37,33,28,.70)",
    accent: "#b75d54",
    primaryBg: "#25211c",
    primaryText: "#faf9f4",
    secondaryBg: "rgba(255,255,255,.56)",
    secondaryText: "#25211c",
    secondaryBorder: "rgba(93,72,55,.22)",
    inputBg: "rgba(255,255,255,.64)",
    inputText: "#25211c",
    inputBorder: "rgba(93,72,55,.20)",
    radius: "4px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    eyebrow: "風 然",
  },
  modernGreen: {
    overlay: "rgba(0, 8, 5, .68)",
    cardBg: "radial-gradient(circle at 50% 0%, rgba(21,93,68,.55), transparent 48%), linear-gradient(160deg, rgba(4,34,25,.99), rgba(1,14,10,.99))",
    cardBorder: "rgba(95, 212, 158, .34)",
    cardShadow: "0 28px 90px rgba(0,0,0,.46), inset 0 1px 0 rgba(160,255,214,.08)",
    text: "#f4fff8",
    muted: "rgba(244,255,248,.74)",
    accent: "#74e0aa",
    primaryBg: "linear-gradient(180deg, #74e0aa, #29bc7e)",
    primaryText: "#03160f",
    secondaryBg: "rgba(255,255,255,.055)",
    secondaryText: "#f4fff8",
    secondaryBorder: "rgba(95,212,158,.26)",
    inputBg: "rgba(255,255,255,.06)",
    inputText: "#f4fff8",
    inputBorder: "rgba(95,212,158,.26)",
    radius: "28px",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    eyebrow: "FRESH SERVICE",
  },
  organic: {
    overlay: "rgba(50, 44, 35, .46)",
    cardBg: "linear-gradient(180deg, rgba(247,243,234,.99), rgba(238,229,211,.99))",
    cardBorder: "#ded2ba",
    cardShadow: "0 26px 72px rgba(60,53,41,.28), inset 0 1px 0 rgba(255,255,255,.72)",
    text: "#343529",
    muted: "#746f61",
    accent: "#747d55",
    primaryBg: "#747d55",
    primaryText: "#f7f3ea",
    secondaryBg: "#f5f8ef",
    secondaryText: "#343529",
    secondaryBorder: "#ded2ba",
    inputBg: "#f5f8ef",
    inputText: "#343529",
    inputBorder: "#ded2ba",
    radius: "30px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    eyebrow: "BOTANICAL SERVICE",
  },
  gold: {
    overlay: "rgba(0, 0, 0, .70)",
    cardBg: "radial-gradient(circle at 50% 0%, rgba(184,137,64,.22), transparent 46%), linear-gradient(160deg, rgba(24,18,10,.99), rgba(6,5,4,.99))",
    cardBorder: "rgba(244,213,141,.40)",
    cardShadow: "0 30px 90px rgba(0,0,0,.58), inset 0 1px 0 rgba(244,213,141,.10)",
    text: "#f6e8c8",
    muted: "rgba(246,232,200,.75)",
    accent: "#f4d58d",
    primaryBg: "linear-gradient(135deg, #f4d58d, #b88940)",
    primaryText: "#201509",
    secondaryBg: "rgba(255,255,255,.05)",
    secondaryText: "#f6e8c8",
    secondaryBorder: "rgba(244,213,141,.28)",
    inputBg: "rgba(255,255,255,.06)",
    inputText: "#f6e8c8",
    inputBorder: "rgba(244,213,141,.28)",
    radius: "24px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    eyebrow: "LUXURY SERVICE",
  },
}

function useSkin(variant: Variant) {
  return useMemo(() => skins[variant], [variant])
}

function ScopedDialogStyles({ skin, variant }: { skin: ThemeSkin; variant: Variant }) {
  return (
    <style>{`
      [data-pmd-theme-guest-dialog="${variant}"] {
        --pmd-guest-card-bg: ${skin.cardBg};
        --pmd-guest-card-border: ${skin.cardBorder};
        --pmd-guest-card-shadow: ${skin.cardShadow};
        --pmd-guest-text: ${skin.text};
        --pmd-guest-muted: ${skin.muted};
        --pmd-guest-accent: ${skin.accent};
        --pmd-guest-primary-bg: ${skin.primaryBg};
        --pmd-guest-primary-text: ${skin.primaryText};
        --pmd-guest-secondary-bg: ${skin.secondaryBg};
        --pmd-guest-secondary-text: ${skin.secondaryText};
        --pmd-guest-secondary-border: ${skin.secondaryBorder};
        --pmd-guest-input-bg: ${skin.inputBg};
        --pmd-guest-input-text: ${skin.inputText};
        --pmd-guest-input-border: ${skin.inputBorder};
        font-family: ${skin.fontFamily} !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-card {
        width: min(420px, calc(100vw - 34px)) !important;
        max-width: 420px !important;
        min-width: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: calc(100vh - 80px) !important;
        overflow: hidden !important;
        padding: 28px !important;
        border-radius: ${skin.radius} !important;
        background: var(--pmd-guest-card-bg) !important;
        border: 1px solid var(--pmd-guest-card-border) !important;
        box-shadow: var(--pmd-guest-card-shadow) !important;
        color: var(--pmd-guest-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-text) !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-card,
      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-card * {
        box-sizing: border-box !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-title {
        color: var(--pmd-guest-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-text) !important;
        font-size: 26px !important;
        line-height: 1.12 !important;
        font-weight: 800 !important;
        margin: 0 !important;
        text-align: center !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-eyebrow {
        color: var(--pmd-guest-accent) !important;
        -webkit-text-fill-color: var(--pmd-guest-accent) !important;
        font-size: 11px !important;
        letter-spacing: .22em !important;
        text-transform: uppercase !important;
        margin: 0 0 8px !important;
        text-align: center !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-text {
        color: var(--pmd-guest-muted) !important;
        -webkit-text-fill-color: var(--pmd-guest-muted) !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        margin: 12px auto 0 !important;
        max-width: 300px !important;
        text-align: center !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-icon {
        width: 64px !important;
        height: 64px !important;
        margin: 0 auto 18px !important;
        border-radius: 999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: var(--pmd-guest-accent) !important;
        -webkit-text-fill-color: var(--pmd-guest-accent) !important;
        background: color-mix(in srgb, var(--pmd-guest-accent) 12%, transparent) !important;
        border: 1px solid color-mix(in srgb, var(--pmd-guest-accent) 32%, transparent) !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-icon svg,
      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-close svg {
        color: currentColor !important;
        stroke: currentColor !important;
        -webkit-text-fill-color: currentColor !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-close {
        position: absolute !important;
        right: 16px !important;
        top: 16px !important;
        width: 38px !important;
        height: 38px !important;
        border-radius: 999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: var(--pmd-guest-secondary-bg) !important;
        border: 1px solid var(--pmd-guest-secondary-border) !important;
        color: var(--pmd-guest-secondary-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-secondary-text) !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-actions {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        margin-top: 22px !important;
        width: 100% !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-button {
        min-height: 50px !important;
        width: 100% !important;
        border-radius: 999px !important;
        padding: 0 18px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        line-height: 1 !important;
        font-weight: 850 !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-button-secondary {
        background: var(--pmd-guest-secondary-bg) !important;
        border: 1px solid var(--pmd-guest-secondary-border) !important;
        color: var(--pmd-guest-secondary-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-secondary-text) !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-button-primary {
        background: var(--pmd-guest-primary-bg) !important;
        border: 1px solid var(--pmd-guest-card-border) !important;
        color: var(--pmd-guest-primary-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-primary-text) !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-input {
        width: 100% !important;
        min-height: 118px !important;
        resize: none !important;
        border-radius: 18px !important;
        padding: 16px !important;
        outline: none !important;
        background: var(--pmd-guest-input-bg) !important;
        border: 1px solid var(--pmd-guest-input-border) !important;
        color: var(--pmd-guest-input-text) !important;
        -webkit-text-fill-color: var(--pmd-guest-input-text) !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
      }

      [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-input::placeholder {
        color: var(--pmd-guest-muted) !important;
        -webkit-text-fill-color: var(--pmd-guest-muted) !important;
        opacity: .75 !important;
      }

      @media (max-width: 460px) {
        [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-card {
          width: calc(100vw - 28px) !important;
          padding: 24px !important;
        }
        [data-pmd-theme-guest-dialog="${variant}"] .pmd-guest-actions {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  )
}

function DialogShell({
  variant,
  isOpen,
  onOpenChange,
  icon,
  title,
  description,
  successTitle,
  children,
  success,
}: {
  variant: Variant
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  icon: React.ReactNode
  title: string
  description: string
  successTitle: string
  children: React.ReactNode
  success: boolean
}) {
  const skin = useSkin(variant)

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          data-pmd-theme-guest-dialog={variant}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8"
          style={{
            background: skin.overlay,
            backdropFilter: "blur(14px) saturate(.92)",
            WebkitBackdropFilter: "blur(14px) saturate(.92)",
            fontFamily: skin.fontFamily,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false)
          }}
        >
          <ScopedDialogStyles skin={skin} variant={variant} />

          <motion.div
            className="pmd-guest-card relative"
            initial={{ opacity: 0, y: 18, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: .97 }}
            transition={{ duration: .22, ease: "easeOut" }}
          >
            <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="pmd-guest-close">
              <X className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {success ? (
                <motion.div
                  key="success"
                  className="py-8 text-center"
                  initial={{ opacity: 0, scale: .96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: .96 }}
                >
                  <div className="pmd-guest-icon">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="pmd-guest-eyebrow">{skin.eyebrow}</p>
                  <h3 className="pmd-guest-title">{successTitle}</h3>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-0 text-center">
                    <div className="pmd-guest-icon">{icon}</div>
                    <p className="pmd-guest-eyebrow">{skin.eyebrow}</p>
                    <h3 className="pmd-guest-title">{title}</h3>
                    <p className="pmd-guest-text">{description}</p>
                  </div>
                  {children}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function WaiterDialog({ variant, isOpen, onOpenChange, tableId }: WaiterProps & { variant: Variant }) {
  const { t } = useLanguageStore()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      const resolvedTableId = tableId || "delivery"
      await apiClient.callWaiter(String(resolvedTableId), ".")
      setSuccess(true)
      toast({
        title: t("waiterComing") || "Waiter Called",
        description: tableId ? "We are on the way!" : "We received your assistance request.",
      })
      await new Promise((resolve) => setTimeout(resolve, 1100))
      onOpenChange(false)
      setTimeout(() => setSuccess(false), 250)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to call waiter",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell
      variant={variant}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      icon={<HandPlatter className="h-8 w-8" />}
      title={t("callWaiter") || "Call Waiter"}
      description={t("callWaiterConfirm") || "Would you like to call the waiter to your table?"}
      successTitle={t("waiterComing") || "Waiter is coming"}
      success={success}
    >
      <div className="pmd-guest-actions">
        <button type="button" onClick={() => onOpenChange(false)} className="pmd-guest-button pmd-guest-button-secondary">
          {t("no") || "No"}
        </button>
        <button type="button" disabled={busy} onClick={confirm} className="pmd-guest-button pmd-guest-button-primary">
          {busy ? "..." : t("yes") || "Yes"}
        </button>
      </div>
    </DialogShell>
  )
}

function NoteDialog({ variant, isOpen, onOpenChange, note, setNote, onSend }: NoteProps & { variant: Variant }) {
  const { t } = useLanguageStore()
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  const send = async () => {
    if (!note.trim() || busy) return
    setBusy(true)
    try {
      await Promise.resolve(onSend())
      setSuccess(true)
      await new Promise((resolve) => setTimeout(resolve, 900))
      onOpenChange(false)
      setTimeout(() => setSuccess(false), 250)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell
      variant={variant}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      icon={<NotebookPen className="h-8 w-8" />}
      title={t("leaveNoteTitle") || "Leave a note"}
      description={t("leaveNoteDesc") || "Send a short message to the restaurant team."}
      successTitle={t("messageReceived") || "Message received"}
      success={success}
    >
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        className="pmd-guest-input mt-5"
        placeholder={t("notePlaceholder") || "Write your note..."}
      />
      <div className="pmd-guest-actions">
        <button type="button" onClick={() => onOpenChange(false)} className="pmd-guest-button pmd-guest-button-secondary">
          {t("cancel") || "Cancel"}
        </button>
        <button type="button" disabled={!note.trim() || busy} onClick={send} className="pmd-guest-button pmd-guest-button-primary">
          {busy ? "..." : t("send") || "Send"}
        </button>
      </div>
    </DialogShell>
  )
}

export function KazenWaiterDialog(props: WaiterProps) {
  return <WaiterDialog {...props} variant="kazen" />
}
export function KazenNoteDialog(props: NoteProps) {
  return <NoteDialog {...props} variant="kazen" />
}

export function ModernGreenWaiterDialog(props: WaiterProps) {
  return <WaiterDialog {...props} variant="modernGreen" />
}
export function ModernGreenNoteDialog(props: NoteProps) {
  return <NoteDialog {...props} variant="modernGreen" />
}

export function OrganicBotanicalWaiterDialog(props: WaiterProps) {
  return <WaiterDialog {...props} variant="organic" />
}
export function OrganicBotanicalNoteDialog(props: NoteProps) {
  return <NoteDialog {...props} variant="organic" />
}

export function GoldWaiterDialog(props: WaiterProps) {
  return <WaiterDialog {...props} variant="gold" />
}
export function GoldNoteDialog(props: NoteProps) {
  return <NoteDialog {...props} variant="gold" />
}
