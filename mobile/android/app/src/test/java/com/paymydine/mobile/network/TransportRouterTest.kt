package com.paymydine.mobile.network

import org.junit.Assert.assertEquals
import org.junit.Test

class TransportRouterTest {
    private val router = TransportRouter()
    private val edge = EdgeEndpoint("PayMyDine Edge", "192.168.1.20", 8443, "abc123", "site-1")

    @Test fun trustedEdgeWins() {
        assertEquals(TransportKind.EDGE, router.decide(true, edge, "ABC123").kind)
    }

    @Test fun untrustedEdgeFailsClosed() {
        assertEquals(TransportKind.CLOUD, router.decide(true, edge, "different").kind)
        assertEquals(TransportKind.OFFLINE, router.decide(false, edge, "different").kind)
    }
}
