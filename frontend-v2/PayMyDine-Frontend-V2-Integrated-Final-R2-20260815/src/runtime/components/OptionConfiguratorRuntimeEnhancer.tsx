'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, X } from 'lucide-react'
import type { CartOptionSelection, MenuItem } from '@/src/domain/model'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

type ConfigOrigin = 'card' | 'detail'

type PendingConfiguration = {
  item: MenuItem
  quantity: number
  origin: ConfigOrigin
}

type ConfigCopy = {
  title: string
  subtitle: string
  required: string
  optional: string
  chooseOne: string
  chooseMultiple: string
  choosePlaceholder: string
  cancel: string
  addToOrder: string
  each: string
}

function copyFor(locale: string): ConfigCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    title: 'Optionen auswählen', subtitle: 'Passe dein Gericht an', required: 'Erforderlich', optional: 'Optional',
    chooseOne: 'Wähle eine Option', chooseMultiple: 'Wähle eine oder mehrere Optionen', choosePlaceholder: 'Bitte auswählen',
    cancel: 'Zurück', addToOrder: 'Zur Bestellung hinzufügen', each: 'pro Stück',
  }
  if (lang === 'fa') return {
    title: 'انتخاب گزینه‌ها', subtitle: 'غذای خود را شخصی‌سازی کنید', required: 'الزامی', optional: 'اختیاری',
    chooseOne: 'یک گزینه انتخاب کنید', chooseMultiple: 'یک یا چند گزینه انتخاب کنید', choosePlaceholder: 'انتخاب کنید',
    cancel: 'بازگشت', addToOrder: 'افزودن به سفارش', each: 'برای هر عدد',
  }
  if (lang === 'tr') return {
    title: 'Seçeneklerini seç', subtitle: 'Ürününü özelleştir', required: 'Zorunlu', optional: 'İsteğe bağlı',
    chooseOne: 'Bir seçenek seç', chooseMultiple: 'Bir veya daha fazla seçenek seç', choosePlaceholder: 'Seçiniz',
    cancel: 'Geri', addToOrder: 'Siparişe ekle', each: 'adet başına',
  }
  if (lang === 'ja') return {
    title: 'オプションを選択', subtitle: '商品をカスタマイズ', required: '必須', optional: '任意',
    chooseOne: '1つ選択してください', chooseMultiple: '1つ以上選択できます', choosePlaceholder: '選択してください',
    cancel: '戻る', addToOrder: '注文に追加', each: '1点あたり',
  }
  return {
    title: 'Choose your options', subtitle: 'Customize your item', required: 'Required', optional: 'Optional',
    chooseOne: 'Choose one', chooseMultiple: 'Choose one or more', choosePlaceholder: 'Select an option',
    cancel: 'Back', addToOrder: 'Add to order', each: 'each',
  }
}

function initialSelections(item: MenuItem): Record<string, string[]> {
  return Object.fromEntries(item.options.map((group) => {
    const defaults = group.values.filter((value) => value.isDefault).map((value) => value.id)
    return [group.id, group.displayType === 'checkbox' ? defaults : defaults.slice(0, 1)]
  }))
}

function uniqueCandidateItems(runtime: ReturnType<typeof useMenuRuntime>): MenuItem[] {
  const map = new Map<string, MenuItem>()
  ;[
    ...runtime.visibleItems,
    ...runtime.featuredItems,
    ...runtime.bestsellerItems,
    ...(runtime.selectedItem ? [runtime.selectedItem] : []),
  ].forEach((item) => map.set(item.id, item))
  return [...map.values()]
}

function quickAddItemFromButton(runtime: ReturnType<typeof useMenuRuntime>, button: HTMLButtonElement): MenuItem | null {
  const label = String(button.getAttribute('aria-label') || '').trim()
  if (!label) return null
  const candidates = uniqueCandidateItems(runtime)
    .filter((item) => label.endsWith(item.name))
    .sort((a, b) => b.name.length - a.name.length)
  return candidates[0] || null
}

function detailQuantityFromButton(button: HTMLButtonElement): number {
  const footer = button.closest('footer')
  if (!footer) return 1
  const candidates = Array.from(footer.querySelectorAll('span'))
    .map((node) => Number(String(node.textContent || '').trim()))
    .filter((value) => Number.isFinite(value) && value >= 1)
  return Math.max(1, Math.round(candidates[0] || 1))
}

function stopAddEvent(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

// PMD_OPTION_CONFIGURATOR_V2
// Guest UX authority for menu items with options:
//   menu + button -> configure card -> final add
//   food detail Add -> configure card -> final add
// The cart is never mutated until the guest confirms this card.
export function OptionConfiguratorRuntimeEnhancer() {
  const runtime = useMenuRuntime()
  const copy = copyFor(runtime.locale)
  const [mounted, setMounted] = useState(false)
  const [pending, setPending] = useState<PendingConfiguration | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')

  useEffect(() => setMounted(true), [])

  const begin = (item: MenuItem, quantity: number, origin: ConfigOrigin) => {
    if (!item.options.length) return
    setPending({ item, quantity: Math.max(1, Math.round(quantity || 1)), origin })
    setSelected(initialSelections(item))
    setError('')
  }

  // Keep the normal food-details card clean. The existing option fieldsets stay in
  // the DOM as a safe fallback, but are hidden while V2 is active. The dedicated
  // configurator below becomes the visible option-selection authority.
  useEffect(() => {
    if (runtime.overlay !== 'item' || !runtime.selectedItem?.options.length) return
    const item = runtime.selectedItem
    let frame = 0
    let attempts = 0

    const apply = () => {
      attempts += 1
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('section[role="dialog"]'))
      const dialog = dialogs.find((candidate) => candidate.getAttribute('aria-label') === item.name)
      if (!dialog) {
        if (attempts < 30) frame = window.requestAnimationFrame(apply)
        return
      }

      dialog.setAttribute('data-pmd-options-deferred', 'v2')
      Array.from(dialog.querySelectorAll<HTMLFieldSetElement>('fieldset')).forEach((fieldset) => {
        const legend = String(fieldset.querySelector('legend')?.textContent || '').trim()
        const matchesOption = item.options.some((group) => legend.startsWith(group.name))
        if (!matchesOption) return
        fieldset.setAttribute('data-pmd-option-deferred', 'v2')
        fieldset.hidden = true
      })
    }

    apply()
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.querySelectorAll<HTMLFieldSetElement>('fieldset[data-pmd-option-deferred="v2"]').forEach((fieldset) => {
        fieldset.hidden = false
        fieldset.removeAttribute('data-pmd-option-deferred')
      })
      document.querySelectorAll<HTMLElement>('[data-pmd-options-deferred="v2"]').forEach((dialog) => {
        dialog.removeAttribute('data-pmd-options-deferred')
      })
    }
  }, [runtime.overlay, runtime.selectedItem])

  // Capture before React's existing click handler. Items without options continue
  // through the proven quick-add path untouched.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-pmd-option-configurator-v2="true"]')) return

      const button = target.closest('button')
      if (!(button instanceof HTMLButtonElement)) return

      const detailItem = runtime.selectedItem
      if (runtime.overlay === 'item' && detailItem?.options.length) {
        const dialog = button.closest('section[role="dialog"]')
        const footer = button.closest('footer')
        const buttonText = String(button.textContent || '').trim()
        const isDetailAdd = Boolean(
          dialog
          && footer
          && dialog.getAttribute('aria-label') === detailItem.name
          && buttonText.includes(runtime.labels.add),
        )
        if (isDetailAdd) {
          stopAddEvent(event)
          begin(detailItem, detailQuantityFromButton(button), 'detail')
          return
        }
      }

      const zeroAdd = button.matches('[data-pmd-item-quantity="0"]')
      const counter = button.closest('[data-pmd-quick-add-counter="r26b"]')
      const label = String(button.getAttribute('aria-label') || '').trim()
      const counterPlus = Boolean(counter && /^\+/.test(label))
      if (!zeroAdd && !counterPlus) return

      const item = quickAddItemFromButton(runtime, button)
      if (!item?.options.length) return

      stopAddEvent(event)
      begin(item, 1, 'card')
    }

    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [runtime])

  useEffect(() => {
    if (!pending) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [pending])

  const selections = useMemo<CartOptionSelection[]>(() => {
    if (!pending) return []
    return pending.item.options.flatMap((group) => {
      const ids = selected[group.id] || []
      return ids.flatMap((id) => {
        const value = group.values.find((candidate) => candidate.id === id)
        return value
          ? [{
              groupId: group.id,
              groupName: group.name,
              valueId: value.id,
              valueName: value.name,
              price: value.price,
            }]
          : []
      })
    })
  }, [pending, selected])

  if (!mounted || !pending) return null

  const item = pending.item
  const optionsTotal = selections.reduce((sum, option) => sum + option.price, 0)
  const unitTotal = item.price + optionsTotal
  const total = unitTotal * pending.quantity

  const toggle = (groupId: string, valueId: string, multi: boolean) => {
    setError('')
    setSelected((current) => {
      const existing = current[groupId] || []
      if (!multi) return { ...current, [groupId]: [valueId] }
      return {
        ...current,
        [groupId]: existing.includes(valueId)
          ? existing.filter((id) => id !== valueId)
          : [...existing, valueId],
      }
    })
  }

  const confirm = () => {
    const missing = item.options.find((group) => group.required && !(selected[group.id] || []).length)
    if (missing) {
      setError(`${missing.name} — ${copy.required}`)
      return
    }
    runtime.addConfiguredItem(item, pending.quantity, selections)
    setPending(null)
    setError('')
  }

  const close = () => {
    setPending(null)
    setError('')
  }

  return createPortal(
    <div className="pmd-option-configurator-v2" data-pmd-option-configurator-v2="true" dir={runtime.direction}>
      <style>{`
        .pmd-option-configurator-v2 {
          position: fixed;
          inset: 0;
          z-index: 1400;
          display: grid;
          align-items: end;
          color: var(--pmd-text, #171717);
          font-family: inherit;
        }
        .pmd-option-configurator-v2 * { box-sizing: border-box; }
        .pmd-option-configurator-v2__backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(3, 8, 7, .62);
          backdrop-filter: blur(10px);
        }
        .pmd-option-configurator-v2__card {
          position: relative;
          z-index: 1;
          width: min(100%, 42rem);
          max-height: min(90dvh, 52rem);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.12));
          border-radius: 1.5rem 1.5rem 0 0;
          background: var(--pmd-surface, #fff);
          box-shadow: 0 -1.4rem 4rem rgba(0,0,0,.28);
        }
        .pmd-option-configurator-v2__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .9rem;
          padding: 1rem 1.1rem;
          border-bottom: 1px solid var(--pmd-line, rgba(0,0,0,.1));
        }
        .pmd-option-configurator-v2__header h2 {
          margin: 0;
          font-size: 1.15rem;
          line-height: 1.15;
        }
        .pmd-option-configurator-v2__header p {
          margin: .24rem 0 0;
          color: var(--pmd-muted, #6b6b6b);
          font-size: .8rem;
          font-weight: 650;
        }
        .pmd-option-configurator-v2__close {
          display: grid;
          width: 2.6rem;
          height: 2.6rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: 999px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .pmd-option-configurator-v2__close svg { width: 1.05rem; height: 1.05rem; }
        .pmd-option-configurator-v2__body {
          display: grid;
          gap: .85rem;
          overflow: auto;
          overscroll-behavior: contain;
          padding: 1rem;
        }
        .pmd-option-configurator-v2__intro {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          padding: .15rem .1rem .25rem;
        }
        .pmd-option-configurator-v2__intro strong { font-size: 1.06rem; }
        .pmd-option-configurator-v2__intro span {
          color: var(--pmd-accent, currentColor);
          font-weight: 850;
          white-space: nowrap;
        }
        .pmd-option-configurator-v2__group {
          display: grid;
          gap: .7rem;
          padding: .9rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.12));
          border-radius: 1rem;
          background: color-mix(in srgb, var(--pmd-soft, #f4f4f4) 72%, transparent);
        }
        .pmd-option-configurator-v2__groupHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: .75rem;
        }
        .pmd-option-configurator-v2__groupHead strong {
          display: block;
          font-size: .95rem;
        }
        .pmd-option-configurator-v2__groupHead small {
          display: block;
          margin-top: .15rem;
          color: var(--pmd-muted, #6b6b6b);
          font-size: .72rem;
        }
        .pmd-option-configurator-v2__badge {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: .3rem .55rem;
          background: color-mix(in srgb, var(--pmd-accent, #111) 10%, transparent);
          color: var(--pmd-accent, #111);
          font-size: .68rem;
          font-weight: 850;
        }
        .pmd-option-configurator-v2__badge[data-required="true"] {
          background: color-mix(in srgb, var(--pmd-accent, #111) 16%, transparent);
        }
        .pmd-option-configurator-v2__choices { display: grid; gap: .55rem; }
        .pmd-option-configurator-v2__choice {
          display: flex;
          min-height: 3.35rem;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.13));
          border-radius: .9rem;
          padding: .7rem .8rem;
          background: var(--pmd-surface, #fff);
          cursor: pointer;
        }
        .pmd-option-configurator-v2__choice:has(input:checked) {
          border-color: color-mix(in srgb, var(--pmd-accent, #111) 72%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pmd-accent, #111) 22%, transparent);
        }
        .pmd-option-configurator-v2__choiceMain {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: .65rem;
          font-weight: 720;
        }
        .pmd-option-configurator-v2__choice input {
          width: 1.08rem;
          height: 1.08rem;
          flex: 0 0 auto;
          accent-color: var(--pmd-accent, #111);
        }
        .pmd-option-configurator-v2__choicePrice {
          flex: 0 0 auto;
          font-weight: 850;
          white-space: nowrap;
        }
        .pmd-option-configurator-v2__select {
          width: 100%;
          min-height: 3.35rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: .9rem;
          padding: .7rem .8rem;
          background: var(--pmd-surface, #fff);
          color: inherit;
          font: inherit;
          font-weight: 720;
        }
        .pmd-option-configurator-v2__error {
          border-radius: .85rem;
          padding: .72rem .8rem;
          background: rgba(181, 65, 65, .12);
          color: #b54141;
          font-size: .78rem;
          font-weight: 800;
        }
        .pmd-option-configurator-v2__footer {
          display: grid;
          gap: .7rem;
          border-top: 1px solid var(--pmd-line, rgba(0,0,0,.1));
          padding: .85rem 1rem calc(.9rem + env(safe-area-inset-bottom, 0px));
          background: var(--pmd-surface, #fff);
        }
        .pmd-option-configurator-v2__summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .pmd-option-configurator-v2__qty {
          display: grid;
          grid-template-columns: 2.55rem 2.25rem 2.55rem;
          align-items: center;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: 999px;
          overflow: hidden;
        }
        .pmd-option-configurator-v2__qty button {
          display: grid;
          height: 2.7rem;
          place-items: center;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .pmd-option-configurator-v2__qty svg { width: 1rem; height: 1rem; }
        .pmd-option-configurator-v2__qty strong { text-align: center; }
        .pmd-option-configurator-v2__total { text-align: end; }
        .pmd-option-configurator-v2__total strong { display: block; font-size: 1.05rem; }
        .pmd-option-configurator-v2__total small { color: var(--pmd-muted, #6b6b6b); }
        .pmd-option-configurator-v2__actions {
          display: grid;
          grid-template-columns: minmax(5.5rem, .34fr) minmax(0, 1fr);
          gap: .6rem;
        }
        .pmd-option-configurator-v2__back,
        .pmd-option-configurator-v2__add {
          min-height: 3rem;
          border-radius: 999px;
          padding: .7rem .9rem;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
        }
        .pmd-option-configurator-v2__back {
          border: 1px solid var(--pmd-line, rgba(0,0,0,.16));
          background: transparent;
          color: inherit;
        }
        .pmd-option-configurator-v2__add {
          border: 1px solid var(--pmd-accent, #111);
          background: var(--pmd-accent, #111);
          color: var(--pmd-accentText, #fff);
        }
        @media (min-width: 640px) {
          .pmd-option-configurator-v2 { align-items: center; padding: 1rem; }
          .pmd-option-configurator-v2__card { border-radius: 1.5rem; }
        }
      `}</style>

      <button type="button" className="pmd-option-configurator-v2__backdrop" onClick={close} aria-label={copy.cancel} />

      <section className="pmd-option-configurator-v2__card" role="dialog" aria-modal="true" aria-label={`${copy.title}: ${item.name}`}>
        <header className="pmd-option-configurator-v2__header">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle} · {item.name}</p>
          </div>
          <button type="button" className="pmd-option-configurator-v2__close" onClick={close} aria-label={copy.cancel}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="pmd-option-configurator-v2__body">
          <div className="pmd-option-configurator-v2__intro">
            <strong>{item.name}</strong>
            <span>{runtime.formatCurrency(item.price)}</span>
          </div>

          {item.options.map((group) => {
            const multi = group.displayType === 'checkbox'
            const ids = selected[group.id] || []
            return (
              <section className="pmd-option-configurator-v2__group" key={group.id} data-option-group={group.id}>
                <div className="pmd-option-configurator-v2__groupHead">
                  <div>
                    <strong>{group.name}</strong>
                    <small>{multi ? copy.chooseMultiple : copy.chooseOne}</small>
                  </div>
                  <span className="pmd-option-configurator-v2__badge" data-required={group.required ? 'true' : 'false'}>
                    {group.required ? copy.required : copy.optional}
                  </span>
                </div>

                {group.displayType === 'select' ? (
                  <select
                    className="pmd-option-configurator-v2__select"
                    value={ids[0] || ''}
                    onChange={(event) => {
                      setError('')
                      setSelected((current) => ({ ...current, [group.id]: event.target.value ? [event.target.value] : [] }))
                    }}
                    aria-label={group.name}
                  >
                    <option value="">{copy.choosePlaceholder}</option>
                    {group.values.map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name}{value.price > 0 ? ` (+${runtime.formatCurrency(value.price)})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="pmd-option-configurator-v2__choices">
                    {group.values.map((value) => {
                      const checked = ids.includes(value.id)
                      return (
                        <label className="pmd-option-configurator-v2__choice" key={value.id}>
                          <span className="pmd-option-configurator-v2__choiceMain">
                            <input
                              type={multi ? 'checkbox' : 'radio'}
                              name={`pmd-option-${group.id}`}
                              checked={checked}
                              onChange={() => toggle(group.id, value.id, multi)}
                            />
                            <span>{value.name}</span>
                          </span>
                          {value.price > 0 && (
                            <strong className="pmd-option-configurator-v2__choicePrice">+{runtime.formatCurrency(value.price)}</strong>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {error && <div className="pmd-option-configurator-v2__error" role="alert">{error}</div>}
        </div>

        <footer className="pmd-option-configurator-v2__footer">
          <div className="pmd-option-configurator-v2__summary">
            <div className="pmd-option-configurator-v2__qty" aria-label={runtime.labels.quantity}>
              <button type="button" onClick={() => setPending((current) => current ? { ...current, quantity: Math.max(1, current.quantity - 1) } : current)} aria-label="−">
                <Minus aria-hidden="true" />
              </button>
              <strong>{pending.quantity}</strong>
              <button type="button" onClick={() => setPending((current) => current ? { ...current, quantity: current.quantity + 1 } : current)} aria-label="+">
                <Plus aria-hidden="true" />
              </button>
            </div>
            <div className="pmd-option-configurator-v2__total">
              <strong>{runtime.formatCurrency(total)}</strong>
              <small>{runtime.formatCurrency(unitTotal)} {copy.each}</small>
            </div>
          </div>

          <div className="pmd-option-configurator-v2__actions">
            <button type="button" className="pmd-option-configurator-v2__back" onClick={close}>{copy.cancel}</button>
            <button type="button" className="pmd-option-configurator-v2__add" onClick={confirm}>
              {copy.addToOrder} · {runtime.formatCurrency(total)}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
