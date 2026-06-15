"use client"

/**
 * Modern Green theme — Valet card (3H) with a success state.
 *
 * Body content for a "Request valet" modal. Two states are provided:
 *  - ModernGreenValetCard: the request form
 *  - ModernGreenValetSuccessCard: the confirmation state
 *
 * Controlled inputs; submission handled by the host.
 */

import { CheckCircle2, Car } from "lucide-react"
import { ThemeActionButton, ThemeInput } from "./primitives"

export interface ValetFormValues {
  name?: string
  licensePlate?: string
  carModel?: string
}

export function ModernGreenValetCard({
  values,
  description = "Bring your car to the entrance. We'll have it ready when you leave.",
  onChangeField,
  onSubmit,
  onCancel,
}: {
  values?: ValetFormValues
  description?: string
  onChangeField?: (field: keyof ValetFormValues, value: string) => void
  onSubmit?: () => void
  onCancel?: () => void
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--mg-text-soft)] text-pretty">
        {description}
      </p>

      <div className="space-y-3">
        <ThemeInput
          id="valet-name"
          label="Name"
          placeholder="Jane Doe"
          value={values?.name}
          onChange={(e) => onChangeField?.("name", e.target.value)}
        />
        <ThemeInput
          id="valet-plate"
          label="License plate"
          placeholder="ABC-1234"
          value={values?.licensePlate}
          onChange={(e) => onChangeField?.("licensePlate", e.target.value)}
        />
        <ThemeInput
          id="valet-model"
          label="Car model (optional)"
          placeholder="Black Audi A4"
          value={values?.carModel}
          onChange={(e) => onChangeField?.("carModel", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <ThemeActionButton
          fullWidth
          size="lg"
          leadingIcon={<Car className="size-4" />}
          onClick={onSubmit}
        >
          Request my car
        </ThemeActionButton>
        <ThemeActionButton variant="ghost" fullWidth onClick={onCancel}>
          Cancel
        </ThemeActionButton>
      </div>
    </div>
  )
}

export function ModernGreenValetSuccessCard({
  message = "Your car is on the way to the entrance.",
  estimate = "Ready in about 5 min",
  onDone,
}: {
  message?: string
  estimate?: string
  onDone?: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pt-1 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[var(--mg-green-soft)] text-[var(--mg-green)]">
          <CheckCircle2 className="size-7" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--mg-text)]">
            Valet requested
          </h3>
          <p className="text-sm leading-relaxed text-[var(--mg-text-soft)] text-pretty">
            {message}
          </p>
        </div>
        <span className="mg-glass rounded-full px-3 py-1.5 text-xs font-medium text-[var(--mg-green)]">
          {estimate}
        </span>
      </div>

      <ThemeActionButton fullWidth size="lg" onClick={onDone}>
        Done
      </ThemeActionButton>
    </div>
  )
}
