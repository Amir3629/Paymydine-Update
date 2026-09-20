package com.paymydine.mobile.data.local

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import com.paymydine.mobile.sync.CommandEnvelope
import org.json.JSONArray
import org.json.JSONObject

data class KdsStationRow(
    val id: String,
    val name: String,
    val slug: String,
)

data class KdsTicketRow(
    val ticketId: String,
    val orderId: String,
    val stationId: String?,
    val aggregateVersion: Long,
    val statusId: Long,
    val statusName: String,
    val payloadJson: String,
)

data class KdsStatusRow(
    val id: Long,
    val name: String,
)

class KdsRepository(private val database: PmdDatabase) {
    fun stations(): List<KdsStationRow> = database.readableDatabase.query(
        "pmd_kds_stations",
        arrayOf("station_id", "name", "slug"),
        null,
        null,
        null,
        null,
        "name COLLATE NOCASE ASC",
    ).use { rows ->
        buildList {
            while (rows.moveToNext()) {
                add(
                    KdsStationRow(
                        id = rows.getString(0),
                        name = rows.getString(1),
                        slug = rows.getString(2),
                    ),
                )
            }
        }
    }

    fun selectedStationSlug(): String? =
        meta(META_SELECTED_STATION)?.takeIf { it.isNotBlank() }

    fun selectStation(slug: String?) {
        database.transaction { db ->
            putMeta(
                db,
                META_SELECTED_STATION,
                slug?.trim().orEmpty(),
            )
        }
    }

    fun ensureDefaultStation(): String? {
        selectedStationSlug()?.let { return it }

        val first = stations().firstOrNull()?.slug ?: return null
        selectStation(first)
        return first
    }

    fun statuses(): List<KdsStatusRow> {
        val raw = meta(META_STATUSES) ?: return emptyList()

        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val row = array.getJSONObject(i)
                    add(
                        KdsStatusRow(
                            id = row.optLong("status_id"),
                            name = row.optString("status_name"),
                        ),
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    fun tickets(locationId: Long, stationSlug: String?): List<KdsTicketRow> {
        val station = stationSlug
            ?.takeIf { it.isNotBlank() }
            ?.let { slug -> stations().firstOrNull { it.slug == slug } }

        val selection: String
        val args: Array<String>

        if (station != null) {
            selection = "location_id = ? AND station_id = ?"
            args = arrayOf(locationId.toString(), station.id)
        } else {
            selection = "location_id = ? AND station_id IS NULL"
            args = arrayOf(locationId.toString())
        }

        return database.readableDatabase.query(
            "pmd_kds_tickets",
            arrayOf(
                "ticket_id",
                "order_id",
                "station_id",
                "version",
                "status",
                "payload_json",
            ),
            selection,
            args,
            null,
            null,
            "updated_at_ms ASC",
        ).use { rows ->
            buildList {
                while (rows.moveToNext()) {
                    val payload = runCatching {
                        JSONObject(rows.getString(5))
                    }.getOrElse { JSONObject() }

                    add(
                        KdsTicketRow(
                            ticketId = rows.getString(0),
                            orderId = rows.getString(1),
                            stationId = if (rows.isNull(2)) null else rows.getString(2),
                            aggregateVersion = rows.getLong(3),
                            statusId = payload.optLong("status_id"),
                            statusName = rows.getString(4),
                            payloadJson = rows.getString(5),
                        ),
                    )
                }
            }
        }
    }

    fun applySnapshot(root: JSONObject) {
        check(root.optBoolean("ok")) { "KDS snapshot was not successful." }

        val locationId = root.getLong("location_id")
        val stationJson = root.optJSONObject("station")
        val stationId = stationJson?.optLong("id", 0)?.takeIf { it > 0 }?.toString()
        val stationSlug = stationJson?.optString("slug")?.takeIf { it.isNotBlank() }
        val statuses = root.optJSONArray("statuses") ?: JSONArray()
        val orders = root.optJSONArray("orders") ?: JSONArray()
        val now = System.currentTimeMillis()

        database.transaction { db ->
            if (stationId != null) {
                db.delete(
                    "pmd_kds_tickets",
                    "location_id = ? AND station_id = ?",
                    arrayOf(locationId.toString(), stationId),
                )
            } else {
                db.delete(
                    "pmd_kds_tickets",
                    "location_id = ? AND station_id IS NULL",
                    arrayOf(locationId.toString()),
                )
            }

            for (index in 0 until orders.length()) {
                val order = orders.getJSONObject(index)
                val orderId = order.get("order_id").toString()
                val ticketId = "${stationId ?: "all"}:$orderId"

                db.insertOrThrow(
                    "pmd_kds_tickets",
                    null,
                    ContentValues().apply {
                        put("ticket_id", ticketId)
                        put("location_id", locationId)
                        put("version", order.optLong("aggregate_version", 0))
                        put("order_id", orderId)
                        if (stationId == null) putNull("station_id")
                        else put("station_id", stationId)
                        put("status", order.optString("status_name", "Received"))
                        put("payload_json", order.toString())
                        put("updated_at_ms", now)
                    },
                )
            }

            putMeta(db, META_STATUSES, statuses.toString())
            putMeta(db, META_SNAPSHOT_AT, root.optString("generated_at"))

            if (!stationSlug.isNullOrBlank()) {
                putMeta(db, META_SELECTED_STATION, stationSlug)
            }
        }
    }

    fun buildStatusCommand(
        ticket: KdsTicketRow,
        newStatusId: Long,
        tenantHost: String,
        locationId: Long,
        deviceId: String,
        staffId: Long? = null,
        userId: Long? = null,
    ): CommandEnvelope {
        require(newStatusId > 0) { "Choose a KDS status." }
        require(ticket.statusId > 0) { "Refresh KDS before changing status." }

        val stationSlug = ticket.stationId?.let { stationId ->
            stations().firstOrNull { it.id == stationId }?.slug
        } ?: selectedStationSlug()

        val payload = JSONObject()
            .put("order_id", ticket.orderId.toLong())
            .put("status_id", newStatusId)
            .put("expected_status_id", ticket.statusId)

        if (!stationSlug.isNullOrBlank()) {
            payload.put("station_slug", stationSlug)
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = "order:${ticket.orderId}",
            baseVersion = ticket.aggregateVersion,
            commandType = "KDS_STATUS_V1",
            payloadJson = payload.toString(),
        )
    }

    fun applyCommandResult(command: CommandEnvelope, response: JSONObject) {
        if (command.commandType != "KDS_STATUS_V1") return

        val result = response.optJSONObject("result") ?: return
        val orderId = result.optLong("order_id", 0)
        if (orderId < 1) return

        val newVersion = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )
        val statusId = result.optLong("status_id", 0)
        val statusName = result.optString("status_name")

        updateOrderTickets(
            orderId = orderId.toString(),
            version = newVersion,
            statusId = statusId,
            statusName = statusName,
        )
    }

    fun applyEvent(
        eventType: String,
        aggregateVersion: Long,
        payload: JSONObject,
    ) {
        if (eventType != "KDS_STATUS_CHANGED_V1") return

        val result = payload.optJSONObject("order") ?: return
        val orderId = result.optLong("order_id", 0)
        if (orderId < 1) return

        updateOrderTickets(
            orderId = orderId.toString(),
            version = aggregateVersion,
            statusId = result.optLong("status_id", 0),
            statusName = result.optString("status_name"),
        )
    }

    private fun updateOrderTickets(
        orderId: String,
        version: Long,
        statusId: Long,
        statusName: String,
    ) {
        database.transaction { db ->
            val rows = db.query(
                "pmd_kds_tickets",
                arrayOf("ticket_id", "payload_json"),
                "order_id = ?",
                arrayOf(orderId),
                null,
                null,
                null,
            ).use { cursor ->
                buildList {
                    while (cursor.moveToNext()) {
                        add(cursor.getString(0) to cursor.getString(1))
                    }
                }
            }

            rows.forEach { (ticketId, rawPayload) ->
                val payload = runCatching {
                    JSONObject(rawPayload)
                }.getOrElse { JSONObject() }

                if (statusId > 0) payload.put("status_id", statusId)
                if (statusName.isNotBlank()) {
                    payload.put("status_name", statusName)
                }

                db.update(
                    "pmd_kds_tickets",
                    ContentValues().apply {
                        put("version", version)
                        if (statusName.isNotBlank()) put("status", statusName)
                        put("payload_json", payload.toString())
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                    "ticket_id = ?",
                    arrayOf(ticketId),
                )
            }
        }
    }

    private fun meta(key: String): String? = database.readableDatabase.query(
        "pmd_meta",
        arrayOf("value"),
        "key = ?",
        arrayOf(key),
        null,
        null,
        null,
        "1",
    ).use { if (it.moveToFirst()) it.getString(0) else null }

    private fun putMeta(
        db: SQLiteDatabase,
        key: String,
        value: String,
    ) {
        db.insertWithOnConflict(
            "pmd_meta",
            null,
            ContentValues().apply {
                put("key", key)
                put("value", value)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )
    }

    companion object {
        private const val META_SELECTED_STATION = "kds_selected_station"
        private const val META_STATUSES = "kds_statuses_json"
        private const val META_SNAPSHOT_AT = "kds_snapshot_at"
    }
}
