'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, LoaderCircle, RotateCcw, XCircle } from 'lucide-react'
import {
  clearPendingProviderPayment,
  fetchTableOrder,
  finalizeExistingOrderPayment,
  findPendingProviderPayment,
  payExistingOrder,
  verifyProviderPayment,
  settleExistingOrderGroup,
} from '@/src/lib/client-api'
import styles from './payment-return.module.css'

type State = 'checking' | 'paid' | 'pending' | 'cancelled' | 'error'

function providerFromQuery(params: URLSearchParams): string {
  return String(params.get('payment_return_provider') || params.get('provider') || '')
    .trim()
    .toLowerCase()
}

function safeReturnPath(value: string | null | undefined): string {
  const raw = String(value || '/').trim()
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  try {
    const parsed = new URL(raw, 'https://paymydine.invalid')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

// PMD_POST_PAYMENT_REVIEW_RESUME_R75
//
// Provider payments leave the menu page, so React overlay state is lost.
// Remember only the successfully settled order ids for this SAME browser tab.
// MenuRuntimeContext consumes this one-shot marker after the canonical table
// state confirms the order is fully paid.
//
// This does NOT create a second review implementation. It only restores the
// existing shared PaidOrderReviewCard after returning from the provider.
const POST_PAYMENT_REVIEW_RESUME_KEY = 'pmd-v2:post-payment-review-resume'

function rememberPostPaymentReview(orderIds: Array<number | null | undefined>) {
  const normalized = Array.from(new Set(
    orderIds
      .map((value) => Math.max(0, Math.trunc(Number(value || 0))))
      .filter((value) => value > 0),
  ))

  try {
    window.sessionStorage.setItem(
      POST_PAYMENT_REVIEW_RESUME_KEY,
      JSON.stringify({
        orderIds: normalized,
        createdAt: Date.now(),
      }),
    )
  } catch {}
}

export default function PaymentReturnClient() {
  const [state, setState] = useState<State>('checking')
  const [message, setMessage] = useState('Verifying your payment with PayMyDine…')
  const [returnTo, setReturnTo] = useState('/')
  const [returnResolved, setReturnResolved] = useState(false) // PMD_VR_RETURN_RESUME_R1_4_4
  const params = useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    [],
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const requestedProvider = providerFromQuery(params)
      const foundPending = findPendingProviderPayment(requestedProvider)
      const provider = foundPending?.provider || requestedProvider
      const pending = foundPending?.pending || null
      const fallback = safeReturnPath(pending?.returnTo || params.get('return_to') || '/')
      setReturnTo(fallback)
      setReturnResolved(true)

      if (!provider || !pending) {
        setState('pending')
        setMessage('The provider return was received, but no local payment reference was found. Return to the menu and refresh the table order status.')
        return
      }

      try {
        const verification = await verifyProviderPayment(provider, pending, params)
        if (cancelled) return

        if (verification.cancelled) {
          clearPendingProviderPayment(provider)
          setState('cancelled')
          setMessage('The payment was cancelled or expired. No new charge was confirmed.')
          return
        }

        if (verification.paid) {
          const reference =
            verification.reference ||
            pending.paymentIntentId ||
            pending.transactionId ||
            pending.providerReference ||
            pending.sessionId ||
            pending.checkoutId ||
            pending.hostedCheckoutId ||
            null

          // PMD_MULTI_ORDER_PAYMENT_R32
          const groupedAllocations = (pending.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)
          if (reference && groupedAllocations.length > 1) {
            // Group settlement must fail loudly. Unlike the legacy singular reconcile
            // fallback below, a partially settled group is retried safely through the
            // backend's per-order already-paid guards and must never be reported as
            // fully paid until every selected order has settled.
            await settleExistingOrderGroup({
              allocations: groupedAllocations,
              table: pending.table,
              method: pending.methodCode,
              providerCode: pending.providerCode || provider,
              paymentReference: reference,
            })
            rememberPostPaymentReview(
              groupedAllocations.map((entry) => entry.orderId),
            )
            clearPendingProviderPayment(provider)
            setState('paid')
            setMessage(`Payment confirmed. ${groupedAllocations.length} selected table orders have been updated.`)
            return
          }

          if (reference && pending.paymentIntentToken) {
            try {
              await payExistingOrder({
                orderId: pending.orderId,
                table: pending.table,
                method: pending.methodCode,
                providerCode: pending.providerCode || provider,
                paymentReference: reference,
                amount: pending.amount,
                tipAmount: pending.tipAmount,
                couponCode: null,
                couponDiscount: 0,
                selectedItems: pending.selectedItems,
                payerLabel: pending.payerLabel,
                paymentIntentToken: pending.paymentIntentToken,
                guestSessionId: null,
              })
              rememberPostPaymentReview([pending.orderId])
              clearPendingProviderPayment(provider)
              setState('paid')
              setMessage('Payment confirmed. Your split payment was recorded successfully.')
              return
            } catch (error) {
              setState('error')
              setMessage(`The provider confirmed the charge, but PayMyDine could not finish settlement. Do not pay again. ${error instanceof Error ? error.message : ''}`.trim())
              return
            }
          }

          if (reference) {
            try {
              if ((pending.settlementMode || 'pay-existing') === 'pay-existing') {
                await payExistingOrder({
                  orderId: pending.orderId,
                  table: pending.table,
                  method: pending.methodCode,
                  providerCode: pending.providerCode || provider,
                  paymentReference: reference,
                  amount: pending.amount,
                  tipAmount: pending.tipAmount,
                  couponCode: pending.couponCode,
                  couponDiscount: pending.couponDiscount,
                  selectedItems: pending.selectedItems,
                  payerLabel: pending.payerLabel,
                })
              } else {
                await finalizeExistingOrderPayment({
                  orderId: pending.orderId,
                  paymentReference: reference,
                  methodCode: pending.methodCode,
                  providerCode: pending.providerCode || provider,
                })
              }
            } catch {
              // Some provider status routes persist settlement themselves. The shared
              // table-order response below remains the final source of truth.
            }
          }

          for (let attempt = 0; attempt < 8; attempt += 1) {
            const order = await fetchTableOrder(pending.table)
            if (order.paymentStatus === 'paid' || order.totals.remainingAmount <= 0) {
              rememberPostPaymentReview([
                pending.orderId,
                ...(pending.orderAllocations || []).map((entry) => entry.orderId),
              ])
              clearPendingProviderPayment(provider)
              setState('paid')
              setMessage('Payment confirmed. The shared table order has been updated for every guest.')
              return
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1200))
          }

          setState('pending')
          setMessage('The provider confirmed the payment, but the table settlement is still synchronizing. Return to the menu and refresh in a moment.')
          return
        }

        setState('pending')
        setMessage('Your payment is still pending confirmation. It is safe to return to the menu and check again shortly.')
      } catch (error) {
        if (cancelled) return
        setState('error')
        setMessage(error instanceof Error ? error.message : 'Payment verification failed.')
      }
    }

    void run()
    return () => { cancelled = true }
  }, [params])

  // PMD_VR_RETURN_RESUME_R1_4_4
  // VR Payment Lightbox intentionally redirects the top-level window to successUrl
  // or failedUrl after processing. Keep the canonical /payment/return verification
  // authority, then resume the original PayMyDine table URL in the SAME tab.
  // window.location.replace prevents Back from re-entering the provider return page.
  useEffect(() => {
    if (!returnResolved || (state !== 'paid' && state !== 'cancelled')) return
    if (!returnTo || returnTo.startsWith('/payment/return')) return

    const timer = window.setTimeout(() => {
      window.location.replace(returnTo)
    }, state === 'paid' ? 900 : 500)

    return () => window.clearTimeout(timer)
  }, [returnResolved, returnTo, state])

  const Icon = state === 'paid'
    ? CheckCircle2
    : state === 'cancelled' || state === 'error'
      ? XCircle
      : state === 'pending'
        ? Clock
        : LoaderCircle

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <Icon className={`${styles.icon} ${state === 'checking' ? styles.spin : ''}`} aria-hidden="true" />
        <p className={styles.eyebrow}>PayMyDine secure payment</p>
        <h1>{state === 'paid' ? 'Payment confirmed' : state === 'cancelled' ? 'Payment cancelled' : state === 'error' ? 'Verification problem' : state === 'pending' ? 'Payment pending' : 'Checking payment'}</h1>
        <p className={styles.message}>{message}</p>
        <a className={styles.return} href={returnTo}><RotateCcw /> Return to the menu</a>
      </section>
    </main>
  )
}
