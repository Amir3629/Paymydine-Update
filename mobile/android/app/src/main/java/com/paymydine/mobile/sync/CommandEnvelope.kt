package com.paymydine.mobile.sync

import java.util.UUID

data class CommandEnvelope(
    val commandId: String,
    val idempotencyKey: String,
    val tenantHost: String,
    val locationId: Long,
    val deviceId: String,
    val staffId: Long?,
    val userId: Long?,
    val aggregate: String,
    val aggregateId: String,
    val baseVersion: Long,
    val commandType: String,
    val payloadJson: String,
    val createdAtMs: Long,
) {
    companion object {
        fun create(
            tenantHost: String, locationId: Long, deviceId: String, staffId: Long?, userId: Long?,
            aggregate: String, aggregateId: String, baseVersion: Long, commandType: String,
            payloadJson: String, nowMs: Long = System.currentTimeMillis(),
            commandId: String = UUID.randomUUID().toString(),
        ): CommandEnvelope {
            require(tenantHost.isNotBlank() && locationId > 0 && deviceId.isNotBlank())
            require(aggregate.isNotBlank() && aggregateId.isNotBlank() && commandType.isNotBlank())
            return CommandEnvelope(
                commandId, commandId, tenantHost.lowercase(), locationId, deviceId, staffId, userId,
                aggregate, aggregateId, baseVersion, commandType, payloadJson, nowMs
            )
        }
    }
}

data class SyncEvent(
    val sequence: Long, val eventId: String, val locationId: Long, val aggregate: String,
    val aggregateId: String, val aggregateVersion: Long, val eventType: String,
    val payloadJson: String, val createdAtMs: Long,
)
