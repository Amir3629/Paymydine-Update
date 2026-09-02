'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import type { ThemeId } from '@/src/themes/catalog'
import styles from './GuestAiConcierge.module.css'

type GuestAiCopy = {
  button: string
  title: string
  subtitle: string
  intro: string
  placeholder: string
  send: string
  close: string
  thinking: string
  retry: string
  safety: string
  prompts: string[]
}

const EN: GuestAiCopy = {
  button: 'Ask PMD',
  title: 'Ask PMD ✨',
  subtitle: 'Your menu helper',
  intro: 'Not sure what to pick? Tell me what you feel like eating and I’ll help you explore this menu.',
  placeholder: 'Ask about dishes, ingredients, price or dietary choices…',
  send: 'Send',
  close: 'Close menu assistant',
  thinking: 'Checking the menu…',
  retry: 'I couldn’t finish that one. Try again in a moment.',
  safety: 'For severe allergies, always confirm with restaurant staff before ordering.',
  prompts: ['What should I try? ✨', 'Something vegetarian 🌱', 'What’s popular?', 'Help me choose under {budget}'],
}

const DE: GuestAiCopy = {
  button: 'PMD fragen',
  title: 'PMD fragen ✨',
  subtitle: 'Deine Menü-Hilfe',
  intro: 'Du weißt noch nicht, worauf du Lust hast? Sag mir kurz, was du suchst – ich helfe dir im aktuellen Menü.',
  placeholder: 'Frag nach Gerichten, Zutaten, Preisen oder Ernährungsoptionen…',
  send: 'Senden',
  close: 'Menü-Assistent schließen',
  thinking: 'Ich schaue ins Menü…',
  retry: 'Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal.',
  safety: 'Bei schweren Allergien bitte immer zusätzlich beim Restaurant-Team nachfragen.',
  prompts: ['Was soll ich probieren? ✨', 'Etwas Vegetarisches 🌱', 'Was ist beliebt?', 'Hilf mir unter {budget} zu wählen'],
}

function copyFor(locale: string): GuestAiCopy {
  return String(locale || '').toLowerCase().startsWith('de') ? DE : EN
}

function cleanAnswer(value: string): string {
  return String(value || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim()
}

type StatusPayload = {
  ok?: boolean
  enabled?: boolean
}

type AskPayload = {
  ok?: boolean
  answer?: string
  message?: string
}

export function GuestAiConcierge({ themeId }: { themeId: ThemeId }) {
  const { locale, direction, formatCurrency } = useMenuRuntime()
  const copy = useMemo(() => copyFor(locale), [locale])
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const nextHost = document.querySelector<HTMLElement>('main[data-theme-id]')
    setHost(nextHost)
  }, [themeId])

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/v1/guest-ai/status', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as StatusPayload
        return response.ok && payload.ok === true && payload.enabled === true
      })
      .then((available) => {
        setEnabled(Boolean(available))
        setReady(true)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEnabled(false)
          setReady(true)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const ask = useCallback(async (prompt?: string) => {
    const value = String(prompt ?? question).trim()
    if (!value || busy) return

    setQuestion(value)
    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/v1/guest-ai/ask', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ question: value, locale }),
      })

      const payload = await response.json().catch(() => ({})) as AskPayload
      const nextAnswer = cleanAnswer(String(payload.answer || ''))
      if (!response.ok || payload.ok !== true || !nextAnswer) {
        throw new Error(String(payload.message || copy.retry))
      }

      setAnswer(nextAnswer)
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message
        ? requestError.message
        : copy.retry)
    } finally {
      setBusy(false)
    }
  }, [busy, copy.retry, locale, question])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ask()
  }

  if (!host || !ready || !enabled) return null

  const budget = formatCurrency(20)
  const promptOptions = copy.prompts.map((prompt) => prompt.replace('{budget}', budget))

  return createPortal(
    <div
      className={styles.root}
      data-pmd-guest-ai="v1"
      data-theme={themeId}
      dir={direction}
    >
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={styles.launcherIcon}><Sparkles aria-hidden="true" /></span>
        <span>{copy.button}</span>
      </button>

      {open && (
        <div className={styles.layer} role="presentation">
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-label={copy.close}
          />

          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pmd-guest-ai-title"
          >
            <header className={styles.header}>
              <div className={styles.headerIcon}><Sparkles aria-hidden="true" /></div>
              <div className={styles.headerCopy}>
                <h2 id="pmd-guest-ai-title">{copy.title}</h2>
                <p>{copy.subtitle}</p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label={copy.close}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.body} aria-live="polite">
              {!answer && !error && (
                <div className={styles.intro}>
                  <span className={styles.avatar}><Sparkles aria-hidden="true" /></span>
                  <p>{copy.intro}</p>
                </div>
              )}

              <div className={styles.prompts}>
                {promptOptions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void ask(prompt)}
                    disabled={busy}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {(answer || busy || error) && (
                <div className={styles.conversation}>
                  {question && <div className={styles.userBubble}>{question}</div>}
                  <div className={`${styles.aiBubble} ${error ? styles.errorBubble : ''}`}>
                    {busy ? copy.thinking : (error || answer)}
                  </div>
                </div>
              )}
            </div>

            <form className={styles.composer} onSubmit={submit}>
              <label className={styles.inputWrap}>
                <span className={styles.srOnly}>{copy.placeholder}</span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 800))}
                  placeholder={copy.placeholder}
                  rows={2}
                  disabled={busy}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void ask()
                    }
                  }}
                />
              </label>
              <button
                type="submit"
                className={styles.send}
                disabled={busy || !question.trim()}
                aria-label={copy.send}
              >
                <ArrowUp aria-hidden="true" />
              </button>
            </form>

            <p className={styles.safety}>{copy.safety}</p>
          </section>
        </div>
      )}
    </div>,
    host,
  )
}
