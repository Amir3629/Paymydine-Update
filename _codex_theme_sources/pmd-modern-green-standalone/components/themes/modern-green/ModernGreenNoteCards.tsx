"use client"

/**
 * Modern Green theme — Note / Request card (3G).
 *
 * Body content for a "Note / special request" modal. Controlled input:
 * the host owns the value and submission via props.
 */

import { ThemeActionButton, ThemeTextarea } from "./primitives"

export function ModernGreenNoteCard({
  value,
  placeholder = "e.g. No nuts, extra napkins, allergy info…",
  description = "Share allergies, preferences, or a request for the kitchen.",
  onChange,
  onSubmit,
  onCancel,
}: {
  value?: string
  placeholder?: string
  description?: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  onCancel?: () => void
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--mg-text-soft)] text-pretty">
        {description}
      </p>

      <ThemeTextarea
        id="note-request"
        label="Your note"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />

      <div className="space-y-2">
        <ThemeActionButton fullWidth size="lg" onClick={onSubmit}>
          Submit request
        </ThemeActionButton>
        <ThemeActionButton variant="ghost" fullWidth onClick={onCancel}>
          Cancel
        </ThemeActionButton>
      </div>
    </div>
  )
}
