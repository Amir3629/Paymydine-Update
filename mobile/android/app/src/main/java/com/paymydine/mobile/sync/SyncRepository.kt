package com.paymydine.mobile.sync

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.paymydine.mobile.data.local.PmdDatabase

data class SyncStatusCounts(
    val pending: Int,
    val retrying: Int,
    val inFlight: Int,
    val rejected: Int,
) {
    val active: Int get() = pending + retrying + inFlight
}

class SyncRepository(private val database: PmdDatabase) {
    fun enqueue(command: CommandEnvelope): Boolean = database.transaction { db ->
        insertPending(db, command)
    }

    /**
     * Multi-step POS intentions (for example Send -> Cash) must enter the
     * outbox atomically. If either insert fails, SQLite rolls the whole
     * transaction back so a partial financial sequence cannot be stranded.
     */
    fun enqueueOrdered(commands: List<CommandEnvelope>): Boolean {
        if (commands.isEmpty()) return true

        return database.transaction { db ->
            commands.forEach { command ->
                check(insertPending(db, command)) {
                    "A PayMyDine command in this sequence is already queued."
                }
            }
            true
        }
    }

    private fun insertPending(
        db: SQLiteDatabase,
        command: CommandEnvelope,
    ): Boolean {
        val values = ContentValues().apply {
            put("command_id", command.commandId)
            put("idempotency_key", command.idempotencyKey)
            put("tenant_host", command.tenantHost)
            put("location_id", command.locationId)
            put("device_id", command.deviceId)
            command.staffId?.let { put("staff_id", it) }
            command.userId?.let { put("user_id", it) }
            put("aggregate", command.aggregate)
            put("aggregate_id", command.aggregateId)
            put("base_version", command.baseVersion)
            put("command_type", command.commandType)
            put("payload_json", command.payloadJson)
            put("status", STATUS_PENDING)
            put("retry_count", 0)
            put("created_at_ms", command.createdAtMs)
            put("next_retry_at_ms", 0)
        }

        return db.insertWithOnConflict(
            "pmd_outbox",
            null,
            values,
            SQLiteDatabase.CONFLICT_IGNORE,
        ) != -1L
    }

    fun pending(
        limit: Int = 50,
        nowMs: Long = System.currentTimeMillis(),
    ): List<CommandEnvelope> = database.readableDatabase.query(
        "pmd_outbox",
        null,
        "status IN (?, ?) AND next_retry_at_ms <= ?",
        arrayOf(STATUS_PENDING, STATUS_RETRY, nowMs.toString()),
        null,
        null,
        "created_at_ms ASC",
        limit.coerceIn(1, 200).toString(),
    ).use { rows ->
        buildList {
            while (rows.moveToNext()) add(rows.toCommandEnvelope())
        }
    }

    fun markInFlight(commandId: String): Boolean = updateStatus(
        commandId = commandId,
        allowed = setOf(STATUS_PENDING, STATUS_RETRY),
        nextStatus = STATUS_IN_FLIGHT,
        error = null,
        nextRetryAtMs = 0,
        incrementRetry = false,
    )

    fun acknowledge(commandId: String): Boolean = database.transaction { db ->
        db.delete("pmd_outbox", "command_id = ?", arrayOf(commandId)) == 1
    }

    fun retry(
        commandId: String,
        error: String,
        nowMs: Long = System.currentTimeMillis(),
    ): Boolean {
        val currentRetry = database.readableDatabase.query(
            "pmd_outbox",
            arrayOf("retry_count"),
            "command_id = ?",
            arrayOf(commandId),
            null,
            null,
            null,
            "1",
        ).use { if (it.moveToFirst()) it.getInt(0) else 0 }

        val attempt = currentRetry + 1
        val exponent = attempt.coerceIn(1, 8)
        val delayMs = ((1L shl exponent) * 1_000L).coerceAtMost(300_000L)

        return updateStatus(
            commandId = commandId,
            allowed = setOf(STATUS_IN_FLIGHT, STATUS_PENDING, STATUS_RETRY),
            nextStatus = STATUS_RETRY,
            error = error.take(1000),
            nextRetryAtMs = nowMs + delayMs,
            incrementRetry = true,
        )
    }

    fun defer(
        commandId: String,
        delayMs: Long = 15_000L,
        reason: String = "Accepted by restaurant Edge; waiting for cloud reconciliation.",
        nowMs: Long = System.currentTimeMillis(),
    ): Boolean = updateStatus(
        commandId = commandId,
        allowed = setOf(STATUS_IN_FLIGHT, STATUS_PENDING, STATUS_RETRY),
        nextStatus = STATUS_RETRY,
        error = reason.take(1000),
        nextRetryAtMs = nowMs + delayMs.coerceIn(1_000L, 300_000L),
        incrementRetry = false,
    )

    fun reject(commandId: String, error: String): Boolean = updateStatus(
        commandId = commandId,
        allowed = setOf(STATUS_IN_FLIGHT, STATUS_PENDING, STATUS_RETRY),
        nextStatus = STATUS_REJECTED,
        error = error.take(1000),
        nextRetryAtMs = 0,
        incrementRetry = false,
    )

    fun recoverInFlight(): Int = database.transaction { db ->
        db.update(
            "pmd_outbox",
            ContentValues().apply {
                put("status", STATUS_RETRY)
                put("next_retry_at_ms", 0)
                put("last_error", "Recovered after process restart.")
            },
            "status = ?",
            arrayOf(STATUS_IN_FLIGHT),
        )
    }

    // PMD_ANDROID_SYNC_VISIBILITY_V104
    // Rejected work is intentionally separate from active work: the cashier
    // must be able to see reconciliation problems instead of treating an empty
    // active outbox as "everything synced".
    fun statusCounts(): SyncStatusCounts {
        val counts = mutableMapOf<String, Int>()
        database.readableDatabase.rawQuery(
            "SELECT status, COUNT(*) FROM pmd_outbox GROUP BY status",
            null,
        ).use { rows ->
            while (rows.moveToNext()) {
                counts[rows.getString(0)] = rows.getInt(1)
            }
        }
        return SyncStatusCounts(
            pending = counts[STATUS_PENDING] ?: 0,
            retrying = counts[STATUS_RETRY] ?: 0,
            inFlight = counts[STATUS_IN_FLIGHT] ?: 0,
            rejected = counts[STATUS_REJECTED] ?: 0,
        )
    }

    fun outboxCount(): Int = statusCounts().active

    fun rejectedCount(): Int = statusCounts().rejected

    fun cursor(scope: String = DEFAULT_SCOPE): Long =
        database.readableDatabase.query(
        "pmd_sync_cursor",
        arrayOf("cursor"),
        "scope = ?",
        arrayOf(scope),
        null,
        null,
        null,
        "1",
    ).use {
        if (it.moveToFirst()) it.getLong(0) else 0L
    }

    fun applyEvent(event: SyncEvent): Boolean = database.transaction { db ->
        val values = ContentValues().apply {
            put("sequence", event.sequence)
            put("event_id", event.eventId)
            put("location_id", event.locationId)
            put("aggregate", event.aggregate)
            put("aggregate_id", event.aggregateId)
            put("aggregate_version", event.aggregateVersion)
            put("event_type", event.eventType)
            put("payload_json", event.payloadJson)
            put("created_at_ms", event.createdAtMs)
            put("applied_at_ms", System.currentTimeMillis())
        }

        val inserted = db.insertWithOnConflict(
            "pmd_inbox_events",
            null,
            values,
            SQLiteDatabase.CONFLICT_IGNORE,
        )
        if (inserted == -1L) return@transaction false

        db.insertWithOnConflict(
            "pmd_sync_cursor",
            null,
            ContentValues().apply {
                put("scope", DEFAULT_SCOPE)
                put("cursor", event.sequence)
            },
            SQLiteDatabase.CONFLICT_IGNORE,
        )

        db.update(
            "pmd_sync_cursor",
            ContentValues().apply { put("cursor", event.sequence) },
            "scope = ? AND cursor < ?",
            arrayOf(DEFAULT_SCOPE, event.sequence.toString()),
        )

        true
    }

    fun applyEdgeEvent(
        event: SyncEvent,
        scope: String,
    ): Boolean = database.transaction { db ->
        val values = ContentValues().apply {
            put("scope", scope)
            put("sequence", event.sequence)
            put("event_id", event.eventId)
            put("location_id", event.locationId)
            put("aggregate", event.aggregate)
            put("aggregate_id", event.aggregateId)
            put("aggregate_version", event.aggregateVersion)
            put("event_type", event.eventType)
            put("payload_json", event.payloadJson)
            put("created_at_ms", event.createdAtMs)
            put("applied_at_ms", System.currentTimeMillis())
        }

        val inserted = db.insertWithOnConflict(
            "pmd_edge_inbox_events",
            null,
            values,
            SQLiteDatabase.CONFLICT_IGNORE,
        )
        if (inserted == -1L) return@transaction false

        db.insertWithOnConflict(
            "pmd_sync_cursor",
            null,
            ContentValues().apply {
                put("scope", scope)
                put("cursor", event.sequence)
            },
            SQLiteDatabase.CONFLICT_IGNORE,
        )

        db.update(
            "pmd_sync_cursor",
            ContentValues().apply { put("cursor", event.sequence) },
            "scope = ? AND cursor < ?",
            arrayOf(scope, event.sequence.toString()),
        )

        true
    }

    private fun updateStatus(
        commandId: String,
        allowed: Set<String>,
        nextStatus: String,
        error: String?,
        nextRetryAtMs: Long,
        incrementRetry: Boolean,
    ): Boolean = database.transaction { db ->
        val current = db.query(
            "pmd_outbox",
            arrayOf("status", "retry_count"),
            "command_id = ?",
            arrayOf(commandId),
            null,
            null,
            null,
            "1",
        ).use {
            if (!it.moveToFirst()) null
            else it.getString(0) to it.getInt(1)
        } ?: return@transaction false

        if (current.first !in allowed) return@transaction false

        val values = ContentValues().apply {
            put("status", nextStatus)
            put("next_retry_at_ms", nextRetryAtMs)
            if (error == null) putNull("last_error") else put("last_error", error)
            if (incrementRetry) put("retry_count", current.second + 1)
        }

        db.update(
            "pmd_outbox",
            values,
            "command_id = ? AND status = ?",
            arrayOf(commandId, current.first),
        ) == 1
    }

    private fun Cursor.toCommandEnvelope() = CommandEnvelope(
        commandId = getString(getColumnIndexOrThrow("command_id")),
        idempotencyKey = getString(getColumnIndexOrThrow("idempotency_key")),
        tenantHost = getString(getColumnIndexOrThrow("tenant_host")),
        locationId = getLong(getColumnIndexOrThrow("location_id")),
        deviceId = getString(getColumnIndexOrThrow("device_id")),
        staffId = nullableLong("staff_id"),
        userId = nullableLong("user_id"),
        aggregate = getString(getColumnIndexOrThrow("aggregate")),
        aggregateId = getString(getColumnIndexOrThrow("aggregate_id")),
        baseVersion = getLong(getColumnIndexOrThrow("base_version")),
        commandType = getString(getColumnIndexOrThrow("command_type")),
        payloadJson = getString(getColumnIndexOrThrow("payload_json")),
        createdAtMs = getLong(getColumnIndexOrThrow("created_at_ms")),
    )

    private fun Cursor.nullableLong(name: String): Long? {
        val index = getColumnIndexOrThrow(name)
        return if (isNull(index)) null else getLong(index)
    }

    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_IN_FLIGHT = "IN_FLIGHT"
        const val STATUS_RETRY = "RETRY"
        const val STATUS_REJECTED = "REJECTED"
        const val DEFAULT_SCOPE = "restaurant"
    }
}
