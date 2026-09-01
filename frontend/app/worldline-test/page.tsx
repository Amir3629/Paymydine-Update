"use client"

import { ShieldAlert } from "lucide-react"

/**
 * Historical public Worldline diagnostics exposed integration metadata and
 * could create provider sessions without the canonical submitted-order flow.
 * Keep the route as a harmless tombstone so old bookmarks do not become a
 * backdoor around payment orchestration.
 */
export default function WorldlineTestPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold">Worldline test page retired</h1>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Worldline checkout tests now run through PayMyDine's normal submitted-order payment flow. Public credential diagnostics and standalone payment-session creation are disabled.
            </p>
          </div>
        </div>
        <a href="/menu" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 font-semibold text-slate-950">
          Return to menu
        </a>
      </div>
    </main>
  )
}
