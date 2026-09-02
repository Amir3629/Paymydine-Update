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
  safety: 'For severe allergies, always confirm ingredients and cross-contact with restaurant staff before ordering.',
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
  safety: 'Bei schweren Allergien Zutaten und mögliche Kreuzkontakte immer zusätzlich beim Restaurant-Team bestätigen.',
  prompts: ['Was soll ich probieren? ✨', 'Etwas Vegetarisches 🌱', 'Was ist beliebt?', 'Hilf mir unter {budget} zu wählen'],
}

const FA: GuestAiCopy = {
  button: 'از PMD بپرس',
  title: 'از PMD بپرس ✨',
  subtitle: 'راهنمای منوی شما',
  intro: 'نمی‌دانی چه انتخاب کنی؟ بگو چه غذایی دوست داری تا در همین منو کمکت کنم.',
  placeholder: 'درباره غذا، مواد اولیه، قیمت یا انتخاب‌های غذایی بپرس…',
  send: 'ارسال',
  close: 'بستن دستیار منو',
  thinking: 'دارم منو را بررسی می‌کنم…',
  retry: 'این یکی کامل نشد. یک لحظه دیگر دوباره امتحان کن.',
  safety: 'برای آلرژی شدید، قبل از سفارش مواد اولیه و احتمال تماس متقاطع را با کارکنان رستوران تأیید کنید.',
  prompts: ['چی پیشنهاد می‌کنی؟ ✨', 'یک گزینه گیاهی 🌱', 'چی محبوبه؟', 'زیر {budget} کمکم کن انتخاب کنم'],
}

const TR: GuestAiCopy = {
  button: 'PMD’ye sor',
  title: 'PMD’ye sor ✨',
  subtitle: 'Menü yardımcın',
  intro: 'Ne seçeceğinden emin değil misin? Ne yemek istediğini söyle, bu menüde birlikte bulalım.',
  placeholder: 'Yemekler, içerikler, fiyat veya beslenme seçenekleri hakkında sor…',
  send: 'Gönder',
  close: 'Menü asistanını kapat',
  thinking: 'Menüye bakıyorum…',
  retry: 'Bunu tamamlayamadım. Birazdan tekrar dene.',
  safety: 'Şiddetli alerjilerde sipariş vermeden önce içerikleri ve çapraz temas riskini restoran ekibiyle doğrulayın.',
  prompts: ['Ne denemeliyim? ✨', 'Vejetaryen bir şey 🌱', 'Ne popüler?', '{budget} altında seçim yapmama yardım et'],
}

const JA: GuestAiCopy = {
  button: 'PMDに聞く',
  title: 'PMDに聞く ✨',
  subtitle: 'メニュー案内',
  intro: '何を選ぶか迷っていますか？食べたい気分を教えてください。このメニューから一緒に探します。',
  placeholder: '料理、材料、価格、食事の希望について質問…',
  send: '送信',
  close: 'メニューアシスタントを閉じる',
  thinking: 'メニューを確認中…',
  retry: 'うまく完了できませんでした。少し待ってもう一度お試しください。',
  safety: '重度のアレルギーがある場合は、注文前に原材料と交差接触の可能性を店舗スタッフに確認してください。',
  prompts: ['おすすめは？ ✨', 'ベジタリアン料理 🌱', '人気なのは？', '{budget}以内で選びたい'],
}

function copyFor(locale: string): GuestAiCopy {
  const code = String(locale || '').toLowerCase()
  if (code.startsWith('de')) return DE
  if (code.startsWith('fa')) return FA
  if (code.startsWith('tr')) return TR
  if (code.startsWith('ja')) return JA
  return EN
}

function cleanAnswer(value: string): string {
  return String(value || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim()
}

function textDirection(value: string, fallback: string): 'ltr' | 'rtl' {
  const text = String(value || '')
  if (/[\u0590-\u08FF]/u.test(text)) return 'rtl'
  return fallback === 'rtl' ? 'rtl' : 'ltr'
}

function responseDirection(responseLocale: string, value: string, fallback: string): 'ltr' | 'rtl' {
  const code = String(responseLocale || '').toLowerCase()
  if (code.startsWith('fa')) return 'rtl'
  return textDirection(value, fallback)
}

type StatusPayload = { ok?: boolean; enabled?: boolean; surface?: string }
type AskPayload = { ok?: boolean; answer?: string; message?: string; response_locale?: string }

export function GuestAiConcierge({ themeId }: { themeId: ThemeId }) {
  const { bootstrap, locale, direction, formatCurrency } = useMenuRuntime()
  const locationId = bootstrap.table.locationId
  const copy = useMemo(() => copyFor(locale), [locale])
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerLocale, setAnswerLocale] = useState(locale)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const nextHost = document.querySelector<HTMLElement>('main[data-theme-id]')
    setHost(nextHost)
  }, [themeId])

  useEffect(() => {
    if (!locationId || locationId < 1) {
      setEnabled(false)
      setReady(true)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({ location_id: String(locationId) })

    void fetch(`/api/v1/guest-ai/status?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as StatusPayload
        return response.ok
          && payload.ok === true
          && payload.enabled === true
          && payload.surface === 'frontend_v2'
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
  }, [locationId])

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
    if (!value || busy || !locationId || locationId < 1) return

    setQuestion(value)
    setAnswerLocale(locale)
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
        body: JSON.stringify({ question: value, locale, location_id: locationId }),
      })

      const payload = await response.json().catch(() => ({})) as AskPayload
      const nextAnswer = cleanAnswer(String(payload.answer || ''))
      if (!response.ok || payload.ok !== true || !nextAnswer) {
        throw new Error(String(payload.message || copy.retry))
      }

      setAnswerLocale(String(payload.response_locale || locale).slice(0, 20))
      setAnswer(nextAnswer)
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : copy.retry)
    } finally {
      setBusy(false)
    }
  }, [busy, copy.retry, locale, locationId, question])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ask()
  }

  if (!host || !ready || !enabled || !locationId) return null

  const budget = formatCurrency(20)
  const promptOptions = copy.prompts.map((prompt) => prompt.replace('{budget}', budget))

  return createPortal(
    <div className={styles.root} data-pmd-guest-ai="v2" data-theme={themeId} dir={direction}>
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
          <button type="button" className={styles.backdrop} onClick={() => setOpen(false)} aria-label={copy.close} />
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="pmd-guest-ai-title">
            <header className={styles.header}>
              <div className={styles.headerIcon}><Sparkles aria-hidden="true" /></div>
              <div className={styles.headerCopy}>
                <h2 id="pmd-guest-ai-title">{copy.title}</h2>
                <p>{copy.subtitle}</p>
              </div>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label={copy.close}>
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
                  <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={busy}>
                    {prompt}
                  </button>
                ))}
              </div>

              {(answer || busy || error) && (
                <div className={styles.conversation}>
                  {question && (
                    <div className={styles.userBubble} dir={textDirection(question, direction)}>
                      {question}
                    </div>
                  )}
                  <div
                    className={`${styles.aiBubble} ${error ? styles.errorBubble : ''}`}
                    dir={responseDirection(answerLocale, error || answer, direction)}
                    lang={answerLocale || locale}
                  >
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
                  dir={textDirection(question, direction)}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 600))}
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
              <button type="submit" className={styles.send} disabled={busy || !question.trim()} aria-label={copy.send}>
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
