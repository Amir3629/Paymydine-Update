"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function OrderPlacedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const returnUrl = searchParams.get("return_url") || "/menu"
    router.replace(returnUrl)
  }, [router, searchParams])

  return null
}
