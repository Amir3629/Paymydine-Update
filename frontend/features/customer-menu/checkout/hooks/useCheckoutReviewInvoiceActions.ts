"use client"

import { useMemo, useState } from "react"
import { Link2, MessageSquare, QrCode, Star } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { PmdSocialPlatformId } from "@/store/cms-store"

export function useCheckoutReviewInvoiceActions({
  merchantSettings,
  submittedSnapshot,
  initialSubmittedOrder,
  existingOrderId,
}: any) {
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewSubmitStatus, setReviewSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("")
  const [invoiceDownloadStatus, setInvoiceDownloadStatus] = useState<"idle" | "loading" | "error">("idle")
  const [invoiceDownloadMessage, setInvoiceDownloadMessage] = useState("")

  const activeReviewSharePlatforms = useMemo(() => {
    const platformMeta: Array<{ id: PmdSocialPlatformId; label: string; icon: typeof Star }> = [
      { id: "trustpilot", label: "Trustpilot", icon: Star },
      { id: "instagram", label: "Instagram", icon: Link2 },
      { id: "google", label: "Google Reviews", icon: QrCode },
      { id: "website", label: "Website", icon: Link2 },
      { id: "reviews", label: "Reviews page", icon: MessageSquare },
    ]

    return platformMeta.filter(({ id }) => {
      const platform = merchantSettings?.reviewSocial?.platforms?.[id]
      return Boolean(platform?.enabled && platform?.url)
    })
  }, [merchantSettings?.reviewSocial])

  const canSubmitReview = reviewRating > 0 || reviewComment.trim().length > 0

  const handleSubmitReview = async () => {
    if (!canSubmitReview || reviewSubmitStatus === "loading") return

    setReviewSubmitStatus("loading")
    setReviewSubmitMessage("")

    try {
      const orderId =
        submittedSnapshot?.orderId ||
        submittedSnapshot?.order_id ||
        initialSubmittedOrder?.orderId ||
        existingOrderId ||
        null

      await apiClient.submitReview({
        order_id: orderId,
        rating: reviewRating,
        review: reviewComment.trim(),
        public_share_consent: null,
      })

      setReviewSubmitStatus("success")
      setReviewSubmitMessage("Thank you — your review was sent to the restaurant.")
    } catch (error) {
      setReviewSubmitStatus("error")
      setReviewSubmitMessage(error instanceof Error ? error.message : "Could not submit your review. Please try again.")
    }
  }

  const handleDownloadBusinessInvoice = async () => {
    const orderId =
      submittedSnapshot?.orderId ||
      submittedSnapshot?.order_id ||
      initialSubmittedOrder?.orderId ||
      existingOrderId ||
      null

    if (!orderId || invoiceDownloadStatus === "loading") {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage("Order number is not available yet.")
      return
    }

    setInvoiceDownloadStatus("loading")
    setInvoiceDownloadMessage("")

    try {
      const blob = await apiClient.downloadBusinessInvoice(orderId)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = objectUrl
      link.download = `business-invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setInvoiceDownloadStatus("idle")
    } catch (error) {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage(error instanceof Error ? error.message : "Could not download the business invoice.")
    }
  }

  return {
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    reviewSubmitStatus,
    setReviewSubmitStatus,
    reviewSubmitMessage,
    invoiceDownloadStatus,
    invoiceDownloadMessage,
    activeReviewSharePlatforms,
    canSubmitReview,
    handleSubmitReview,
    handleDownloadBusinessInvoice,
  }
}
