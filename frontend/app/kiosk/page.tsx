import { Suspense } from "react"
import KioskMenuPage from "@/features/kiosk/KioskMenuPage"

export default function KioskPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#050508"}} />}>
      <KioskMenuPage />
    </Suspense>
  )
}
