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
    <div className="kazen-solid-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="kazen-solid-modal-panel"
        data-kazen-solid-panel="1"
        style={{
          background: "#fbf8f2",
          backgroundColor: "#fbf8f2",
          opacity: 1,
          filter: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          mixBlendMode: "normal",
        }}
      >
        <div className="kazen-solid-modal-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content">
          <div className="kazen-solid-modal-head">
            <div>
              {eyebrow ? <div className="kazen-solid-eyebrow">{eyebrow}</div> : null}
              <h2>{title}</h2>
            </div>
            <button type="button" className="kazen-solid-close" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
