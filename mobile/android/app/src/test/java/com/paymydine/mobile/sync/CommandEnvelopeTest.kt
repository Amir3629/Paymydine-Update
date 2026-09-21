package com.paymydine.mobile.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CommandEnvelopeTest {
    @Test fun commandIdIsIdempotencyKey() {
        val c = CommandEnvelope.create(
            "tomo.paymydine.com", 1, "device-a", 4, 7,
            "order", "local-order-1", 12, "ORDER_LINE_ADD", "{}",
            nowMs = 10, commandId = "9ecfb4c8-f95a-4eb8-9cb4-f6cc2a911715"
        )
        assertEquals(c.commandId, c.idempotencyKey)
    }

    @Test fun generatedCommandsDoNotReuseIds() {
        fun make() = CommandEnvelope.create(
            "tomo.paymydine.com", 1, "device-a", null, null,
            "order", "order-a", 0, "ORDER_OPEN", "{}"
        )
        assertNotEquals(make().commandId, make().commandId)
    }
}
