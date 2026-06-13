"use client"

import { useCallback, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { UseValetRequestState, ValetRequestInput, ValetRequestResult } from "./types"

function cleanOptionalValue(value: string | null | undefined): string | undefined {
  const trimmed = String(value || "").trim()
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : undefined
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not submit valet request. Please try again."
}

export function useValetRequest(): UseValetRequestState & {
  submitValetRequest: (input: ValetRequestInput) => Promise<ValetRequestResult | null>
  resetValetRequest: () => void
} {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const resetValetRequest = useCallback(() => {
    setIsSubmitting(false)
    setIsSuccess(false)
    setErrorMessage("")
  }, [])

  const submitValetRequest = useCallback(async (input: ValetRequestInput): Promise<ValetRequestResult | null> => {
    const name = input.name.trim()
    const licensePlate = input.license_plate.trim()

    if (!name) {
      setErrorMessage("Please enter your name.")
      setIsSuccess(false)
      return null
    }

    if (!licensePlate) {
      setErrorMessage("Please enter your license plate.")
      setIsSuccess(false)
      return null
    }

    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const response = await apiClient.createValetRequest({
        name,
        license_plate: licensePlate,
        car_make: cleanOptionalValue(input.car_make),
        table_id: cleanOptionalValue(input.table_id),
        table_no: cleanOptionalValue(input.table_no),
        qr: cleanOptionalValue(input.qr),
      })

      setIsSuccess(true)
      return response
    } catch (error) {
      setIsSuccess(false)
      setErrorMessage(toErrorMessage(error))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    isSubmitting,
    isSuccess,
    errorMessage,
    submitValetRequest,
    resetValetRequest,
  }
}
