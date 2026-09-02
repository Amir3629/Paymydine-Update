"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Bot, Send, Sparkles, X } from "lucide-react"
import { EnvironmentConfig } from "@/lib/environment-config"
import { useThemeStore } from "@/store/theme-store"

type GuestAiResponse = {
  ok?: boolean
  enabled?: boolean
  answer?: string
  message?: string
  run_id?: string
  latency_ms?: number
}

const copy = {
  en: {
    title: "Ask the menu",
    subtitle: "Need help choosing? I’m here ✨",
    placeholder: "Ask about dishes, ingredients or what to try…",
    send: "Ask",
    checking: "Checking the menu…",
    empty: "Ask me what’s good, what’s light, or what fits your preferences.",
    allergy: "Severe allergy? Please confirm ingredients and cross-contact with restaurant staff before ordering.",
    error: "I’m taking a tiny menu break 😄 Please try again in a moment.",
    prompts: ["What do you recommend?", "I’m vegetarian", "What’s light?", "What’s sold out?"],
  },
  de: {
    title: "Frag die Speisekarte",
    subtitle: "Hilfe bei der Auswahl? Ich bin da ✨",
    placeholder: "Frag nach Gerichten, Zutaten oder Empfehlungen…",
    send: "Fragen",
    checking: "Ich schaue in die Speisekarte…",
    empty: "Frag mich nach Empfehlungen, leichten Gerichten oder deinen Vorlieben.",
    allergy: "Starke Allergie? Bitte Zutaten und mögliche Kreuzkontakte vor der Bestellung beim Restaurant-Team bestätigen.",
    error: "Ich mache gerade eine winzige Menü-Pause 😄 Bitte gleich noch einmal versuchen.",
    prompts: ["Was empfiehlst du?", "Ich esse vegetarisch", "Was ist eher leicht?", "Was ist ausverkauft?"],
  },
}

function isMenuPath(pathname: string | null) {
  const path = pathname || "/"
  return path === "/" || path === "/menu" || path.startsWith("/menu/") || path.startsWith("/table/")
}

export default function GuestAiConcierge() {
  const pathname = usePathname()
  const { settings } = useThemeStore()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState("")

  const locale = useMemo(() => {
    if (typeof document !== "undefined" && document.documentElement.lang) {
      return document.documentElement.lang
    }
    if (typeof navigator !== "undefined") return navigator.language || "en"
    return "en"
  }, [])

  const text = locale.toLowerCase().startsWith("de") ? copy.de : copy.en
  const primary = settings.primary_color || "#062F2A"
  const background = settings.background_color || "#FAF9F4"

  useEffect(() => {
    let cancelled = false

    if (!isMenuPath(pathname)) {
      setEnabled(false)
      setOpen(false)
      return () => {
        cancelled = true
      }
    }

    const endpoint = EnvironmentConfig.getInstance().getApiEndpoint("/guest-ai/status")

    fetch(endpoint, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload: GuestAiResponse) => {
        if (!cancelled) setEnabled(Boolean(payload?.ok && payload?.enabled))
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  async function ask(value?: string) {
    const nextQuestion = String(value ?? question).trim()
    if (!nextQuestion || busy) return

    setQuestion(nextQuestion)
    setBusy(true)
    setError("")
    setAnswer("")

    try {
      const endpoint = EnvironmentConfig.getInstance().getApiEndpoint("/guest-ai/ask")
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          question: nextQuestion,
          locale,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as GuestAiResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || text.error)
      }

      setAnswer(String(payload.answer || ""))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.error)
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask()
  }

  if (!enabled || !isMenuPath(pathname)) return null

  return (
    <div data-pmd-guest-ai="v1" className="fixed bottom-24 right-4 z-[90] md:bottom-6 md:right-6">
      {open && (
        <section
          className="mb-3 flex max-h-[70vh] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-2xl"
          aria-label={text.title}
        >
          <header className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4" style={{ background }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primary }}>
                <Sparkles size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[17px] font-extrabold leading-tight text-slate-950">{text.title}</h2>
                <p className="mt-1 text-[13px] leading-snug text-slate-600">{text.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/80 text-slate-700"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-4">
            {!answer && !error && !busy && (
              <p className="mb-4 text-[14px] leading-relaxed text-slate-600">{text.empty}</p>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {text.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(prompt)}
                  className="rounded-full border border-black/10 bg-slate-50 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {(busy || answer || error) && (
              <div className="mb-4 rounded-2xl border border-black/10 bg-slate-50 p-4" aria-live="polite">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  <Bot size={15} /> Menu helper
                </div>
                {busy ? (
                  <p className="text-[14px] leading-relaxed text-slate-600">{text.checking}</p>
                ) : error ? (
                  <p className="text-[14px] leading-relaxed text-rose-700">{error}</p>
                ) : (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{answer}</p>
                )}
              </div>
            )}

            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 800))}
                rows={2}
                disabled={busy}
                placeholder={text.placeholder}
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-3.5 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-black/10 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !question.trim()}
                className="flex h-[52px] shrink-0 items-center gap-2 rounded-2xl px-4 text-[13px] font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: primary }}
              >
                <Send size={15} />
                <span className="hidden sm:inline">{text.send}</span>
              </button>
            </form>

            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{text.allergy}</p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex h-14 items-center gap-2 rounded-full px-4 text-[13px] font-extrabold text-white shadow-xl ring-1 ring-black/5 transition hover:-translate-y-0.5"
        style={{ backgroundColor: primary }}
        aria-expanded={open}
        aria-label={text.title}
      >
        <Sparkles size={19} />
        <span>{text.title}</span>
      </button>
    </div>
  )
}
