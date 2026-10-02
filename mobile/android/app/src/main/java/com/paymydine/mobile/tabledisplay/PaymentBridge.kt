package com.paymydine.mobile.tabledisplay

import android.content.Context

/**
 * The Table Companion can display a payment request immediately, but it never
 * fabricates an approval. The actual device manufacturer / acquiring gateway
 * SDK must implement this bridge. Until then the existing PayMyDine server and
 * payment provider remain the only settlement authority.
 */
interface PaymentBridge {
    suspend fun startPayment(event: DisplayEvent): Boolean
}

class NoopPaymentBridge : PaymentBridge {
    override suspend fun startPayment(event: DisplayEvent): Boolean = false
}

object PaymentBridgeRegistry {
    fun resolve(context: Context): PaymentBridge = NoopPaymentBridge()
}
