package com.paymydine.mobile.sync

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.paymydine.mobile.data.local.PmdDatabase

class SyncRepository(private val database: PmdDatabase) {
    fun enqueue(command: CommandEnvelope): Boolean = database.transaction { db ->
        val v = ContentValues().apply {
            put("command_id", command.commandId); put("idempotency_key", command.idempotencyKey)
            put("tenant_host", command.tenantHost); put("location_id", command.locationId)
            put("device_id", command.deviceId); command.staffId?.let { put("staff_id", it) }
            command.userId?.let { put("user_id", it) }; put("aggregate", command.aggregate)
            put("aggregate_id", command.aggregateId); put("base_version", command.baseVersion)
            put("command_type", command.commandType); put("payload_json", command.payloadJson)
            put("status", STATUS_PENDING); put("retry_count", 0)
            put("created_at_ms", command.createdAtMs); put("next_retry_at_ms", 0)
        }
        db.insertWithOnConflict("pmd_outbox", null, v, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }

    fun pending(limit: Int = 50, nowMs: Long = System.currentTimeMillis()): List<CommandEnvelope> =
        database.readableDatabase.query(
            "pmd_outbox", null, "status IN (?, ?) AND next_retry_at_ms <= ?",
            arrayOf(STATUS_PENDING, STATUS_RETRY, nowMs.toString()), null, null, "created_at_ms ASC",
            limit.coerceIn(1, 200).toString()
        ).use { rows -> buildList { while (rows.moveToNext()) add(rows.toCommandEnvelope()) } }

    fun acknowledge(commandId: String): Boolean = database.transaction { db ->
        db.delete("pmd_outbox", "command_id = ?", arrayOf(commandId)) == 1
    }

    fun outboxCount(): Int = database.readableDatabase.rawQuery(
        "SELECT COUNT(*) FROM pmd_outbox WHERE status != ?", arrayOf(STATUS_REJECTED)
    ).use { if (it.moveToFirst()) it.getInt(0) else 0 }

    fun applyEvent(event: SyncEvent): Boolean = database.transaction { db ->
        val v = ContentValues().apply {
            put("sequence", event.sequence); put("event_id", event.eventId); put("location_id", event.locationId)
            put("aggregate", event.aggregate); put("aggregate_id", event.aggregateId)
            put("aggregate_version", event.aggregateVersion); put("event_type", event.eventType)
            put("payload_json", event.payloadJson); put("created_at_ms", event.createdAtMs)
            put("applied_at_ms", System.currentTimeMillis())
        }
        if (db.insertWithOnConflict("pmd_inbox_events", null, v, SQLiteDatabase.CONFLICT_IGNORE) == -1L) {
            return@transaction false
        }
        db.insertWithOnConflict("pmd_sync_cursor", null, ContentValues().apply {
            put("scope", DEFAULT_SCOPE); put("cursor", event.sequence)
        }, SQLiteDatabase.CONFLICT_IGNORE)
        db.update("pmd_sync_cursor", ContentValues().apply { put("cursor", event.sequence) },
            "scope = ? AND cursor < ?", arrayOf(DEFAULT_SCOPE, event.sequence.toString()))
        true
    }

    private fun Cursor.toCommandEnvelope() = CommandEnvelope(
        getString(getColumnIndexOrThrow("command_id")), getString(getColumnIndexOrThrow("idempotency_key")),
        getString(getColumnIndexOrThrow("tenant_host")), getLong(getColumnIndexOrThrow("location_id")),
        getString(getColumnIndexOrThrow("device_id")), nullableLong("staff_id"), nullableLong("user_id"),
        getString(getColumnIndexOrThrow("aggregate")), getString(getColumnIndexOrThrow("aggregate_id")),
        getLong(getColumnIndexOrThrow("base_version")), getString(getColumnIndexOrThrow("command_type")),
        getString(getColumnIndexOrThrow("payload_json")), getLong(getColumnIndexOrThrow("created_at_ms"))
    )

    private fun Cursor.nullableLong(name: String): Long? {
        val i = getColumnIndexOrThrow(name)
        return if (isNull(i)) null else getLong(i)
    }

    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_RETRY = "RETRY"
        const val STATUS_REJECTED = "REJECTED"
        const val DEFAULT_SCOPE = "restaurant"
    }
}
