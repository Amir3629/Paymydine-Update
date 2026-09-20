package com.paymydine.mobile.data.local

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.paymydine.mobile.sync.CommandEnvelope
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class PosTableRow(
    val id: String,
    val number: String,
    val label: String,
    val status: String,
)

data class PosMenuItemRow(
    val id: String,
    val name: String,
    val priceMinor: Long,
    val currency: String,
    val categoryId: String?,
    val payloadJson: String,
) {
    val hasOptions: Boolean
        get() = runCatching {
            (JSONObject(payloadJson).optJSONArray("options")?.length() ?: 0) > 0
        }.getOrDefault(false)
}

data class DraftLine(
    val lineId: String,
    val itemId: String,
    val name: String,
    val quantity: Int,
    val unitPriceMinor: Long,
    val optionIds: List<Long>,
    val note: String,
)

data class DraftOrder(
    val localId: String,
    val locationId: Long,
    val serverId: String?,
    val tableId: String,
    val version: Long,
    val currency: String,
    val status: String,
    val totalMinor: Long,
    val guestCount: Int,
    val note: String,
    val lines: List<DraftLine>,
)

class LocalPosRepository(private val database: PmdDatabase) {
    fun tables(locationId: Long): List<PosTableRow> = database.readableDatabase.query(
        "pmd_tables",
        arrayOf("id", "number", "label", "status"),
        "location_id = ?",
        arrayOf(locationId.toString()),
        null,
        null,
        "label COLLATE NOCASE ASC",
    ).use { rows ->
        buildList {
            while (rows.moveToNext()) {
                add(
                    PosTableRow(
                        id = rows.getString(0),
                        number = rows.getString(1),
                        label = rows.getString(2),
                        status = rows.getString(3),
                    ),
                )
            }
        }
    }

    fun menu(locationId: Long, search: String = ""): List<PosMenuItemRow> {
        val term = search.trim()
        val where = if (term.isBlank()) {
            "location_id = ? AND deleted = 0"
        } else {
            "location_id = ? AND deleted = 0 AND name LIKE ?"
        }
        val args = if (term.isBlank()) {
            arrayOf(locationId.toString())
        } else {
            arrayOf(locationId.toString(), "%$term%")
        }

        return database.readableDatabase.query(
            "pmd_menu_items",
            arrayOf("id", "name", "price_minor", "currency", "category_id", "payload_json"),
            where,
            args,
            null,
            null,
            "name COLLATE NOCASE ASC",
            "750",
        ).use { rows ->
            buildList {
                while (rows.moveToNext()) {
                    add(
                        PosMenuItemRow(
                            id = rows.getString(0),
                            name = rows.getString(1),
                            priceMinor = rows.getLong(2),
                            currency = rows.getString(3),
                            categoryId = if (rows.isNull(4)) null else rows.getString(4),
                            payloadJson = rows.getString(5),
                        ),
                    )
                }
            }
        }
    }

    fun draftForTable(tableId: String): DraftOrder? {
        val row = database.readableDatabase.query(
            "pmd_orders",
            null,
            "table_id = ? AND status IN (?, ?, ?)",
            arrayOf(tableId, STATUS_DRAFT, STATUS_QUEUED, STATUS_RETRY),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) null else rows.toDraftHeader()
        } ?: return null

        return row.copy(lines = lines(row.localId))
    }

    fun addItem(
        locationId: Long,
        tableId: String,
        menuItemId: String,
        selectedOptionIds: List<Long> = emptyList(),
        note: String = "",
    ): DraftOrder = database.transaction { db ->
        val menu = db.query(
            "pmd_menu_items",
            null,
            "id = ? AND location_id = ? AND deleted = 0",
            arrayOf(menuItemId, locationId.toString()),
            null,
            null,
            null,
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) error("Menu item is no longer available.")
            PosMenuItemRow(
                id = rows.getString(rows.getColumnIndexOrThrow("id")),
                name = rows.getString(rows.getColumnIndexOrThrow("name")),
                priceMinor = rows.getLong(rows.getColumnIndexOrThrow("price_minor")),
                currency = rows.getString(rows.getColumnIndexOrThrow("currency")),
                categoryId = rows.getColumnIndexOrThrow("category_id").let { i ->
                    if (rows.isNull(i)) null else rows.getString(i)
                },
                payloadJson = rows.getString(rows.getColumnIndexOrThrow("payload_json")),
            )
        }

        val options = validateOptions(menu.payloadJson, selectedOptionIds)
        val optionMinor = options.sumOf { it.priceMinor }
        val signature = buildString {
            append(menu.id)
            append('|')
            append(options.map { it.id }.sorted().joinToString(","))
            append('|')
            append(note.trim())
        }

        val orderId = ensureDraft(db, locationId, tableId, menu.currency)
        val existing = db.query(
            "pmd_order_lines",
            arrayOf("line_id", "quantity_milli", "payload_json"),
            "order_id = ? AND item_id = ? AND deleted = 0",
            arrayOf(orderId, menu.id),
            null,
            null,
            null,
        ).use { rows ->
            var found: Pair<String, Int>? = null
            while (rows.moveToNext()) {
                val json = JSONObject(rows.getString(2))
                if (json.optString("signature") == signature) {
                    found = rows.getString(0) to rows.getInt(1)
                    break
                }
            }
            found
        }

        val payload = JSONObject()
            .put("name", menu.name)
            .put("note", note.trim())
            .put("signature", signature)
            .put("option_ids", JSONArray(options.map { it.id }))
            .put(
                "options",
                JSONArray().apply {
                    options.forEach {
                        put(
                            JSONObject()
                                .put("id", it.id)
                                .put("name", it.name)
                                .put("price_minor", it.priceMinor),
                        )
                    }
                },
            )

        if (existing != null) {
            db.update(
                "pmd_order_lines",
                ContentValues().apply {
                    put("quantity_milli", existing.second + 1000)
                    put("payload_json", payload.toString())
                },
                "line_id = ?",
                arrayOf(existing.first),
            )
        } else {
            db.insertOrThrow(
                "pmd_order_lines",
                null,
                ContentValues().apply {
                    put("line_id", UUID.randomUUID().toString())
                    put("order_id", orderId)
                    put("item_id", menu.id)
                    put("quantity_milli", 1000)
                    put("unit_price_minor", menu.priceMinor + optionMinor)
                    put("payload_json", payload.toString())
                    put("deleted", 0)
                },
            )
        }

        recalculate(db, orderId)
        readDraft(db, orderId)
    }

    fun changeQuantity(lineId: String, delta: Int): DraftOrder? = database.transaction { db ->
        val row = db.query(
            "pmd_order_lines",
            arrayOf("order_id", "quantity_milli"),
            "line_id = ? AND deleted = 0",
            arrayOf(lineId),
            null,
            null,
            null,
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) to it.getInt(1) else null }
            ?: return@transaction null

        val next = row.second + (delta * 1000)
        if (next <= 0) {
            db.update(
                "pmd_order_lines",
                ContentValues().apply { put("deleted", 1) },
                "line_id = ?",
                arrayOf(lineId),
            )
        } else {
            db.update(
                "pmd_order_lines",
                ContentValues().apply { put("quantity_milli", next) },
                "line_id = ?",
                arrayOf(lineId),
            )
        }

        recalculate(db, row.first)
        readDraft(db, row.first)
    }

    fun setDraftMeta(localOrderId: String, guestCount: Int, note: String): DraftOrder? =
        database.transaction { db ->
            val current = db.query(
                "pmd_orders",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(localOrderId),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else null }
                ?: return@transaction null

            val json = runCatching { JSONObject(current) }.getOrElse { JSONObject() }
            json.put("guest_count", guestCount.coerceIn(1, 99))
            json.put("note", note.trim())

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("payload_json", json.toString())
                    put("dirty", 1)
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localOrderId),
            )

            readDraft(db, localOrderId)
        }

    fun buildSendCommand(
        draft: DraftOrder,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
        hold: Boolean,
    ): CommandEnvelope {
        require(draft.lines.isNotEmpty()) { "Add at least one item." }

        val payload = JSONObject()
            .put("table_id", draft.tableId.toLongOrNull() ?: error("Invalid table id."))
            .put("guest_count", draft.guestCount)
            .put("note", draft.note)
            .put("force_new_check", draft.serverId.isNullOrBlank())
            .put(
                "items",
                JSONArray().apply {
                    draft.lines.forEach { line ->
                        put(
                            JSONObject()
                                .put("menu_id", line.itemId.toLongOrNull() ?: line.itemId)
                                .put("quantity", line.quantity)
                                .put("comment", line.note)
                                .put("options", JSONArray(line.optionIds)),
                        )
                    }
                },
            )

        if (!draft.serverId.isNullOrBlank()) {
            payload.put("order_id", draft.serverId.toLong())
            runCatching {
                val meta = JSONObject(
                    database.readableDatabase.query(
                        "pmd_orders",
                        arrayOf("payload_json"),
                        "id = ?",
                        arrayOf(draft.localId),
                        null,
                        null,
                        null,
                        "1",
                    ).use { if (it.moveToFirst()) it.getString(0) else "{}" },
                )
                meta.optString("server_updated_at").takeIf { it.isNotBlank() }?.let {
                    payload.put("expected_updated_at", it)
                }
            }
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = draft.locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = if (draft.serverId.isNullOrBlank()) {
                "local:${draft.localId}"
            } else {
                "order:${draft.serverId}"
            },
            baseVersion = draft.version,
            commandType = if (hold) "ORDER_HOLD_V1" else "ORDER_SEND_V1",
            payloadJson = payload.toString(),
        )
    }

    fun markQueued(localOrderId: String) {
        database.writableDatabase.update(
            "pmd_orders",
            ContentValues().apply {
                put("status", STATUS_QUEUED)
                put("dirty", 1)
                put("updated_at_ms", System.currentTimeMillis())
            },
            "id = ?",
            arrayOf(localOrderId),
        )
    }

    fun markRetry(localOrderId: String) {
        database.writableDatabase.update(
            "pmd_orders",
            ContentValues().apply {
                put("status", STATUS_RETRY)
                put("dirty", 1)
                put("updated_at_ms", System.currentTimeMillis())
            },
            "id = ?",
            arrayOf(localOrderId),
        )
    }

    fun applyCommandResult(command: CommandEnvelope, response: JSONObject) {
        val localOrderId = command.aggregateId.removePrefix("local:")
        val result = response.optJSONObject("result") ?: return
        val orderId = result.optLong("order_id", 0)
        if (orderId < 1) return

        val version = response.optLong("aggregate_version", command.baseVersion + 1)
        val updatedAt = result.optString("updated_at")
        val localId = if (command.aggregateId.startsWith("local:")) {
            localOrderId
        } else {
            database.readableDatabase.query(
                "pmd_orders",
                arrayOf("id"),
                "server_id = ?",
                arrayOf(orderId.toString()),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else null }
        } ?: return

        database.transaction { db ->
            val old = db.query(
                "pmd_orders",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(localId),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else "{}" }
            val meta = runCatching { JSONObject(old) }.getOrElse { JSONObject() }
            meta.put("server_updated_at", updatedAt)
            meta.put("last_command_id", command.commandId)

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("server_id", orderId.toString())
                    put("version", version)
                    put("status", if (command.commandType == "ORDER_HOLD_V1") STATUS_HELD else STATUS_SENT)
                    put("dirty", 0)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localId),
            )
        }
    }

    fun applyEdgeCommandResult(
        command: CommandEnvelope,
        response: JSONObject,
    ) {
        val result = response.optJSONObject("result") ?: return
        val localId = command.aggregateId
            .takeIf { it.startsWith("local:") }
            ?.removePrefix("local:")
            ?: return

        val version = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )
        val totalMinor = result.optLong(
            "order_total_minor",
            draftTotalMinor(localId),
        )
        val status = if (command.commandType == "ORDER_HOLD_V1") {
            STATUS_EDGE_HELD
        } else {
            STATUS_EDGE_SENT
        }

        database.transaction { db ->
            val current = db.query(
                "pmd_orders",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(localId),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else "{}" }

            val meta = runCatching {
                JSONObject(current)
            }.getOrElse { JSONObject() }

            meta.put("edge_command_id", command.commandId)
            meta.put("edge_provisional", true)
            meta.put(
                "edge_updated_at",
                result.optString("updated_at"),
            )

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("version", version)
                    put("status", status)
                    put("total_minor", totalMinor)
                    put("dirty", 1)
                    put("payload_json", meta.toString())
                    put(
                        "updated_at_ms",
                        System.currentTimeMillis(),
                    )
                },
                "id = ?",
                arrayOf(localId),
            )
        }
    }

    fun applyEdgeEvent(
        eventType: String,
        eventPayload: JSONObject,
        version: Long,
    ) {
        when (eventType) {
            "ORDER_SENT_EDGE_V1",
            "ORDER_HELD_EDGE_V1" -> {
                val aggregate = eventPayload
                    .optString("client_aggregate_id")
                val localId = aggregate
                    .takeIf { it.startsWith("local:") }
                    ?.removePrefix("local:")
                    ?: return
                val order = eventPayload.optJSONObject("order")
                    ?: return

                database.transaction { db ->
                    val current = db.query(
                        "pmd_orders",
                        arrayOf("payload_json"),
                        "id = ?",
                        arrayOf(localId),
                        null,
                        null,
                        null,
                        "1",
                    ).use {
                        if (it.moveToFirst()) it.getString(0)
                        else "{}"
                    }
                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }
                    meta.put("edge_provisional", true)
                    meta.put(
                        "edge_updated_at",
                        order.optString("updated_at"),
                    )

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("version", version)
                            put(
                                "status",
                                if (eventType == "ORDER_HELD_EDGE_V1") {
                                    STATUS_EDGE_HELD
                                } else {
                                    STATUS_EDGE_SENT
                                },
                            )
                            put(
                                "total_minor",
                                order.optLong(
                                    "order_total_minor",
                                    draftTotalMinor(localId),
                                ),
                            )
                            put("dirty", 1)
                            put(
                                "payload_json",
                                meta.toString(),
                            )
                            put(
                                "updated_at_ms",
                                System.currentTimeMillis(),
                            )
                        },
                        "id = ?",
                        arrayOf(localId),
                    )
                }
            }

            "CLOUD_RECONCILED_V1" -> {
                val localAggregate = eventPayload
                    .optString("local_aggregate_id")
                val localId = localAggregate
                    .takeIf { it.startsWith("local:") }
                    ?.removePrefix("local:")
                    ?: return
                val cloud = eventPayload.optJSONObject("cloud")
                    ?: return
                val result = cloud.optJSONObject("result")
                    ?: return
                val serverId = result.optLong("order_id", 0)
                if (serverId < 1) return

                database.transaction { db ->
                    val current = db.query(
                        "pmd_orders",
                        arrayOf("payload_json"),
                        "id = ?",
                        arrayOf(localId),
                        null,
                        null,
                        null,
                        "1",
                    ).use {
                        if (it.moveToFirst()) it.getString(0)
                        else "{}"
                    }
                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }

                    meta.put("edge_provisional", false)
                    meta.put(
                        "server_updated_at",
                        result.optString("updated_at"),
                    )

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("server_id", serverId.toString())
                            put(
                                "version",
                                cloud.optLong(
                                    "aggregate_version",
                                    version,
                                ),
                            )
                            put(
                                "status",
                                if (result.optString("mode") == "hold") {
                                    STATUS_HELD
                                } else {
                                    STATUS_SENT
                                },
                            )
                            put("dirty", 0)
                            put(
                                "payload_json",
                                meta.toString(),
                            )
                            put(
                                "updated_at_ms",
                                System.currentTimeMillis(),
                            )
                        },
                        "id = ?",
                        arrayOf(localId),
                    )
                }
            }

            "RECONCILIATION_REQUIRED_V1" -> {
                val aggregate = eventPayload
                    .optString("aggregate_id")
                    .ifBlank {
                        eventPayload.optString(
                            "local_aggregate_id",
                        )
                    }
                val localId = aggregate
                    .takeIf { it.startsWith("local:") }
                    ?.removePrefix("local:")
                    ?: return

                database.transaction { db ->
                    val current = db.query(
                        "pmd_orders",
                        arrayOf("payload_json"),
                        "id = ?",
                        arrayOf(localId),
                        null,
                        null,
                        null,
                        "1",
                    ).use {
                        if (it.moveToFirst()) it.getString(0)
                        else "{}"
                    }
                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }
                    meta.put(
                        "reconciliation_error",
                        eventPayload.optString("message"),
                    )

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("status", STATUS_CONFLICT)
                            put("dirty", 1)
                            put(
                                "payload_json",
                                meta.toString(),
                            )
                            put(
                                "updated_at_ms",
                                System.currentTimeMillis(),
                            )
                        },
                        "id = ?",
                        arrayOf(localId),
                    )
                }
            }
        }
    }

    fun applyOrderEvent(eventPayload: JSONObject, version: Long) {
        val order = eventPayload.optJSONObject("order") ?: return
        val serverId = order.optLong("order_id", 0)
        if (serverId < 1) return

        val clientAggregateId = eventPayload.optString("client_aggregate_id")
        val localId = when {
            clientAggregateId.startsWith("local:") -> clientAggregateId.removePrefix("local:")
            else -> database.readableDatabase.query(
                "pmd_orders",
                arrayOf("id"),
                "server_id = ?",
                arrayOf(serverId.toString()),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else null }
        } ?: return

        database.transaction { db ->
            val current = db.query(
                "pmd_orders",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(localId),
                null,
                null,
                null,
                "1",
            ).use { if (it.moveToFirst()) it.getString(0) else "{}" }
            val meta = runCatching { JSONObject(current) }.getOrElse { JSONObject() }
            meta.put("server_updated_at", order.optString("updated_at"))

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("server_id", serverId.toString())
                    put("version", version)
                    put("status", if (order.optString("mode") == "hold") STATUS_HELD else STATUS_SENT)
                    put(
                        "total_minor",
                        moneyToMinor(
                            order.optDouble("order_total", 0.0),
                            localMinorExponent(),
                        ),
                    )
                    put("dirty", 0)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localId),
            )
        }
    }

    private fun ensureDraft(
        db: SQLiteDatabase,
        locationId: Long,
        tableId: String,
        currency: String,
    ): String {
        val existing = db.query(
            "pmd_orders",
            arrayOf("id"),
            "table_id = ? AND status IN (?, ?)",
            arrayOf(tableId, STATUS_DRAFT, STATUS_RETRY),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }

        if (existing != null) return existing

        val id = UUID.randomUUID().toString()
        db.insertOrThrow(
            "pmd_orders",
            null,
            ContentValues().apply {
                put("id", id)
                put("location_id", locationId)
                put("version", 0)
                putNull("server_id")
                put("table_id", tableId)
                put("status", STATUS_DRAFT)
                put("total_minor", 0)
                put("currency", currency)
                put(
                    "payload_json",
                    JSONObject()
                        .put("guest_count", 1)
                        .put("note", "")
                        .toString(),
                )
                put("dirty", 1)
                put("updated_at_ms", System.currentTimeMillis())
            },
        )
        return id
    }

    private fun recalculate(db: SQLiteDatabase, orderId: String) {
        val total = db.rawQuery(
            """SELECT COALESCE(SUM((quantity_milli / 1000.0) * unit_price_minor), 0)
               FROM pmd_order_lines WHERE order_id = ? AND deleted = 0""",
            arrayOf(orderId),
        ).use { if (it.moveToFirst()) it.getDouble(0).toLong() else 0L }

        db.update(
            "pmd_orders",
            ContentValues().apply {
                put("total_minor", total)
                put("dirty", 1)
                put("status", STATUS_DRAFT)
                put("updated_at_ms", System.currentTimeMillis())
            },
            "id = ?",
            arrayOf(orderId),
        )
    }

    private fun readDraft(db: SQLiteDatabase, orderId: String): DraftOrder {
        val header = db.query(
            "pmd_orders",
            null,
            "id = ?",
            arrayOf(orderId),
            null,
            null,
            null,
            "1",
        ).use {
            check(it.moveToFirst()) { "Draft order disappeared." }
            it.toDraftHeader()
        }
        return header.copy(lines = lines(db, orderId))
    }

    private fun lines(orderId: String): List<DraftLine> = lines(database.readableDatabase, orderId)

    private fun lines(db: SQLiteDatabase, orderId: String): List<DraftLine> = db.query(
        "pmd_order_lines",
        arrayOf("line_id", "item_id", "quantity_milli", "unit_price_minor", "payload_json"),
        "order_id = ? AND deleted = 0",
        arrayOf(orderId),
        null,
        null,
        "rowid ASC",
    ).use { rows ->
        buildList {
            while (rows.moveToNext()) {
                val payload = runCatching { JSONObject(rows.getString(4)) }.getOrElse { JSONObject() }
                val optionIds = payload.optJSONArray("option_ids")
                add(
                    DraftLine(
                        lineId = rows.getString(0),
                        itemId = rows.getString(1),
                        name = payload.optString("name", "Item"),
                        quantity = (rows.getInt(2) / 1000).coerceAtLeast(1),
                        unitPriceMinor = rows.getLong(3),
                        optionIds = buildList {
                            if (optionIds != null) {
                                for (i in 0 until optionIds.length()) {
                                    add(optionIds.optLong(i))
                                }
                            }
                        },
                        note = payload.optString("note"),
                    ),
                )
            }
        }
    }

    private fun Cursor.toDraftHeader(): DraftOrder {
        val payload = runCatching {
            JSONObject(getString(getColumnIndexOrThrow("payload_json")))
        }.getOrElse { JSONObject() }

        return DraftOrder(
            localId = getString(getColumnIndexOrThrow("id")),
            locationId = getLong(getColumnIndexOrThrow("location_id")),
            serverId = getColumnIndexOrThrow("server_id").let { i ->
                if (isNull(i)) null else getString(i)
            },
            tableId = getString(getColumnIndexOrThrow("table_id")),
            version = getLong(getColumnIndexOrThrow("version")),
            currency = getString(getColumnIndexOrThrow("currency")),
            status = getString(getColumnIndexOrThrow("status")),
            totalMinor = getLong(getColumnIndexOrThrow("total_minor")),
            guestCount = payload.optInt("guest_count", 1).coerceIn(1, 99),
            note = payload.optString("note"),
            lines = emptyList(),
        )
    }

    private data class SelectedOption(
        val id: Long,
        val name: String,
        val priceMinor: Long,
    )

    private fun validateOptions(
        menuPayload: String,
        selectedIds: List<Long>,
    ): List<SelectedOption> {
        val root = JSONObject(menuPayload)
        val groups = root.optJSONArray("options") ?: JSONArray()
        val selected = selectedIds.toSet()
        val result = mutableListOf<SelectedOption>()

        for (i in 0 until groups.length()) {
            val group = groups.getJSONObject(i)
            val values = group.optJSONArray("values") ?: JSONArray()
            val groupSelected = mutableListOf<SelectedOption>()

            for (j in 0 until values.length()) {
                val value = values.getJSONObject(j)
                val id = value.optLong("id")
                if (id !in selected) continue

                groupSelected += SelectedOption(
                    id = id,
                    name = value.optString("name", "Option"),
                    priceMinor = moneyToMinor(
                        value.optDouble("price", 0.0),
                        localMinorExponent(),
                    ),
                )
            }

            val min = group.optInt("min", if (group.optBoolean("required")) 1 else 0)
            val max = group.optInt("max", 1).coerceAtLeast(1)
            require(groupSelected.size in min..max) {
                "${group.optString("name", "Options")} requires $min to $max choices."
            }

            result += groupSelected
        }

        return result
    }

    private fun draftTotalMinor(localId: String): Long =
        database.readableDatabase.query(
            "pmd_orders",
            arrayOf("total_minor"),
            "id = ?",
            arrayOf(localId),
            null,
            null,
            null,
            "1",
        ).use {
            if (it.moveToFirst()) it.getLong(0) else 0L
        }

    private fun localMinorExponent(): Int {
        val raw = database.readableDatabase.query(
            "pmd_meta",
            arrayOf("value"),
            "key = ?",
            arrayOf("bootstrap_json"),
            null,
            null,
            null,
            "1",
        ).use {
            if (it.moveToFirst()) it.getString(0) else "{}"
        }

        return runCatching {
            JSONObject(raw)
                .optJSONObject("location")
                ?.optInt("currency_minor_exponent", 2)
                ?.coerceIn(0, 4)
                ?: 2
        }.getOrDefault(2)
    }

    private fun moneyToMinor(
        value: Double,
        exponent: Int,
    ): Long = kotlin.math.round(
        value * Math.pow(10.0, exponent.toDouble()),
    ).toLong()

    companion object {
        const val STATUS_DRAFT = "DRAFT"
        const val STATUS_QUEUED = "QUEUED"
        const val STATUS_RETRY = "RETRY"
        const val STATUS_HELD = "HELD"
        const val STATUS_SENT = "SENT"
        const val STATUS_EDGE_HELD = "EDGE_HELD"
        const val STATUS_EDGE_SENT = "EDGE_SENT"
        const val STATUS_CONFLICT = "CONFLICT"
    }
}
