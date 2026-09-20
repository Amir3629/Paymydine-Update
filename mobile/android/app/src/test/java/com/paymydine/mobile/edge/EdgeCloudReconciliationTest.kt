package com.paymydine.mobile.edge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class EdgeCloudReconciliationTest {
    @Test
    fun firstOfflineMutationKeepsLocalAggregateUntilCloudCreatesOrder() {
        val target = EdgeCloudReconciliation.target(
            sourceAggregateId = "local:draft-1",
            sourceBaseVersion = 0,
            mapping = null,
        )

        assertEquals("local:draft-1", target.aggregateId)
        assertEquals(0L, target.baseVersion)
        assertNull(target.serverOrderId)
    }

    @Test
    fun laterOfflineMutationsTargetTheSameCanonicalCloudOrder() {
        val target = EdgeCloudReconciliation.target(
            sourceAggregateId = "local:draft-1",
            sourceBaseVersion = 4,
            mapping = EdgeCloudOrderMapping(
                serverOrderId = 812,
                serverVersion = 7,
                serverUpdatedAt = "2026-09-20T19:00:00+00:00",
            ),
        )

        assertEquals("order:812", target.aggregateId)
        assertEquals(7L, target.baseVersion)
        assertEquals(812L, target.serverOrderId)
        assertEquals(
            "2026-09-20T19:00:00+00:00",
            target.expectedUpdatedAt,
        )
    }

    @Test
    fun canonicalAggregateIsNeverRewrittenAsAnotherOrder() {
        val target = EdgeCloudReconciliation.target(
            sourceAggregateId = "order:812",
            sourceBaseVersion = 9,
            mapping = EdgeCloudOrderMapping(999, 11, null),
        )

        assertEquals("order:812", target.aggregateId)
        assertEquals(9L, target.baseVersion)
        assertNull(target.serverOrderId)
    }
}
