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
    <div className="velvet-solid-modal-overlay pmd-velvet-action-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <article
        className="velvet-solid-modal-panel pmd-velvet-action-card"
        data-velvet-solid-panel="1"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="velvet-solid-modal-sheet pmd-velvet-action-sheet" aria-hidden="true" />
        <div className="velvet-solid-modal-content pmd-velvet-action-content">
          <header className="velvet-solid-modal-head pmd-velvet-action-head">
            <div className="pmd-velvet-action-title-block">
              {eyebrow ? <div className="velvet-solid-eyebrow pmd-velvet-action-eyebrow">{eyebrow}</div> : null}
              <h2>{title}</h2>
            </div>
            <button type="button" className="velvet-solid-close pmd-velvet-action-close" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="pmd-velvet-action-body">{children}</div>
        </div>
      </article>
    </div>
  )
}
