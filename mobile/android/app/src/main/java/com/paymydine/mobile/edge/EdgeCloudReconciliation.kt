package com.paymydine.mobile.edge

data class EdgeCloudOrderMapping(
    val serverOrderId: Long,
    val serverVersion: Long,
    val serverUpdatedAt: String?,
)

data class EdgeCloudTarget(
    val aggregateId: String,
    val baseVersion: Long,
    val serverOrderId: Long?,
    val expectedUpdatedAt: String?,
)

/**
 * Pure reconciliation rule used before an Edge-applied command is replayed to
 * Cloud. Keeping this rule free of Android/SQLite/JSON makes the duplicate-bill
 * invariant unit-testable.
 */
object EdgeCloudReconciliation {
    fun target(
        sourceAggregateId: String,
        sourceBaseVersion: Long,
        mapping: EdgeCloudOrderMapping?,
    ): EdgeCloudTarget {
        if (
            !sourceAggregateId.startsWith("local:") ||
            mapping == null ||
            mapping.serverOrderId < 1
        ) {
            return EdgeCloudTarget(
                aggregateId = sourceAggregateId,
                baseVersion = sourceBaseVersion,
                serverOrderId = null,
                expectedUpdatedAt = null,
            )
        }

        return EdgeCloudTarget(
            aggregateId = "order:${mapping.serverOrderId}",
            baseVersion = mapping.serverVersion.coerceAtLeast(0),
            serverOrderId = mapping.serverOrderId,
            expectedUpdatedAt = mapping.serverUpdatedAt
                ?.trim()
                ?.takeIf { it.isNotBlank() },
        )
    }
}
