"use client"

import React, { useEffect, useState } from "react"
import { X } from "lucide-react"
import type { KazenItem } from "./kazenStandaloneData"

type KazenItemDetailModalProps = {
  item: KazenItem
  images: string[]
  price: string
  quantity: number
  onClose: () => void
  onDecrease: () => void
  onIncrease: () => void
  onAdd: () => void
}

export function KazenItemDetailModal({
  item,
  images,
  price,
  quantity,
  onClose,
  onDecrease,
  onIncrease,
  onAdd,
}: KazenItemDetailModalProps) {
  const [activeImage, setActiveImage] = useState(0)
  const safeImages = images.filter(Boolean)
  const visibleImage = safeImages[activeImage] || safeImages[0] || ""
  const hasGallery = safeImages.length > 1

  useEffect(() => {
    setActiveImage(0)
  }, [item.id])

  useEffect(() => {
    if (!hasGallery) return

    const timer = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % safeImages.length)
    }, 4800)

    return () => window.clearInterval(timer)
  }, [hasGallery, safeImages.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  // PMD_KAZEN_ITEM_DETAIL_REWRITE_20260618_V3_RUNTIME
  // Runtime important styles are used because the live menu has older injected Kazen button CSS.
  useEffect(() => {
    if (typeof document === "undefined") return

    let cancelled = false

    const important = (el: HTMLElement | null, styles: Record<string, string>) => {
      if (!el) return
      Object.entries(styles).forEach(([key, value]) => el.style.setProperty(key, value, "important"))
    }

    const apply = () => {
      if (cancelled) return

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-card"), {
        "border-radius": "0",
        "width": "min(92vw, 460px)",
        "max-height": "min(92dvh, 760px)",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-header h2"), {
        "font-size": "clamp(1.75rem, 5.8vw, 2.55rem)",
        "line-height": "1",
        "letter-spacing": ".075em",
        "overflow-wrap": "normal",
        "word-break": "normal",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-close"), {
        "border-radius": "0",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-media"), {
        "border-radius": "0",
        "width": "fit-content",
        "max-width": "calc(100% - 44px)",
        "background": "transparent",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-image"), {
        "display": "block",
        "width": "auto",
        "max-width": "100%",
        "height": "auto",
        "max-height": "min(35dvh, 310px)",
        "object-fit": "contain",
        "border-radius": "0",
      })

      document.querySelectorAll<HTMLElement>(".pmd-kazen-detail-stepper-action").forEach((el, index) => {
        important(el, {
          "display": "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          "width": "34px",
          "height": "34px",
          "min-width": "34px",
          "min-height": "34px",
          "border-radius": "0",
          "background": "transparent",
          "background-color": "transparent",
          "color": "#242320",
          "box-shadow": "none",
          "font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
          "font-size": "1.38rem",
          "font-weight": "800",
          "line-height": "1",
          "cursor": "pointer",
          "user-select": "none",
          "touch-action": "manipulation",
        })

        important(el, index === 0
          ? { "border-right": "1px solid rgba(36, 35, 32, .16)", "border-left": "0", "border-top": "0", "border-bottom": "0" }
          : { "border-left": "1px solid rgba(36, 35, 32, .16)", "border-right": "0", "border-top": "0", "border-bottom": "0" }
        )
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-stepper"), {
        "display": "inline-grid",
        "grid-template-columns": "34px 38px 34px",
        "height": "36px",
        "width": "106px",
        "border-radius": "0",
        "overflow": "hidden",
        "background": "rgba(255, 252, 246, .68)",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-stepper strong"), {
        "height": "34px",
        "min-height": "34px",
        "font-size": ".95rem",
        "color": "#242320",
        "background": "rgba(255,255,255,.32)",
      })

      important(document.querySelector<HTMLElement>(".pmd-kazen-detail-add"), {
        "background": "#b85d59",
        "color": "#fffaf3",
        "border-color": "rgba(184, 93, 89, .62)",
        "border-radius": "0",
      })
    }

    apply()
    const raf = window.requestAnimationFrame(apply)
    const timers = [window.setTimeout(apply, 80), window.setTimeout(apply, 300), window.setTimeout(apply, 900)]

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [item.id, quantity, activeImage])

  const runByKeyboard = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      action()
    }
  }

  return (
    <div className="pmd-kazen-detail-overlay" role="dialog" aria-modal="true" aria-label={`${item.name} details`} onClick={onClose}>
      <article className="pmd-kazen-detail-card" onClick={(event) => event.stopPropagation()}>
        <header className="pmd-kazen-detail-header">
          <div className="pmd-kazen-detail-title-block">
            <span className="pmd-kazen-detail-eyebrow">Item detail</span>
            <h2>{item.name}</h2>
          </div>
          <button type="button" className="pmd-kazen-detail-close" onClick={onClose} aria-label="Close item detail">
            <X aria-hidden="true" />
          </button>
        </header>

        {visibleImage ? (
          <figure className="pmd-kazen-detail-media" aria-label={`${item.name} image gallery`}>
            <img key={visibleImage} src={visibleImage} alt={item.name} className="pmd-kazen-detail-image" />
            {hasGallery ? (
              <div className="pmd-kazen-detail-dots" aria-label="Item images">
                {safeImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={index === activeImage ? "is-active" : ""}
                    aria-label={`Show image ${index + 1}`}
                    onClick={() => setActiveImage(index)}
                  />
                ))}
              </div>
            ) : null}
          </figure>
        ) : null}

        <section className="pmd-kazen-detail-body">
          <p className="pmd-kazen-detail-description">
            {item.description || "Prepared with seasonal intention."}
          </p>

          <div className="pmd-kazen-detail-purchase-row">
            <div className="pmd-kazen-detail-price">
              <span>Price</span>
              <strong>{price}</strong>
            </div>

            <div className="pmd-kazen-detail-stepper" aria-label="Quantity">
              <span
                role="button"
                tabIndex={0}
                className="pmd-kazen-detail-stepper-action pmd-kazen-detail-stepper-minus"
                aria-label="Decrease quantity"
                onClick={onDecrease}
                onKeyDown={(event) => runByKeyboard(event, onDecrease)}
              >
                −
              </span>
              <strong>{quantity}</strong>
              <span
                role="button"
                tabIndex={0}
                className="pmd-kazen-detail-stepper-action pmd-kazen-detail-stepper-plus"
                aria-label="Increase quantity"
                onClick={onIncrease}
                onKeyDown={(event) => runByKeyboard(event, onIncrease)}
              >
                +
              </span>
            </div>
          </div>

          <div className="pmd-kazen-detail-actions">
            <button type="button" className="pmd-kazen-detail-cancel" onClick={onClose}>Close</button>
            <button type="button" className="pmd-kazen-detail-add" onClick={onAdd}>Add to order</button>
          </div>
        </section>
      </article>
    </div>
  )
}
