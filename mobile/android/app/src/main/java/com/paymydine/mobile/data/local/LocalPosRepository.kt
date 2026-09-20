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

data class TableBillState(
    val serverId: String?,
    val status: String,
    val version: Long,
    val baseTotalMinor: Long,
    val pendingTotalMinor: Long,
    val currency: String,
    val reconciliationError: String?,
) {
    val projectedTotalMinor: Long
        get() = when (status) {
            LocalPosRepository.STATUS_DRAFT,
            LocalPosRepository.STATUS_QUEUED,
            LocalPosRepository.STATUS_RETRY -> baseTotalMinor + pendingTotalMinor
            else -> maxOf(baseTotalMinor, pendingTotalMinor)
        }
}

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

    fun billForTable(tableId: String): TableBillState? =
        database.readableDatabase.query(
            "pmd_orders",
            arrayOf(
                "server_id",
                "status",
                "version",
                "total_minor",
                "currency",
                "payload_json",
            ),
            "table_id = ?",
            arrayOf(tableId),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) {
                null
            } else {
                val status = rows.getString(1)
                val currentTotal = rows.getLong(3)
                val payload = runCatching {
                    JSONObject(rows.getString(5))
                }.getOrElse { JSONObject() }
                val base = payload.optLong(
                    "base_total_minor",
                    if (
                        status == STATUS_SERVER_OPEN ||
                        status == STATUS_EDGE_OPEN ||
                        status == STATUS_HELD ||
                        status == STATUS_SENT ||
                        status == STATUS_EDGE_HELD ||
                        status == STATUS_EDGE_SENT
                    ) currentTotal else 0L,
                )

                TableBillState(
                    serverId = if (rows.isNull(0)) null else rows.getString(0),
                    status = status,
                    version = rows.getLong(2),
                    baseTotalMinor = base,
                    pendingTotalMinor = if (
                        status == STATUS_DRAFT ||
                        status == STATUS_QUEUED ||
                        status == STATUS_RETRY
                    ) currentTotal else 0L,
                    currency = rows.getString(4),
                    reconciliationError = payload
                        .optString("reconciliation_error")
                        .takeIf { it.isNotBlank() },
                )
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
            "table_id = ? AND status = ?",
            arrayOf(tableId, STATUS_DRAFT),
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

        val orderStatus = db.query(
            "pmd_orders",
            arrayOf("status"),
            "id = ?",
            arrayOf(row.first),
            null,
            null,
            null,
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }

        require(orderStatus == STATUS_DRAFT) {
            "This order is no longer editable while a sync command is pending."
        }

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
                arrayOf("payload_json", "status"),
                "id = ?",
                arrayOf(localOrderId),
                null,
                null,
                null,
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else it.getString(0) to it.getString(1)
            } ?: return@transaction null

            require(current.second == STATUS_DRAFT) {
                "This order is no longer editable while a sync command is pending."
            }

            val json = runCatching { JSONObject(current.first) }.getOrElse { JSONObject() }
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
        require(draft.status == STATUS_DRAFT) {
            "This order is already queued, retrying, or awaiting reconciliation."
        }
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

    fun markRetryForCommand(command: CommandEnvelope) {
        val serverOrderId = command.aggregateId
            .takeIf { it.startsWith("order:") }
            ?.removePrefix("order:")
            ?.toLongOrNull()
            ?: 0L
        resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = serverOrderId,
        )?.let(::markRetry)
    }

    fun markConflictForCommand(
        command: CommandEnvelope,
        message: String,
    ) {
        val serverOrderId = command.aggregateId
            .takeIf { it.startsWith("order:") }
            ?.removePrefix("order:")
            ?.toLongOrNull()
            ?: 0L
        val localId = resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = serverOrderId,
        ) ?: return

        database.transaction { db ->
            val raw = db.query(
                "pmd_orders",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(localId),
                null,
                null,
                null,
                "1",
            ).use { rows ->
                if (rows.moveToFirst()) rows.getString(0) else "{}"
            }

            val meta = runCatching {
                JSONObject(raw)
            }.getOrElse { JSONObject() }

            meta.put(
                "reconciliation_error",
                message.trim().take(1_000),
            )
            meta.put("rejected_command_id", command.commandId)
            meta.put("rejected_command_type", command.commandType)

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("status", STATUS_CONFLICT)
                    put("dirty", 1)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localId),
            )
        }
    }

    fun applyCommandResult(command: CommandEnvelope, response: JSONObject) {
        val result = response.optJSONObject("result") ?: return
        val orderId = result.optLong("order_id", 0)
        if (orderId < 1) return

        val localId = resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = orderId,
        ) ?: return
        val version = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )
        val totalMinor = if (result.has("order_total")) {
            moneyToMinor(
                result.optDouble("order_total", 0.0),
                localMinorExponent(),
            )
        } else {
            draftTotalMinor(localId)
        }

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

            val meta = runCatching {
                JSONObject(old)
            }.getOrElse { JSONObject() }

            meta.put("server_updated_at", result.optString("updated_at"))
            meta.put("last_command_id", command.commandId)
            meta.put("edge_provisional", false)
            meta.put("base_total_minor", totalMinor)

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("server_id", orderId.toString())
                    put("version", version)
                    put("status", STATUS_SERVER_OPEN)
                    put("total_minor", totalMinor)
                    put("dirty", 0)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localId),
            )

            // These lines are now part of the canonical server bill. Keeping
            // them in the local mutation cart would send them a second time.
            db.delete(
                "pmd_order_lines",
                "order_id = ?",
                arrayOf(localId),
            )
        }
    }

    fun applyEdgeCommandResult(
        command: CommandEnvelope,
        response: JSONObject,
    ) {
        val result = response.optJSONObject("result") ?: return
        val serverIdFromAggregate = command.aggregateId
            .removePrefix("order:")
            .takeIf { command.aggregateId.startsWith("order:") }
            ?.toLongOrNull()
            ?: 0L
        val localId = resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = serverIdFromAggregate,
        ) ?: return

        val version = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )
        val totalMinor = result.optLong(
            "order_total_minor",
            draftTotalMinor(localId),
        )

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
            meta.put("edge_updated_at", result.optString("updated_at"))
            meta.put("base_total_minor", totalMinor)

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("version", version)
                    put("status", STATUS_EDGE_OPEN)
                    put("total_minor", totalMinor)
                    put("dirty", 1)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(localId),
            )

            // The Edge has durably accepted these lines. Clear only the local
            // mutation cart; the provisional bill itself remains dirty until
            // Cloud reconciliation confirms it.
            db.delete(
                "pmd_order_lines",
                "order_id = ?",
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
                val aggregate = eventPayload.optString("client_aggregate_id")
                val order = eventPayload.optJSONObject("order") ?: return
                val serverId = aggregate
                    .removePrefix("order:")
                    .takeIf { aggregate.startsWith("order:") }
                    ?.toLongOrNull()
                    ?: 0L
                val localId = resolveLocalOrderId(
                    aggregateId = aggregate,
                    serverOrderId = serverId,
                ) ?: return
                val totalMinor = order.optLong(
                    "order_total_minor",
                    draftTotalMinor(localId),
                )

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
                        if (it.moveToFirst()) it.getString(0) else "{}"
                    }

                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }

                    meta.put("edge_provisional", true)
                    meta.put("edge_updated_at", order.optString("updated_at"))
                    meta.put("base_total_minor", totalMinor)
                    eventPayload.optJSONObject("edge_order")?.let {
                        meta.put("edge_order_snapshot", it)
                    }

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("version", version)
                            put("status", STATUS_EDGE_OPEN)
                            put("total_minor", totalMinor)
                            put("dirty", 1)
                            put("payload_json", meta.toString())
                            put("updated_at_ms", System.currentTimeMillis())
                        },
                        "id = ?",
                        arrayOf(localId),
                    )
                    db.delete(
                        "pmd_order_lines",
                        "order_id = ?",
                        arrayOf(localId),
                    )
                }
            }

            "CLOUD_RECONCILED_V1" -> {
                val sourceAggregate = eventPayload
                    .optString("local_aggregate_id")
                val cloud = eventPayload.optJSONObject("cloud") ?: return
                val result = cloud.optJSONObject("result") ?: return
                val serverId = result.optLong("order_id", 0)
                if (serverId < 1) return

                val localId = resolveLocalOrderId(
                    aggregateId = sourceAggregate,
                    serverOrderId = serverId,
                ) ?: return
                val totalMinor = if (result.has("order_total")) {
                    moneyToMinor(
                        result.optDouble("order_total", 0.0),
                        localMinorExponent(),
                    )
                } else {
                    draftTotalMinor(localId)
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
                    ).use {
                        if (it.moveToFirst()) it.getString(0) else "{}"
                    }

                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }

                    meta.put("edge_provisional", false)
                    meta.put("server_updated_at", result.optString("updated_at"))
                    meta.put("base_total_minor", totalMinor)

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("server_id", serverId.toString())
                            put(
                                "version",
                                cloud.optLong("aggregate_version", version),
                            )
                            put("status", STATUS_SERVER_OPEN)
                            put("total_minor", totalMinor)
                            put("dirty", 0)
                            put("payload_json", meta.toString())
                            put("updated_at_ms", System.currentTimeMillis())
                        },
                        "id = ?",
                        arrayOf(localId),
                    )
                    db.delete(
                        "pmd_order_lines",
                        "order_id = ?",
                        arrayOf(localId),
                    )
                }
            }

            "RECONCILIATION_REQUIRED_V1" -> {
                val aggregate = eventPayload
                    .optString("aggregate_id")
                    .ifBlank {
                        eventPayload.optString("local_aggregate_id")
                    }
                val serverId = aggregate
                    .removePrefix("order:")
                    .takeIf { aggregate.startsWith("order:") }
                    ?.toLongOrNull()
                    ?: 0L
                val localId = resolveLocalOrderId(
                    aggregateId = aggregate,
                    serverOrderId = serverId,
                ) ?: return

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
                        if (it.moveToFirst()) it.getString(0) else "{}"
                    }

                    val meta = runCatching {
                        JSONObject(current)
                    }.getOrElse { JSONObject() }
                    meta.put(
                        "reconciliation_error",
                        eventPayload.optString("message"),
                    )
                    meta.put("edge_provisional", true)

                    db.update(
                        "pmd_orders",
                        ContentValues().apply {
                            put("status", STATUS_CONFLICT)
                            put("dirty", 1)
                            put("payload_json", meta.toString())
                            put("updated_at_ms", System.currentTimeMillis())
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
        val tableId = order.optLong("table_id", 0)
        var localId = resolveLocalOrderId(
            aggregateId = clientAggregateId,
            serverOrderId = serverId,
        )

        if (localId == null && tableId > 0) {
            localId = seedServerShadowFromEvent(
                order = order,
                serverId = serverId,
                version = version,
            )
        }
        val resolvedLocalId = localId ?: return

        val totalMinor = moneyToMinor(
            order.optDouble("order_total", 0.0),
            localMinorExponent(),
        )
        val eventCommandId = eventPayload.optString("command_id")

        database.transaction { db ->
            val row = db.query(
                "pmd_orders",
                arrayOf("payload_json", "dirty", "status"),
                "id = ?",
                arrayOf(resolvedLocalId),
                null,
                null,
                null,
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else Triple(it.getString(0), it.getInt(1), it.getString(2))
            } ?: return@transaction

            val meta = runCatching {
                JSONObject(row.first)
            }.getOrElse { JSONObject() }
            val localCommandId = meta.optString("edge_command_id")
                .ifBlank { meta.optString("last_command_id") }
            val lineCount = db.rawQuery(
                "SELECT COUNT(*) FROM pmd_order_lines WHERE order_id = ? AND deleted = 0",
                arrayOf(resolvedLocalId),
            ).use { if (it.moveToFirst()) it.getInt(0) else 0 }

            val hasUnreconciledLocalWork =
                row.second != 0 &&
                    (
                        lineCount > 0 ||
                            row.third == STATUS_EDGE_OPEN ||
                            row.third == STATUS_QUEUED ||
                            row.third == STATUS_RETRY
                    )
            val sameCommand =
                eventCommandId.isNotBlank() &&
                    localCommandId.isNotBlank() &&
                    eventCommandId == localCommandId

            if (hasUnreconciledLocalWork && !sameCommand) {
                // Never discard a local cart/provisional Edge mutation because
                // another device changed the same bill. Keep the local work and
                // force explicit reconciliation.
                meta.put("remote_conflict_version", version)
                meta.put("remote_conflict_order", order)
                meta.put("reconciliation_error", "Order changed on another device.")

                db.update(
                    "pmd_orders",
                    ContentValues().apply {
                        put("status", STATUS_CONFLICT)
                        put("dirty", 1)
                        put("payload_json", meta.toString())
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                    "id = ?",
                    arrayOf(resolvedLocalId),
                )
                return@transaction
            }

            meta.put("server_updated_at", order.optString("updated_at"))
            meta.put("edge_provisional", false)
            meta.put("base_total_minor", totalMinor)
            if (eventCommandId.isNotBlank()) {
                meta.put("last_command_id", eventCommandId)
            }

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("server_id", serverId.toString())
                    put("version", version)
                    put("status", STATUS_SERVER_OPEN)
                    put("total_minor", totalMinor)
                    put("dirty", 0)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(resolvedLocalId),
            )
            db.delete(
                "pmd_order_lines",
                "order_id = ?",
                arrayOf(resolvedLocalId),
            )
        }
    }

    private fun resolveLocalOrderId(
        aggregateId: String,
        serverOrderId: Long = 0,
    ): String? {
        if (aggregateId.startsWith("local:")) {
            val candidate = aggregateId.removePrefix("local:")
            val exists = database.readableDatabase.query(
                "pmd_orders",
                arrayOf("id"),
                "id = ?",
                arrayOf(candidate),
                null,
                null,
                null,
                "1",
            ).use { it.moveToFirst() }
            if (exists) return candidate
        }

        val canonicalId = when {
            serverOrderId > 0 -> serverOrderId
            aggregateId.startsWith("order:") ->
                aggregateId.removePrefix("order:").toLongOrNull() ?: 0L
            else -> 0L
        }
        if (canonicalId < 1) return null

        return database.readableDatabase.query(
            "pmd_orders",
            arrayOf("id"),
            "server_id = ?",
            arrayOf(canonicalId.toString()),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }
    }

    private fun seedServerShadowFromEvent(
        order: JSONObject,
        serverId: Long,
        version: Long,
    ): String? {
        val tableId = order.optLong("table_id", 0)
        if (tableId < 1) return null

        val locationId = database.readableDatabase.query(
            "pmd_tables",
            arrayOf("location_id"),
            "id = ?",
            arrayOf(tableId.toString()),
            null,
            null,
            null,
            "1",
        ).use { if (it.moveToFirst()) it.getLong(0) else 0L }
        if (locationId < 1) return null

        val id = "server:$serverId"
        val totalMinor = moneyToMinor(
            order.optDouble("order_total", 0.0),
            localMinorExponent(),
        )
        val meta = JSONObject()
            .put("server_updated_at", order.optString("updated_at"))
            .put("base_total_minor", totalMinor)
            .put("guest_count", order.optInt("guest_count", 1).coerceIn(1, 99))
            .put("note", order.optString("comment"))
            .put("edge_provisional", false)

        database.writableDatabase.insertWithOnConflict(
            "pmd_orders",
            null,
            ContentValues().apply {
                put("id", id)
                put("location_id", locationId)
                put("version", version)
                put("server_id", serverId.toString())
                put("table_id", tableId.toString())
                put("status", STATUS_SERVER_OPEN)
                put("total_minor", totalMinor)
                put("currency", localCurrencyCode())
                put("payload_json", meta.toString())
                put("dirty", 0)
                put("updated_at_ms", System.currentTimeMillis())
            },
            SQLiteDatabase.CONFLICT_IGNORE,
        )
        return resolveLocalOrderId("order:$serverId", serverId)
    }

    private fun localCurrencyCode(): String {
        val raw = database.readableDatabase.query(
            "pmd_meta",
            arrayOf("value"),
            "key = ?",
            arrayOf("bootstrap_json"),
            null,
            null,
            null,
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else "{}" }

        return runCatching {
            JSONObject(raw)
                .optJSONObject("location")
                ?.optString("currency_code", "EUR")
                ?.ifBlank { "EUR" }
                ?: "EUR"
        }.getOrDefault("EUR")
    }

    private fun ensureDraft(
        db: SQLiteDatabase,
        locationId: Long,
        tableId: String,
        currency: String,
    ): String {
        val existingMutation = db.query(
            "pmd_orders",
            arrayOf("id"),
            "table_id = ? AND status = ?",
            arrayOf(tableId, STATUS_DRAFT),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }

        if (existingMutation != null) return existingMutation

        val blockedStatus = db.query(
            "pmd_orders",
            arrayOf("status"),
            "table_id = ? AND status IN (?, ?, ?)",
            arrayOf(
                tableId,
                STATUS_QUEUED,
                STATUS_RETRY,
                STATUS_CONFLICT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }

        if (blockedStatus != null) {
            error(
                when (blockedStatus) {
                    STATUS_CONFLICT ->
                        "This table has a reconciliation conflict. Sync/review it before adding more items."
                    STATUS_RETRY ->
                        "This table still has a command waiting to retry. Do not create another bill."
                    else ->
                        "This table already has an order queued for delivery. Wait for the sync result."
                },
            )
        }

        // Continue the latest financially-open bill instead of silently
        // creating a second check for the same table.
        val reusableOpenBill = db.query(
            "pmd_orders",
            arrayOf("id"),
            "table_id = ? AND status IN (?, ?, ?, ?, ?, ?)",
            arrayOf(
                tableId,
                STATUS_SERVER_OPEN,
                STATUS_EDGE_OPEN,
                STATUS_HELD,
                STATUS_SENT,
                STATUS_EDGE_HELD,
                STATUS_EDGE_SENT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { if (it.moveToFirst()) it.getString(0) else null }

        if (reusableOpenBill != null) return reusableOpenBill

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
                        .put("base_total_minor", 0)
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
        const val STATUS_SERVER_OPEN = "SERVER_OPEN"
        const val STATUS_EDGE_OPEN = "EDGE_OPEN"
        const val STATUS_HELD = "HELD"
        const val STATUS_SENT = "SENT"
        const val STATUS_EDGE_HELD = "EDGE_HELD"
        const val STATUS_EDGE_SENT = "EDGE_SENT"
        const val STATUS_CONFLICT = "CONFLICT"
    }
}
