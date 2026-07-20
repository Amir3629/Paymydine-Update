"use client"

import React from "react"
import { X } from "lucide-react"

export function ModalCard({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="kazen-solid-modal-overlay pmd-kazen-action-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <article
        className="kazen-solid-modal-panel pmd-kazen-action-card"
        data-kazen-solid-panel="1"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="kazen-solid-modal-sheet pmd-kazen-action-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content pmd-kazen-action-content">
          <header className="kazen-solid-modal-head pmd-kazen-action-head">
            <div className="pmd-kazen-action-title-block">
              {eyebrow ? <div className="kazen-solid-eyebrow pmd-kazen-action-eyebrow">{eyebrow}</div> : null}
              <h2>{title}</h2>
            </div>
            <button type="button" className="kazen-solid-close pmd-kazen-action-close" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="pmd-kazen-action-body">{children}</div>
        </div>
      </article>
    </div>
  )
}
