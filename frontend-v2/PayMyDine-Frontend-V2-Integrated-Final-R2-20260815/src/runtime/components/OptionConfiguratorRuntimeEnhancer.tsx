'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { CartOptionSelection, MenuItem } from '@/src/domain/model'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

type PendingConfiguration = {
  item: MenuItem
  quantity: number
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
  appliesAll: string
  separate: string
}

function copyFor(locale: string): ConfigCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    title: 'Optionen auswählen', subtitle: 'Passe dein Gericht an', required: 'Erforderlich', optional: 'Optional',
    chooseOne: 'Wähle eine Option', chooseMultiple: 'Wähle eine oder mehrere Optionen', choosePlaceholder: 'Bitte auswählen',
    cancel: 'Zurück', addToOrder: 'Zur Bestellung hinzufügen', each: 'pro Stück',
    appliesAll: 'Alle ausgewählten Optionen gelten für alle {count} Artikel.',
    separate: 'Für einen Artikel mit anderen Optionen bitte separat hinzufügen.',
  }
  if (lang === 'fa') return {
    title: 'انتخاب گزینه‌ها', subtitle: 'غذای خود را شخصی‌سازی کنید', required: 'الزامی', optional: 'اختیاری',
    chooseOne: 'یک گزینه انتخاب کنید', chooseMultiple: 'یک یا چند گزینه انتخاب کنید', choosePlaceholder: 'انتخاب کنید',
    cancel: 'بازگشت', addToOrder: 'افزودن به سفارش', each: 'برای هر عدد',
    appliesAll: 'همهٔ آپشن‌های انتخاب‌شده برای هر {count} عدد اعمال می‌شوند.',
    separate: 'اگر یکی از آن‌ها آپشن متفاوتی می‌خواهد، آن را جداگانه به سفارش اضافه کنید.',
  }
  if (lang === 'tr') return {
    title: 'Seçeneklerini seç', subtitle: 'Ürününü özelleştir', required: 'Zorunlu', optional: 'İsteğe bağlı',
    chooseOne: 'Bir seçenek seç', chooseMultiple: 'Bir veya daha fazla seçenek seç', choosePlaceholder: 'Seçiniz',
    cancel: 'Geri', addToOrder: 'Siparişe ekle', each: 'adet başına',
    appliesAll: 'Seçilen tüm seçenekler {count} ürünün tamamına uygulanır.',
    separate: 'Bir ürün farklı olacaksa onu ayrı olarak siparişe ekleyin.',
  }
  if (lang === 'ja') return {
    title: 'オプションを選択', subtitle: '商品をカスタマイズ', required: '必須', optional: '任意',
    chooseOne: '1つ選択してください', chooseMultiple: '1つ以上選択できます', choosePlaceholder: '選択してください',
    cancel: '戻る', addToOrder: '注文に追加', each: '1点あたり',
    appliesAll: '選択したオプションは{count}点すべてに適用されます。',
    separate: '1点だけ別の内容にする場合は、別々に追加してください。',
  }
  return {
    title: 'Choose your options', subtitle: 'Customize your item', required: 'Required', optional: 'Optional',
    chooseOne: 'Choose one', chooseMultiple: 'Choose one or more', choosePlaceholder: 'Select an option',
    cancel: 'Back', addToOrder: 'Add to order', each: 'each',
    appliesAll: 'All selected options apply to all {count} items.',
    separate: 'For one item with different options, add it separately.',
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

// PMD_OPTION_CONFIGURATOR_V3_THEME_NATIVE_QUANTITY_SCOPE
// Guest UX authority for menu items with options:
//   menu + button -> configure card -> final add
//   food detail Add -> configure card -> final add
//
// V3 deliberately renders INSIDE the active theme root instead of portaling to
// document.body. This preserves the exact font, surface, accent, line and colour
// inheritance of all ten Frontend V2 designs. Theme-specific geometry below then
// follows each design language without creating ten separate ordering components.
//
// Quantity contract: one configuration represents one cart line. Every selected
// option applies to every unit on that line. A different configuration is added as
// a separate line, which matches MenuRuntimeContext's option-key cart authority.
export function OptionConfiguratorRuntimeEnhancer() {
  const runtime = useMenuRuntime()
  const copy = copyFor(runtime.locale)
  const [pending, setPending] = useState<PendingConfiguration | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')

  const begin = (item: MenuItem, quantity: number) => {
    if (!item.options.length) return
    setPending({ item, quantity: Math.max(1, Math.round(quantity || 1)) })
    setSelected(initialSelections(item))
    setError('')
  }

  // Keep the normal food-details card clean. Existing option fieldsets remain as
  // a fallback in the DOM but are hidden while the dedicated configurator is active.
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

      dialog.setAttribute('data-pmd-options-deferred', 'v3')
      Array.from(dialog.querySelectorAll<HTMLFieldSetElement>('fieldset')).forEach((fieldset) => {
        const legend = String(fieldset.querySelector('legend')?.textContent || '').trim()
        const matchesOption = item.options.some((group) => legend.startsWith(group.name))
        if (!matchesOption) return
        fieldset.setAttribute('data-pmd-option-deferred', 'v3')
        fieldset.hidden = true
      })
    }

    apply()
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.querySelectorAll<HTMLFieldSetElement>('fieldset[data-pmd-option-deferred="v3"]').forEach((fieldset) => {
        fieldset.hidden = false
        fieldset.removeAttribute('data-pmd-option-deferred')
      })
      document.querySelectorAll<HTMLElement>('[data-pmd-options-deferred="v3"]').forEach((dialog) => {
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
      if (target.closest('[data-pmd-option-configurator-v3="true"]')) return

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
          begin(detailItem, detailQuantityFromButton(button))
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
      begin(item, 1)
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

  if (!pending) return null

  const item = pending.item
  const optionsTotal = selections.reduce((sum, option) => sum + option.price, 0)
  const unitTotal = item.price + optionsTotal
  const total = unitTotal * pending.quantity
  const totalOptionsImpact = optionsTotal * pending.quantity
  const scopeText = copy.appliesAll.replace('{count}', String(pending.quantity))

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

  return (
    <div
      className="pmd-option-configurator-v3"
      data-pmd-option-configurator-v3="true"
      data-theme-id={runtime.bootstrap.theme.id}
      dir={runtime.direction}
    >
      <style>{`
        .pmd-option-configurator-v3 {
          --pmd-oc-card-radius: 1.5rem;
          --pmd-oc-control-radius: .9rem;
          --pmd-oc-group-radius: 1rem;
          --pmd-oc-action-radius: 999px;
          --pmd-oc-card-width: 38rem;
          --pmd-oc-card-shadow: 0 -1.4rem 4rem rgba(0,0,0,.28);
          --pmd-oc-backdrop: rgba(3,8,7,.62);
          --pmd-oc-group-bg: color-mix(in srgb, var(--pmd-soft, #f4f4f4) 72%, transparent);
          --pmd-oc-choice-bg: var(--pmd-surface, #fff);
          position: fixed;
          inset: 0;
          z-index: 1400;
          display: grid;
          align-items: end;
          color: var(--pmd-text, #171717);
          font-family: inherit;
        }
        .pmd-option-configurator-v3 * { box-sizing: border-box; }
        .pmd-option-configurator-v3__backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: var(--pmd-oc-backdrop);
          backdrop-filter: blur(10px);
          cursor: pointer;
        }
        .pmd-option-configurator-v3__card {
          position: relative;
          z-index: 1;
          width: min(100%, var(--pmd-oc-card-width));
          max-height: min(90dvh, 52rem);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.12));
          border-radius: var(--pmd-oc-card-radius) var(--pmd-oc-card-radius) 0 0;
          background: var(--pmd-surface, #fff);
          color: var(--pmd-text, inherit);
          box-shadow: var(--pmd-oc-card-shadow);
        }
        .pmd-option-configurator-v3__header {
          position: relative;
          display: flex;
          min-height: 4.5rem;
          align-items: center;
          justify-content: space-between;
          gap: .9rem;
          padding: 1rem 1.1rem;
          border-bottom: 1px solid var(--pmd-line, rgba(0,0,0,.1));
        }
        .pmd-option-configurator-v3__header h2 {
          margin: 0;
          color: var(--pmd-text, inherit);
          font: inherit;
          font-size: 1.12rem;
          font-weight: 850;
          line-height: 1.15;
        }
        .pmd-option-configurator-v3__header p {
          margin: .24rem 0 0;
          color: var(--pmd-muted, #6b6b6b);
          font-size: .76rem;
          font-weight: 650;
        }
        .pmd-option-configurator-v3__close {
          display: grid;
          width: 2.6rem;
          height: 2.6rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: var(--pmd-oc-action-radius);
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .pmd-option-configurator-v3__close svg { width: 1.05rem; height: 1.05rem; }
        .pmd-option-configurator-v3__body {
          display: grid;
          gap: .85rem;
          overflow: auto;
          overscroll-behavior: contain;
          padding: 1rem;
        }
        .pmd-option-configurator-v3__intro {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          padding: .15rem .1rem .25rem;
        }
        .pmd-option-configurator-v3__intro strong { font-size: 1.02rem; }
        .pmd-option-configurator-v3__intro span {
          color: var(--pmd-accent, currentColor);
          font-weight: 850;
          white-space: nowrap;
        }
        .pmd-option-configurator-v3__group {
          display: grid;
          gap: .7rem;
          padding: .9rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.12));
          border-radius: var(--pmd-oc-group-radius);
          background: var(--pmd-oc-group-bg);
        }
        .pmd-option-configurator-v3__groupHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: .75rem;
        }
        .pmd-option-configurator-v3__groupHead strong {
          display: block;
          color: var(--pmd-text, inherit);
          font-size: .94rem;
        }
        .pmd-option-configurator-v3__groupHead small {
          display: block;
          margin-top: .15rem;
          color: var(--pmd-muted, #6b6b6b);
          font-size: .7rem;
        }
        .pmd-option-configurator-v3__badge {
          flex: 0 0 auto;
          border: 1px solid color-mix(in srgb, var(--pmd-accent, #111) 22%, transparent);
          border-radius: var(--pmd-oc-action-radius);
          padding: .28rem .52rem;
          background: color-mix(in srgb, var(--pmd-accent, #111) 10%, transparent);
          color: var(--pmd-accent, #111);
          font-size: .66rem;
          font-weight: 850;
        }
        .pmd-option-configurator-v3__badge[data-required="true"] {
          background: color-mix(in srgb, var(--pmd-accent, #111) 16%, transparent);
        }
        .pmd-option-configurator-v3__choices { display: grid; gap: .55rem; }
        .pmd-option-configurator-v3__choice {
          display: flex;
          min-height: 3.35rem;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.13));
          border-radius: var(--pmd-oc-control-radius);
          padding: .7rem .8rem;
          background: var(--pmd-oc-choice-bg);
          color: inherit;
          cursor: pointer;
        }
        .pmd-option-configurator-v3__choice:has(input:checked) {
          border-color: color-mix(in srgb, var(--pmd-accent, #111) 72%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pmd-accent, #111) 22%, transparent);
        }
        .pmd-option-configurator-v3__choiceMain {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: .65rem;
          font-weight: 720;
        }
        .pmd-option-configurator-v3__choice input {
          width: 1.08rem;
          height: 1.08rem;
          flex: 0 0 auto;
          accent-color: var(--pmd-accent, #111);
        }
        .pmd-option-configurator-v3__choicePrice {
          display: grid;
          flex: 0 0 auto;
          justify-items: end;
          font-weight: 850;
          white-space: nowrap;
        }
        .pmd-option-configurator-v3__choicePrice small {
          margin-top: .12rem;
          color: var(--pmd-muted, #6b6b6b);
          font-size: .62rem;
          font-weight: 650;
        }
        .pmd-option-configurator-v3__select {
          width: 100%;
          min-height: 3.35rem;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: var(--pmd-oc-control-radius);
          padding: .7rem .8rem;
          background: var(--pmd-control, var(--pmd-surface, #fff));
          color: inherit;
          font: inherit;
          font-weight: 720;
        }
        .pmd-option-configurator-v3__error {
          border-radius: var(--pmd-oc-control-radius);
          padding: .72rem .8rem;
          background: rgba(181,65,65,.12);
          color: #d65a5a;
          font-size: .76rem;
          font-weight: 800;
        }
        .pmd-option-configurator-v3__footer {
          display: grid;
          gap: .68rem;
          border-top: 1px solid var(--pmd-line, rgba(0,0,0,.1));
          padding: .85rem 1rem calc(.9rem + env(safe-area-inset-bottom, 0px));
          background: var(--pmd-surface, #fff);
        }
        .pmd-option-configurator-v3__scope {
          display: grid;
          gap: .15rem;
          border: 1px solid color-mix(in srgb, var(--pmd-accent, #111) 22%, transparent);
          border-radius: var(--pmd-oc-control-radius);
          padding: .62rem .72rem;
          background: color-mix(in srgb, var(--pmd-accent, #111) 7%, transparent);
        }
        .pmd-option-configurator-v3__scope strong {
          color: var(--pmd-text, inherit);
          font-size: .72rem;
          line-height: 1.35;
        }
        .pmd-option-configurator-v3__scope span {
          color: var(--pmd-muted, #6b6b6b);
          font-size: .66rem;
          line-height: 1.35;
        }
        .pmd-option-configurator-v3__summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .pmd-option-configurator-v3__qty {
          display: grid;
          grid-template-columns: 2.55rem 2.25rem 2.55rem;
          align-items: center;
          border: 1px solid var(--pmd-line, rgba(0,0,0,.14));
          border-radius: var(--pmd-oc-action-radius);
          overflow: hidden;
          background: var(--pmd-control, transparent);
        }
        .pmd-option-configurator-v3__qty button {
          display: grid;
          height: 2.7rem;
          place-items: center;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .pmd-option-configurator-v3__qty svg { width: 1rem; height: 1rem; }
        .pmd-option-configurator-v3__qty strong { text-align: center; }
        .pmd-option-configurator-v3__total { text-align: end; }
        .pmd-option-configurator-v3__total strong { display: block; font-size: 1.03rem; }
        .pmd-option-configurator-v3__total small { display: block; color: var(--pmd-muted, #6b6b6b); }
        .pmd-option-configurator-v3__total em {
          display: block;
          margin-top: .08rem;
          color: var(--pmd-accent, currentColor);
          font-size: .62rem;
          font-style: normal;
          font-weight: 750;
        }
        .pmd-option-configurator-v3__actions {
          display: grid;
          grid-template-columns: minmax(5.5rem, .34fr) minmax(0, 1fr);
          gap: .6rem;
        }
        .pmd-option-configurator-v3__back,
        .pmd-option-configurator-v3__add {
          min-height: 3rem;
          border-radius: var(--pmd-oc-action-radius);
          padding: .7rem .9rem;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
        }
        .pmd-option-configurator-v3__back {
          border: 1px solid var(--pmd-line, rgba(0,0,0,.16));
          background: transparent;
          color: inherit;
        }
        .pmd-option-configurator-v3__add {
          border: 1px solid var(--pmd-accent, #111);
          background: var(--pmd-accent, #111);
          color: var(--pmd-accentText, #fff);
        }

        /* Noir Editorial — sharp editorial framing and Didot display type. */
        .pmd-option-configurator-v3[data-theme-id="noir_editorial"] {
          --pmd-oc-card-radius: .2rem;
          --pmd-oc-control-radius: .12rem;
          --pmd-oc-group-radius: .12rem;
          --pmd-oc-action-radius: .12rem;
          --pmd-oc-group-bg: transparent;
          --pmd-oc-card-shadow: 0 1.5rem 4rem rgba(0,0,0,.62);
        }
        .pmd-option-configurator-v3[data-theme-id="noir_editorial"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="noir_editorial"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Didot, 'Bodoni 72', Georgia, serif;
          font-weight: 400;
          letter-spacing: .035em;
          text-transform: uppercase;
        }
        .pmd-option-configurator-v3[data-theme-id="noir_editorial"] .pmd-option-configurator-v3__badge,
        .pmd-option-configurator-v3[data-theme-id="noir_editorial"] .pmd-option-configurator-v3__actions button {
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* Verdant Modern — friendly rounded app surfaces. */
        .pmd-option-configurator-v3[data-theme-id="verdant_modern"] {
          --pmd-oc-card-radius: 2rem;
          --pmd-oc-control-radius: 1.05rem;
          --pmd-oc-group-radius: 1.4rem;
          --pmd-oc-action-radius: 1rem;
          --pmd-oc-card-shadow: 0 1.4rem 4rem rgba(0,0,0,.42);
        }

        /* Lumiere Fine Dining — restrained gold, elegant serif hierarchy. */
        .pmd-option-configurator-v3[data-theme-id="lumiere_fine_dining"] {
          --pmd-oc-card-radius: .8rem;
          --pmd-oc-control-radius: .7rem;
          --pmd-oc-group-radius: .8rem;
          --pmd-oc-action-radius: 999px;
          --pmd-oc-card-shadow: 0 1.2rem 3.5rem rgba(83,67,42,.18);
        }
        .pmd-option-configurator-v3[data-theme-id="lumiere_fine_dining"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="lumiere_fine_dining"] .pmd-option-configurator-v3__groupHead strong,
        .pmd-option-configurator-v3[data-theme-id="lumiere_fine_dining"] .pmd-option-configurator-v3__intro strong {
          font-family: Didot, Georgia, serif;
          font-weight: 400;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        /* Kazen Japanese — quiet square composition and restrained red accent. */
        .pmd-option-configurator-v3[data-theme-id="kazen_japanese"] {
          --pmd-oc-card-radius: 0;
          --pmd-oc-control-radius: 0;
          --pmd-oc-group-radius: 0;
          --pmd-oc-action-radius: 0;
          --pmd-oc-group-bg: transparent;
          --pmd-oc-card-shadow: 0 1rem 3rem rgba(43,34,26,.18);
        }
        .pmd-option-configurator-v3[data-theme-id="kazen_japanese"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="kazen_japanese"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Georgia, serif;
          font-weight: 400;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        /* Azzurra Coastal — generous coastal curves and blue-led surfaces. */
        .pmd-option-configurator-v3[data-theme-id="azzurra_coastal"] {
          --pmd-oc-card-radius: 2.2rem;
          --pmd-oc-control-radius: 1.25rem;
          --pmd-oc-group-radius: 1.7rem;
          --pmd-oc-action-radius: 999px;
          --pmd-oc-card-shadow: 0 1.2rem 3.5rem rgba(15,95,145,.22);
        }
        .pmd-option-configurator-v3[data-theme-id="azzurra_coastal"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="azzurra_coastal"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Georgia, serif;
          letter-spacing: .035em;
        }

        /* Neon Cocktail Bar — electric squared chrome with glow. */
        .pmd-option-configurator-v3[data-theme-id="neon_cocktail_bar"] {
          --pmd-oc-card-radius: .35rem;
          --pmd-oc-control-radius: .18rem;
          --pmd-oc-group-radius: .18rem;
          --pmd-oc-action-radius: .18rem;
          --pmd-oc-group-bg: var(--pmd-soft, #121218);
          --pmd-oc-card-shadow: 0 0 1.8rem color-mix(in srgb, var(--pmd-accent) 24%, transparent), 0 1.5rem 4rem rgba(0,0,0,.65);
        }
        .pmd-option-configurator-v3[data-theme-id="neon_cocktail_bar"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="neon_cocktail_bar"] .pmd-option-configurator-v3__groupHead strong,
        .pmd-option-configurator-v3[data-theme-id="neon_cocktail_bar"] .pmd-option-configurator-v3__actions button {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .pmd-option-configurator-v3[data-theme-id="neon_cocktail_bar"] .pmd-option-configurator-v3__choice:has(input:checked) {
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pmd-accent) 32%, transparent), 0 0 1rem color-mix(in srgb, var(--pmd-accent) 18%, transparent);
        }

        /* Art Deco Speakeasy — geometric antique-gold framing. */
        .pmd-option-configurator-v3[data-theme-id="art_deco_speakeasy"] {
          --pmd-oc-card-radius: 0;
          --pmd-oc-control-radius: 0;
          --pmd-oc-group-radius: 0;
          --pmd-oc-action-radius: 0;
          --pmd-oc-group-bg: color-mix(in srgb, var(--pmd-soft) 82%, transparent);
          --pmd-oc-card-shadow: 0 1.5rem 4rem rgba(0,0,0,.6), inset 0 0 0 .35rem color-mix(in srgb, var(--pmd-accent) 9%, transparent);
        }
        .pmd-option-configurator-v3[data-theme-id="art_deco_speakeasy"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="art_deco_speakeasy"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Didot, Georgia, serif;
          font-weight: 400;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .pmd-option-configurator-v3[data-theme-id="art_deco_speakeasy"] .pmd-option-configurator-v3__card::after {
          content: '';
          position: absolute;
          inset: .42rem;
          z-index: 3;
          border: 1px solid color-mix(in srgb, var(--pmd-accent) 16%, transparent);
          pointer-events: none;
        }

        /* Shahrazad Persian — layered ornamental gold frame. */
        .pmd-option-configurator-v3[data-theme-id="shahrazad_persian"] {
          --pmd-oc-card-radius: 1.7rem;
          --pmd-oc-control-radius: 1.05rem;
          --pmd-oc-group-radius: 1.35rem;
          --pmd-oc-action-radius: .9rem;
          --pmd-oc-card-shadow: 0 1.5rem 4rem rgba(0,0,0,.48), inset 0 0 0 .28rem color-mix(in srgb, var(--pmd-accent) 8%, transparent);
        }
        .pmd-option-configurator-v3[data-theme-id="shahrazad_persian"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="shahrazad_persian"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Georgia, serif;
          color: var(--pmd-accent, inherit);
        }

        /* Anatolia Turkish — warm terracotta, generous rounded cards. */
        .pmd-option-configurator-v3[data-theme-id="anatolia_turkish"] {
          --pmd-oc-card-radius: 1.65rem;
          --pmd-oc-control-radius: 1rem;
          --pmd-oc-group-radius: 1.35rem;
          --pmd-oc-action-radius: 999px;
          --pmd-oc-card-shadow: 0 1.4rem 4rem rgba(73,48,34,.2);
        }
        .pmd-option-configurator-v3[data-theme-id="anatolia_turkish"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="anatolia_turkish"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Georgia, serif;
          font-weight: 600;
        }

        /* Ember Steakhouse — charcoal/copper, square industrial framing. */
        .pmd-option-configurator-v3[data-theme-id="ember_steakhouse"] {
          --pmd-oc-card-radius: .3rem;
          --pmd-oc-control-radius: .25rem;
          --pmd-oc-group-radius: .3rem;
          --pmd-oc-action-radius: .3rem;
          --pmd-oc-group-bg: var(--pmd-soft, #221f1c);
          --pmd-oc-card-shadow: 0 1.5rem 4rem rgba(0,0,0,.58);
        }
        .pmd-option-configurator-v3[data-theme-id="ember_steakhouse"] .pmd-option-configurator-v3__header h2,
        .pmd-option-configurator-v3[data-theme-id="ember_steakhouse"] .pmd-option-configurator-v3__groupHead strong {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 500;
          text-transform: uppercase;
        }

        @media (min-width: 640px) {
          .pmd-option-configurator-v3 { align-items: center; padding: 1rem; }
          .pmd-option-configurator-v3__card { border-radius: var(--pmd-oc-card-radius); }
        }
        @media (max-width: 480px) {
          .pmd-option-configurator-v3__body { padding: .75rem; }
          .pmd-option-configurator-v3__footer { padding-inline: .75rem; }
          .pmd-option-configurator-v3__actions { grid-template-columns: minmax(5rem, .32fr) minmax(0, 1fr); }
          .pmd-option-configurator-v3__actions button { padding-inline: .7rem; }
          .pmd-option-configurator-v3__choice { padding-inline: .7rem; }
        }
      `}</style>

      <button type="button" className="pmd-option-configurator-v3__backdrop" onClick={close} aria-label={copy.cancel} />

      <section className="pmd-option-configurator-v3__card" role="dialog" aria-modal="true" aria-label={`${copy.title}: ${item.name}`}>
        <header className="pmd-option-configurator-v3__header">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle} · {item.name}</p>
          </div>
          <button type="button" className="pmd-option-configurator-v3__close" onClick={close} aria-label={copy.cancel}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="pmd-option-configurator-v3__body">
          <div className="pmd-option-configurator-v3__intro">
            <strong>{item.name}</strong>
            <span>{runtime.formatCurrency(item.price)}</span>
          </div>

          {item.options.map((group) => {
            const multi = group.displayType === 'checkbox'
            const ids = selected[group.id] || []
            return (
              <section className="pmd-option-configurator-v3__group" key={group.id} data-option-group={group.id}>
                <div className="pmd-option-configurator-v3__groupHead">
                  <div>
                    <strong>{group.name}</strong>
                    <small>{multi ? copy.chooseMultiple : copy.chooseOne}</small>
                  </div>
                  <span className="pmd-option-configurator-v3__badge" data-required={group.required ? 'true' : 'false'}>
                    {group.required ? copy.required : copy.optional}
                  </span>
                </div>

                {group.displayType === 'select' ? (
                  <select
                    className="pmd-option-configurator-v3__select"
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
                        {value.name}{value.price > 0 ? ` (+${runtime.formatCurrency(value.price)} ${copy.each})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="pmd-option-configurator-v3__choices">
                    {group.values.map((value) => {
                      const checked = ids.includes(value.id)
                      return (
                        <label className="pmd-option-configurator-v3__choice" key={value.id}>
                          <span className="pmd-option-configurator-v3__choiceMain">
                            <input
                              type={multi ? 'checkbox' : 'radio'}
                              name={`pmd-option-${group.id}`}
                              checked={checked}
                              onChange={() => toggle(group.id, value.id, multi)}
                            />
                            <span>{value.name}</span>
                          </span>
                          {value.price > 0 && (
                            <strong className="pmd-option-configurator-v3__choicePrice">
                              <span>+{runtime.formatCurrency(value.price)}</span>
                              {pending.quantity > 1 && (
                                <small>× {pending.quantity} = +{runtime.formatCurrency(value.price * pending.quantity)}</small>
                              )}
                            </strong>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {error && <div className="pmd-option-configurator-v3__error" role="alert">{error}</div>}
        </div>

        <footer className="pmd-option-configurator-v3__footer">
          {pending.quantity > 1 && (
            <div className="pmd-option-configurator-v3__scope">
              <strong>{scopeText}</strong>
              <span>{copy.separate}</span>
            </div>
          )}

          <div className="pmd-option-configurator-v3__summary">
            <div className="pmd-option-configurator-v3__qty" aria-label={runtime.labels.quantity}>
              <button type="button" onClick={() => setPending((current) => current ? { ...current, quantity: Math.max(1, current.quantity - 1) } : current)} aria-label="−">
                <Minus aria-hidden="true" />
              </button>
              <strong>{pending.quantity}</strong>
              <button type="button" onClick={() => setPending((current) => current ? { ...current, quantity: current.quantity + 1 } : current)} aria-label="+">
                <Plus aria-hidden="true" />
              </button>
            </div>
            <div className="pmd-option-configurator-v3__total">
              <strong>{runtime.formatCurrency(total)}</strong>
              <small>{runtime.formatCurrency(unitTotal)} {copy.each}</small>
              {pending.quantity > 1 && totalOptionsImpact > 0 && (
                <em>+{runtime.formatCurrency(totalOptionsImpact)} options</em>
              )}
            </div>
          </div>

          <div className="pmd-option-configurator-v3__actions">
            <button type="button" className="pmd-option-configurator-v3__back" onClick={close}>{copy.cancel}</button>
            <button type="button" className="pmd-option-configurator-v3__add" onClick={confirm}>
              {copy.addToOrder} · {runtime.formatCurrency(total)}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
