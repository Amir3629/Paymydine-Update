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
    val settledMinor: Long,
    val paymentQueuedMinor: Long,
    val serverUpdatedAt: String?,
    val currency: String,
    val reconciliationError: String?,
) {
    val remainingMinor: Long
        get() = maxOf(0L, baseTotalMinor - settledMinor)

    val remainingAfterQueuedMinor: Long
        get() = maxOf(0L, remainingMinor - paymentQueuedMinor)

    val projectedTotalMinor: Long
        get() = when (status) {
            LocalPosRepository.STATUS_DRAFT,
            LocalPosRepository.STATUS_QUEUED,
            LocalPosRepository.STATUS_RETRY -> baseTotalMinor + pendingTotalMinor
            else -> maxOf(baseTotalMinor, pendingTotalMinor)
        }
}

data class CloudCommandRouting(
    val serverOrderId: Long,
    val serverVersion: Long,
    val expectedUpdatedAt: String?,
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
    // PMD_ANDROID_DURABLE_QPOS_UI_DRAFT_V18
    // This is UI continuity state, not a business command. It preserves the
    // exact unsent canonical cart/guest/note across process death without
    // creating a fake order or touching the sync ledger.
    fun saveQuickPosUiDraft(payloadJson: String) {
        require(payloadJson.length <= 256_000) {
            "Local cart is too large to save."
        }

        val payload = JSONObject(payloadJson)
        val serviceMode = payload.optString("service_mode", "dine_in")
        val tableId = payload.opt("table_id")
            ?.takeUnless { it === JSONObject.NULL }
            ?.toString()
            .orEmpty()
        val cart = payload.optJSONArray("cart") ?: JSONArray()
        val note = payload.optString("note").trim()
        val guestCount = payload.optInt("guest_count", 1).coerceIn(1, 99)

        database.transaction { db ->
            if (
                serviceMode != "dine_in" ||
                tableId.isBlank() ||
                (
                    cart.length() == 0 &&
                    note.isBlank()
                )
            ) {
                db.delete(
                    "pmd_meta",
                    "key = ?",
                    arrayOf(QPOS_UI_DRAFT_KEY),
                )
                return@transaction
            }

            payload
                .put("version", 1)
                .put("service_mode", "dine_in")
                .put("table_id", tableId)
                .put("guest_count", guestCount)
                .put("saved_at_ms", System.currentTimeMillis())

            db.insertWithOnConflict(
                "pmd_meta",
                null,
                ContentValues().apply {
                    put("key", QPOS_UI_DRAFT_KEY)
                    put("value", payload.toString())
                },
                SQLiteDatabase.CONFLICT_REPLACE,
            )
        }
    }

    fun quickPosUiDraft(locationId: Long): JSONObject? =
        database.readableDatabase.query(
            "pmd_meta",
            arrayOf("value"),
            "key = ?",
            arrayOf(QPOS_UI_DRAFT_KEY),
            null,
            null,
            null,
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) {
                null
            } else {
                runCatching {
                    JSONObject(rows.getString(0))
                }.getOrNull()?.takeIf { draft ->
                    draft.optLong("location_id", locationId) == locationId &&
                        draft.optString("service_mode") == "dine_in" &&
                        draft.optString("table_id").isNotBlank()
                }
            }
        }

    fun clearQuickPosUiDraft() {
        database.writableDatabase.delete(
            "pmd_meta",
            "key = ?",
            arrayOf(QPOS_UI_DRAFT_KEY),
        )
    }

    fun tables(locationId: Long): List<PosTableRow> = database.readableDatabase.query(
        "pmd_tables",
        arrayOf("id", "number", "label", "status"),
        "location_id = ?",
        arrayOf(locationId.toString()),
        null,
        null,
        "sort_order ASC, label COLLATE NOCASE ASC",
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
                    settledMinor = payload.optLong("settled_amount_minor", 0L),
                    paymentQueuedMinor = payload.optLong(
                        "offline_cash_queued_minor",
                        0L,
                    ),
                    serverUpdatedAt = payload.optString("server_updated_at")
                        .trim()
                        .takeIf { it.isNotBlank() },
                    currency = rows.getString(4),
                    reconciliationError = payload
                        .optString("reconciliation_error")
                        .takeIf { it.isNotBlank() },
                )
            }
        }

    fun billForServerOrder(orderId: Long): TableBillState? =
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
            "server_id = ?",
            arrayOf(orderId.toString()),
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
                    settledMinor = payload.optLong("settled_amount_minor", 0L),
                    paymentQueuedMinor = payload.optLong(
                        "offline_cash_queued_minor",
                        0L,
                    ),
                    serverUpdatedAt = payload.optString("server_updated_at")
                        .trim()
                        .takeIf { it.isNotBlank() },
                    currency = rows.getString(4),
                    reconciliationError = payload
                        .optString("reconciliation_error")
                        .takeIf { it.isNotBlank() },
                )
            }
        }

    fun tableIdForServerOrder(orderId: Long): String? =
        database.readableDatabase.query(
            "pmd_orders",
            arrayOf("table_id"),
            "server_id = ?",
            arrayOf(orderId.toString()),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { rows ->
            if (rows.moveToFirst()) rows.getString(0) else null
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
            "sort_order ASC, name COLLATE NOCASE ASC",
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

    /**
     * Visible local work includes a draft plus work already committed to the
     * durable outbox. It is read-only outside DRAFT, but keeping the lines
     * visible prevents a WAN cut / Send tap from making the check appear lost.
     */
    fun localWorkForTable(tableId: String): DraftOrder? {
        val row = database.readableDatabase.query(
            "pmd_orders",
            null,
            "table_id = ? AND status IN (?, ?, ?, ?)",
            arrayOf(
                tableId,
                STATUS_DRAFT,
                STATUS_QUEUED,
                STATUS_RETRY,
                STATUS_CONFLICT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) null else rows.toDraftHeader()
        } ?: return null

        return row.copy(lines = lines(row.localId))
    }

    /**
     * PMD_ANDROID_CANONICAL_POS_LOCAL_TRANSPORT_V18
     *
     * Materialize the canonical Quick POS cart into the existing durable draft
     * representation before it is queued. Validation happens against the
     * locally cached menu/options first so an invalid row cannot silently
     * become a different order during an outage.
     */
    fun stageQuickPosCart(
        locationId: Long,
        tableId: String,
        payload: JSONObject,
    ): DraftOrder {
        val items = payload.optJSONArray("items") ?: JSONArray()
        require(items.length() > 0) { "Add at least one item." }

        data class StagedLine(
            val menuId: String,
            val quantity: Int,
            val optionIds: List<Long>,
            val note: String,
        )

        val staged = buildList {
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index)
                    ?: error("One menu item could not be read.")
                val menuId = item.optLong("menu_id", item.optLong("id", 0L))
                require(menuId > 0L) { "A menu item is unavailable." }

                val cached = database.readableDatabase.query(
                    "pmd_menu_items",
                    arrayOf("payload_json"),
                    "id = ? AND location_id = ? AND deleted = 0",
                    arrayOf(menuId.toString(), locationId.toString()),
                    null,
                    null,
                    null,
                    "1",
                ).use {
                    if (it.moveToFirst()) it.getString(0) else null
                } ?: error("A menu item is no longer available.")

                val optionIdsJson = item.optJSONArray("options") ?: JSONArray()
                val optionIds = buildList {
                    for (optionIndex in 0 until optionIdsJson.length()) {
                        add(optionIdsJson.optLong(optionIndex))
                    }
                }

                // Validate every line before the first mutation.
                validateOptions(cached, optionIds)

                add(
                    StagedLine(
                        menuId = menuId.toString(),
                        quantity = item.optInt("quantity", 1).coerceIn(1, 99),
                        optionIds = optionIds,
                        note = item.optString("comment").trim(),
                    ),
                )
            }
        }

        if (
            payload.optBoolean("force_new_check", false) &&
            draftForTable(tableId) == null
        ) {
            val firstMenuId = staged.firstOrNull()?.menuId
                ?: error("Add at least one item.")
            val currency = database.readableDatabase.query(
                "pmd_menu_items",
                arrayOf("currency"),
                "id = ? AND location_id = ? AND deleted = 0",
                arrayOf(firstMenuId, locationId.toString()),
                null,
                null,
                null,
                "1",
            ).use {
                if (it.moveToFirst()) it.getString(0) else "EUR"
            }

            database.transaction { db ->
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
                                .put("forced_new_check", true)
                                .toString(),
                        )
                        put("dirty", 1)
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                )
            }
        }

        var draft: DraftOrder? = draftForTable(tableId)

        staged.forEach { line ->
            repeat(line.quantity) {
                draft = addItem(
                    locationId = locationId,
                    tableId = tableId,
                    menuItemId = line.menuId,
                    selectedOptionIds = line.optionIds,
                    note = line.note,
                )
            }
        }

        val ready = draft ?: error("Order draft could not be created.")
        return setDraftMeta(
            ready.localId,
            payload.optInt("guest_count", ready.guestCount).coerceIn(1, 99),
            payload.optString("note", ready.note),
        ) ?: error("Order draft could not be updated.")
    }

    fun pseudoOrderId(localId: String): Long {
        val value = localId.hashCode().toLong().let {
            if (it == Long.MIN_VALUE) 1L else kotlin.math.abs(it)
        }.coerceAtLeast(1L)
        return -value
    }

    fun tableForPseudoOrderId(pseudoOrderId: Long): String? {
        if (pseudoOrderId >= 0L) return null

        return database.readableDatabase.query(
            "pmd_orders",
            arrayOf("id", "table_id"),
            "server_id IS NULL AND status IN (?, ?, ?, ?)",
            arrayOf(
                STATUS_DRAFT,
                STATUS_QUEUED,
                STATUS_RETRY,
                STATUS_CONFLICT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "250",
        ).use { rows ->
            while (rows.moveToNext()) {
                val localId = rows.getString(0)
                if (pseudoOrderId(localId) == pseudoOrderId) {
                    return@use rows.getString(1)
                }
            }
            null
        }
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

        val clientCreatedAtMs = System.currentTimeMillis()
        val payload = JSONObject()
            .put("table_id", draft.tableId.toLongOrNull() ?: error("Invalid table id."))
            .put("client_created_at_ms", clientCreatedAtMs)
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
            nowMs = clientCreatedAtMs,
        )
    }

    fun buildCashPaymentForQueuedOrder(
        tableId: String,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
        cashReceivedMinor: Long,
    ): CommandEnvelope {
        val work = localWorkForTable(tableId)
            ?: error("No local check is waiting to sync.")
        require(
            work.status == STATUS_QUEUED ||
                work.status == STATUS_RETRY
        ) {
            "Send the current check before recording payment."
        }

        val bill = billForTable(tableId)
            ?: error("No open bill is available.")
        require(bill.paymentQueuedMinor <= 0L) {
            "Cash is already saved for this check."
        }

        val dueMinor = maxOf(
            0L,
            bill.projectedTotalMinor - bill.settledMinor,
        )
        require(dueMinor > 0L) {
            "This bill has no remaining balance."
        }
        require(cashReceivedMinor >= dueMinor) {
            "Cash received is lower than the amount due."
        }

        val exponent = localMinorExponent()
        val payload = JSONObject()
            .put("table_id", tableId.toLongOrNull() ?: 0L)
            .put("split_mode", "full")
            .put("expected_remaining", minorToMoney(dueMinor, exponent))
            .put("cash_received", minorToMoney(cashReceivedMinor, exponent))
            .put("tip_amount", 0)
            .put("quick_pos_fast", true)

        val aggregateId = if (work.serverId.isNullOrBlank()) {
            "local:" + work.localId
        } else {
            payload.put("order_id", work.serverId.toLong())
            "order:" + work.serverId
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = work.locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = aggregateId,
            // The queued SEND/HOLD owns the next aggregate version first.
            baseVersion = work.version + 1,
            commandType = "CASH_PAYMENT_V1",
            payloadJson = payload.toString(),
        )
    }

    fun localWorkUpdatedAtMs(tableId: String): Long =
        database.readableDatabase.query(
            "pmd_orders",
            arrayOf("updated_at_ms"),
            "table_id = ? AND status IN (?, ?, ?, ?)",
            arrayOf(
                tableId,
                STATUS_DRAFT,
                STATUS_QUEUED,
                STATUS_RETRY,
                STATUS_CONFLICT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use { rows ->
            if (rows.moveToFirst()) rows.getLong(0) else 0L
        }

    fun pendingLocalOrders(
        locationId: Long,
    ): List<Pair<DraftOrder, Long>> =
        database.readableDatabase.query(
            "pmd_orders",
            arrayOf("id", "updated_at_ms"),
            "location_id = ? AND status IN (?, ?, ?)",
            arrayOf(
                locationId.toString(),
                STATUS_QUEUED,
                STATUS_RETRY,
                STATUS_CONFLICT,
            ),
            null,
            null,
            "updated_at_ms DESC",
            "500",
        ).use { rows ->
            buildList {
                while (rows.moveToNext()) {
                    val localId = rows.getString(0)
                    val updatedAt = rows.getLong(1)
                    val draft = runCatching {
                        database.readableDatabase.query(
                            "pmd_orders",
                            null,
                            "id = ?",
                            arrayOf(localId),
                            null,
                            null,
                            null,
                            "1",
                        ).use { orderRows ->
                            if (!orderRows.moveToFirst()) null
                            else orderRows.toDraftHeader()
                        }?.copy(lines = lines(localId))
                    }.getOrNull() ?: continue
                    add(draft to updatedAt)
                }
            }
        }

    fun buildCashPaymentCommandForOrder(
        orderId: Long,
        tableId: String,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
        cashReceivedMinor: Long,
    ): CommandEnvelope {
        val bill = billForServerOrder(orderId)
            ?: error("No open bill is available for this check.")
        require(bill.paymentQueuedMinor <= 0L) {
            "Cash is already saved for this check."
        }

        val dueMinor = bill.remainingMinor
        require(dueMinor > 0L) {
            "This bill has no remaining balance."
        }
        require(cashReceivedMinor >= dueMinor) {
            "Cash received is lower than the amount due."
        }

        val exponent = localMinorExponent()
        val payload = JSONObject()
            .put("order_id", orderId)
            .put("table_id", tableId.toLongOrNull() ?: 0L)
            .put("split_mode", "full")
            .put("expected_remaining", minorToMoney(dueMinor, exponent))
            .put("cash_received", minorToMoney(cashReceivedMinor, exponent))
            .put("tip_amount", 0)
            .put("quick_pos_fast", true)

        bill.serverUpdatedAt?.let {
            payload.put("expected_updated_at", it)
        }

        val locationId = database.readableDatabase.query(
            "pmd_orders",
            arrayOf("location_id"),
            "server_id = ?",
            arrayOf(orderId.toString()),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use {
            if (it.moveToFirst()) it.getLong(0)
            else error("Restaurant location is unavailable.")
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = "order:$orderId",
            baseVersion = bill.version,
            commandType = "CASH_PAYMENT_V1",
            payloadJson = payload.toString(),
        )
    }

    fun buildCashPaymentCommand(
        tableId: String,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
        cashReceivedMinor: Long,
    ): CommandEnvelope {
        require(draftForTable(tableId) == null) {
            "Send the current cart before recording payment."
        }

        val bill = billForTable(tableId)
            ?: error("No open bill is available for this table.")
        val serverId = bill.serverId
            ?.toLongOrNull()
            ?.takeIf { it > 0 }
            ?: error("Sync this bill to Cloud before recording payment.")
        require(bill.paymentQueuedMinor <= 0L) {
            "A cash payment is already queued for this bill."
        }

        val dueMinor = bill.remainingMinor
        require(dueMinor > 0L) {
            "This bill has no remaining balance."
        }
        require(cashReceivedMinor >= dueMinor) {
            "Cash received is lower than the amount due."
        }

        val exponent = localMinorExponent()
        val payload = JSONObject()
            .put("order_id", serverId)
            .put("table_id", tableId.toLongOrNull() ?: 0L)
            .put("split_mode", "full")
            .put("expected_remaining", minorToMoney(dueMinor, exponent))
            .put("cash_received", minorToMoney(cashReceivedMinor, exponent))
            .put("tip_amount", 0)
            .put("quick_pos_fast", true)

        bill.serverUpdatedAt?.let {
            payload.put("expected_updated_at", it)
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = database.readableDatabase.query(
                "pmd_orders",
                arrayOf("location_id"),
                "server_id = ?",
                arrayOf(serverId.toString()),
                null,
                null,
                "updated_at_ms DESC",
                "1",
            ).use {
                if (it.moveToFirst()) it.getLong(0)
                else error("Restaurant location is unavailable.")
            },
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = "order:$serverId",
            baseVersion = bill.version,
            commandType = "CASH_PAYMENT_V1",
            payloadJson = payload.toString(),
        )
    }

    /**
     * Canonical Quick POS lets Pay send an unsent cart first. Offline does the
     * same by queuing two ordered intents on the same aggregate: SEND, then
     * full CASH settlement. The cash command is Cloud-only and receives the
     * canonical order id from cloudRoutingForCommand after SEND succeeds.
     */
    fun buildCashPaymentAfterSendCommand(
        draft: DraftOrder,
        sendCommand: CommandEnvelope,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
        cashReceivedMinor: Long,
    ): Pair<CommandEnvelope, Long> {
        require(draft.status == STATUS_DRAFT && draft.lines.isNotEmpty()) {
            "Add items before using Pay."
        }
        require(sendCommand.commandType == "ORDER_SEND_V1") {
            "Cash settlement must follow a Send command."
        }

        val bill = billForTable(draft.tableId)
            ?: error("Local bill is unavailable.")
        require(bill.paymentQueuedMinor <= 0L) {
            "A cash payment is already queued for this bill."
        }

        val dueMinor = maxOf(
            0L,
            bill.projectedTotalMinor - bill.settledMinor,
        )
        require(dueMinor > 0L) {
            "This bill has no remaining balance."
        }
        require(cashReceivedMinor >= dueMinor) {
            "Cash received is lower than the amount due."
        }

        val exponent = localMinorExponent()
        val payload = JSONObject()
            .put(
                "table_id",
                draft.tableId.toLongOrNull() ?: error("Invalid table id."),
            )
            .put("split_mode", "full")
            .put("expected_remaining", minorToMoney(dueMinor, exponent))
            .put("cash_received", minorToMoney(cashReceivedMinor, exponent))
            .put("tip_amount", 0)
            .put("quick_pos_fast", true)

        if (!draft.serverId.isNullOrBlank()) {
            payload.put("order_id", draft.serverId.toLong())
        }

        val payment = CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = draft.locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "order",
            aggregateId = sendCommand.aggregateId,
            // SEND owns version N -> N+1. The following cash intent therefore
            // starts at N+1. Local aggregates are additionally rewritten to
            // the canonical Cloud version after SEND receives its server id.
            baseVersion = draft.version + 1,
            commandType = "CASH_PAYMENT_V1",
            payloadJson = payload.toString(),
            nowMs = maxOf(
                System.currentTimeMillis(),
                sendCommand.createdAtMs + 1,
            ),
        )

        return payment to dueMinor
    }

    fun markCashPaymentQueuedForServerOrder(
        orderId: Long,
        commandId: String,
        amountMinor: Long,
    ) {
        markCashPaymentQueuedWhere(
            selection = "server_id = ?",
            args = arrayOf(orderId.toString()),
            commandId = commandId,
            amountMinor = amountMinor,
        )
    }

    fun markCashPaymentQueuedForLocalOrder(
        localId: String,
        commandId: String,
        amountMinor: Long,
    ) {
        markCashPaymentQueuedWhere(
            selection = "id = ?",
            args = arrayOf(localId),
            commandId = commandId,
            amountMinor = amountMinor,
        )
    }

    private fun markCashPaymentQueuedWhere(
        selection: String,
        args: Array<String>,
        commandId: String,
        amountMinor: Long,
    ) {
        database.transaction { db ->
            val row = db.query(
                "pmd_orders",
                arrayOf("id", "payload_json"),
                selection,
                args,
                null,
                null,
                "updated_at_ms DESC",
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else it.getString(0) to it.getString(1)
            } ?: error("Open bill disappeared.")

            val meta = runCatching {
                JSONObject(row.second)
            }.getOrElse { JSONObject() }
            meta.put("offline_cash_command_id", commandId)
            meta.put("offline_cash_queued_minor", amountMinor)
            meta.remove("reconciliation_error")

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(row.first),
            )
        }
    }

    fun markCashPaymentQueued(
        tableId: String,
        commandId: String,
        amountMinor: Long,
    ) {
        database.transaction { db ->
            val row = db.query(
                "pmd_orders",
                arrayOf("id", "payload_json"),
                "table_id = ?",
                arrayOf(tableId),
                null,
                null,
                "updated_at_ms DESC",
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else it.getString(0) to it.getString(1)
            } ?: error("Open bill disappeared.")

            val meta = runCatching {
                JSONObject(row.second)
            }.getOrElse { JSONObject() }
            meta.put("offline_cash_command_id", commandId)
            meta.put("offline_cash_queued_minor", amountMinor)
            meta.remove("reconciliation_error")

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(row.first),
            )
        }
    }

    fun markCashPaymentConflict(
        command: CommandEnvelope,
        message: String,
    ) {
        val serverId = command.aggregateId
            .takeIf { it.startsWith("order:") }
            ?.removePrefix("order:")
            ?.toLongOrNull()
            ?: 0L
        val localId = resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = serverId,
        ) ?: return

        database.transaction { db ->
            val row = db.query(
                "pmd_orders",
                arrayOf("id", "payload_json"),
                "id = ?",
                arrayOf(localId),
                null,
                null,
                null,
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else it.getString(0) to it.getString(1)
            } ?: return@transaction

            val meta = runCatching {
                JSONObject(row.second)
            }.getOrElse { JSONObject() }
            meta.remove("offline_cash_queued_minor")
            meta.remove("offline_cash_command_id")
            meta.put("reconciliation_error", message.take(1_000))

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(row.first),
            )
        }
    }

    fun buildTableStateCommand(
        tableId: String,
        status: String,
        skipCleaning: Boolean,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
    ): CommandEnvelope {
        val normalized = status.trim().lowercase()
        require(normalized in setOf("available", "occupied", "cleaning", "reserved")) {
            "Unsupported table status."
        }

        val row = database.readableDatabase.query(
            "pmd_tables",
            arrayOf("location_id", "version", "status"),
            "id = ?",
            arrayOf(tableId),
            null,
            null,
            null,
            "1",
        ).use {
            if (!it.moveToFirst()) error("Table is unavailable.")
            Triple(it.getLong(0), it.getLong(1), it.getString(2))
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = row.first,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "table",
            aggregateId = "table:$tableId",
            baseVersion = row.second,
            commandType = "TABLE_STATE_V1",
            payloadJson = JSONObject()
                .put("table_id", tableId.toLongOrNull() ?: error("Invalid table id."))
                .put("status", normalized)
                .put("reason", "android_local_pos")
                .put("skip_cleaning", skipCleaning)
                .put("previous_status", row.third)
                .toString(),
        )
    }

    fun markTableStateQueued(
        tableId: String,
        status: String,
        commandId: String,
    ) {
        database.transaction { db ->
            val raw = db.query(
                "pmd_tables",
                arrayOf("payload_json", "status"),
                "id = ?",
                arrayOf(tableId),
                null,
                null,
                null,
                "1",
            ).use {
                if (!it.moveToFirst()) error("Table is unavailable.")
                it.getString(0) to it.getString(1)
            }
            val payload = runCatching {
                JSONObject(raw.first)
            }.getOrElse { JSONObject() }
            payload.put("pending_table_command_id", commandId)
            payload.put("pending_previous_status", raw.second)
            payload.put("pending_status", status)

            db.update(
                "pmd_tables",
                ContentValues().apply {
                    put("status", status)
                    put("payload_json", payload.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(tableId),
            )
        }
    }

    fun buildTableMoveCommand(
        sourceTableId: String,
        targetTableId: String,
        scope: String,
        tenantHost: String,
        deviceId: String,
        staffId: Long?,
        userId: Long?,
    ): CommandEnvelope {
        val normalizedScope = scope.trim().lowercase()
        require(normalizedScope in setOf("order", "table")) {
            "Move scope must be order or table."
        }
        require(sourceTableId != targetTableId) {
            "Choose a different destination table."
        }
        require(draftForTable(sourceTableId) == null) {
            "Send the current cart before moving this table."
        }

        data class TableMeta(
            val locationId: Long,
            val version: Long,
            val status: String,
        )

        fun tableMeta(id: String): TableMeta =
            database.readableDatabase.query(
                "pmd_tables",
                arrayOf("location_id", "version", "status"),
                "id = ?",
                arrayOf(id),
                null,
                null,
                null,
                "1",
            ).use {
                if (!it.moveToFirst()) error("Table is unavailable.")
                TableMeta(it.getLong(0), it.getLong(1), it.getString(2))
            }

        val source = tableMeta(sourceTableId)
        val target = tableMeta(targetTableId)
        require(source.locationId == target.locationId) {
            "Tables belong to different restaurant locations."
        }

        val sourceBill = billForTable(sourceTableId)
            ?: error("There is no open check to move.")
        val orderId = sourceBill.serverId
            ?.toLongOrNull()
            ?.takeIf { it > 0 }
            ?: error("Sync the open check before moving it.")

        if (normalizedScope == "table") {
            val uncanonical = database.readableDatabase.rawQuery(
                """SELECT COUNT(*) FROM pmd_orders
                   WHERE table_id = ? AND server_id IS NULL""",
                arrayOf(sourceTableId),
            ).use { if (it.moveToFirst()) it.getInt(0) else 0 }
            require(uncanonical == 0) {
                "Sync every local check before moving the whole table."
            }
        }

        return CommandEnvelope.create(
            tenantHost = tenantHost,
            locationId = source.locationId,
            deviceId = deviceId,
            staffId = staffId,
            userId = userId,
            aggregate = "table",
            aggregateId = "table:$sourceTableId",
            baseVersion = source.version,
            commandType = "TABLE_MOVE_V1",
            payloadJson = JSONObject()
                .put("source_table_id", sourceTableId.toLong())
                .put("target_table_id", targetTableId.toLong())
                .put("scope", normalizedScope)
                .put(
                    "order_id",
                    if (normalizedScope == "order") orderId
                    else JSONObject.NULL,
                )
                .put("source_status_before", source.status)
                .put("target_status_before", target.status)
                .toString(),
        )
    }

    fun markTableMoveQueued(
        sourceTableId: String,
        targetTableId: String,
        scope: String,
        orderId: Long?,
        commandId: String,
    ) {
        database.transaction { db ->
            fun updateTable(
                id: String,
                status: String,
                otherId: String,
            ) {
                val row = db.query(
                    "pmd_tables",
                    arrayOf("payload_json", "status"),
                    "id = ?",
                    arrayOf(id),
                    null,
                    null,
                    null,
                    "1",
                ).use {
                    if (!it.moveToFirst()) return
                    it.getString(0) to it.getString(1)
                }
                val payload = runCatching {
                    JSONObject(row.first)
                }.getOrElse { JSONObject() }
                payload.put("pending_table_command_id", commandId)
                payload.put("pending_previous_status", row.second)
                payload.put("pending_move_other_table", otherId)
                db.update(
                    "pmd_tables",
                    ContentValues().apply {
                        put("status", status)
                        put("payload_json", payload.toString())
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                    "id = ?",
                    arrayOf(id),
                )
            }

            updateTable(
                sourceTableId,
                if (scope == "table") "available" else "occupied",
                targetTableId,
            )
            updateTable(targetTableId, "occupied", sourceTableId)

            if (scope == "order" && orderId != null && orderId > 0) {
                db.update(
                    "pmd_orders",
                    ContentValues().apply {
                        put("table_id", targetTableId)
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                    "server_id = ?",
                    arrayOf(orderId.toString()),
                )
            } else {
                db.update(
                    "pmd_orders",
                    ContentValues().apply {
                        put("table_id", targetTableId)
                        put("updated_at_ms", System.currentTimeMillis())
                    },
                    "table_id = ?",
                    arrayOf(sourceTableId),
                )
            }
        }
    }

    fun applyTableCommandResult(
        command: CommandEnvelope,
        response: JSONObject,
    ) {
        val result = response.optJSONObject("result") ?: return
        val version = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )

        if (command.commandType == "TABLE_STATE_V1") {
            val tableId = result.optLong("table_id", 0L).toString()
            val status = result.optString("status").trim().lowercase()
            if (tableId == "0" || status.isBlank()) return
            applyCanonicalTableState(tableId, status, version)
            return
        }

        if (command.commandType == "TABLE_MOVE_V1") {
            val sourceId = result.optLong("source_table_id", 0L).toString()
            val targetId = result.optLong("target_table_id", 0L).toString()
            if (sourceId == "0" || targetId == "0") return

            applyCanonicalTableState(
                sourceId,
                result.optString("source_status", "available"),
                version,
            )
            applyCanonicalTableState(
                targetId,
                result.optString("target_status", "occupied"),
                null,
            )
        }
    }

    fun applyTableEvent(
        eventType: String,
        payload: JSONObject,
        version: Long,
    ) {
        val table = payload.optJSONObject("table") ?: return
        when (eventType) {
            "TABLE_STATE_CHANGED_V1" -> {
                val tableId = table.optLong("table_id", 0L)
                val status = table.optString("status")
                if (tableId > 0 && status.isNotBlank()) {
                    applyCanonicalTableState(
                        tableId.toString(),
                        status,
                        version,
                    )
                }
            }
            "TABLE_MOVED_V1" -> {
                val sourceId = table.optLong("source_table_id", 0L)
                val targetId = table.optLong("target_table_id", 0L)
                if (sourceId > 0) {
                    applyCanonicalTableState(
                        sourceId.toString(),
                        table.optString("source_status", "available"),
                        version,
                    )
                }
                if (targetId > 0) {
                    applyCanonicalTableState(
                        targetId.toString(),
                        table.optString("target_status", "occupied"),
                        null,
                    )
                }
            }
        }
    }

    fun markTableCommandConflict(
        command: CommandEnvelope,
        message: String,
    ) {
        val payload = runCatching {
            JSONObject(command.payloadJson)
        }.getOrElse { JSONObject() }

        if (command.commandType == "TABLE_STATE_V1") {
            val tableId = payload.optLong("table_id", 0L)
            val previous = payload.optString(
                "previous_status",
                "available",
            )
            if (tableId > 0) {
                revertTableState(
                    tableId.toString(),
                    previous,
                    message,
                )
            }
            return
        }

        if (command.commandType == "TABLE_MOVE_V1") {
            val sourceId = payload.optLong("source_table_id", 0L)
            val targetId = payload.optLong("target_table_id", 0L)
            val sourceStatus = payload.optString(
                "source_status_before",
                "occupied",
            )
            val targetStatus = payload.optString(
                "target_status_before",
                "available",
            )
            if (sourceId > 0) {
                revertTableState(
                    sourceId.toString(),
                    sourceStatus,
                    message,
                )
            }
            if (targetId > 0) {
                revertTableState(
                    targetId.toString(),
                    targetStatus,
                    message,
                )
            }

            val scope = payload.optString("scope", "order")
            val orderId = payload.optLong("order_id", 0L)
            database.writableDatabase.update(
                "pmd_orders",
                ContentValues().apply {
                    put("table_id", sourceId.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                if (scope == "order" && orderId > 0) {
                    "server_id = ?"
                } else {
                    "table_id = ?"
                },
                arrayOf(
                    if (scope == "order" && orderId > 0) {
                        orderId.toString()
                    } else {
                        targetId.toString()
                    },
                ),
            )
        }
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

    fun cloudRoutingForCommand(
        command: CommandEnvelope,
    ): CloudCommandRouting? {
        if (!command.aggregateId.startsWith("local:")) return null

        val localId = resolveLocalOrderId(
            aggregateId = command.aggregateId,
            serverOrderId = 0,
        ) ?: return null

        return database.readableDatabase.query(
            "pmd_orders",
            arrayOf("server_id", "version", "payload_json"),
            "id = ?",
            arrayOf(localId),
            null,
            null,
            null,
            "1",
        ).use { rows ->
            if (!rows.moveToFirst() || rows.isNull(0)) {
                null
            } else {
                val serverOrderId = rows.getString(0)
                    .toLongOrNull()
                    ?: return@use null
                if (serverOrderId < 1) return@use null

                val meta = runCatching {
                    JSONObject(rows.getString(2))
                }.getOrElse { JSONObject() }

                CloudCommandRouting(
                    serverOrderId = serverOrderId,
                    serverVersion = rows.getLong(1).coerceAtLeast(0),
                    expectedUpdatedAt = meta
                        .optString("server_updated_at")
                        .trim()
                        .takeIf { it.isNotBlank() },
                )
            }
        }
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
        if (command.commandType == "CASH_PAYMENT_V1") {
            applyCashPaymentResult(command, response, result)
            return
        }
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
            if (order.has("settled_amount")) {
                meta.put(
                    "settled_amount_minor",
                    moneyToMinor(
                        order.optDouble("settled_amount", 0.0),
                        localMinorExponent(),
                    ),
                )
            }
            if (order.has("settlement_status")) {
                meta.put(
                    "settlement_status",
                    order.optString("settlement_status"),
                )
            }
            if (
                eventCommandId.isNotBlank() &&
                eventCommandId == meta.optString("offline_cash_command_id")
            ) {
                meta.remove("offline_cash_command_id")
                meta.remove("offline_cash_queued_minor")
                meta.remove("reconciliation_error")
            }
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

    private fun applyCanonicalTableState(
        tableId: String,
        status: String,
        version: Long?,
    ) {
        database.transaction { db ->
            val raw = db.query(
                "pmd_tables",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(tableId),
                null,
                null,
                null,
                "1",
            ).use {
                if (it.moveToFirst()) it.getString(0) else "{}"
            }
            val payload = runCatching {
                JSONObject(raw)
            }.getOrElse { JSONObject() }
            payload.remove("pending_table_command_id")
            payload.remove("pending_previous_status")
            payload.remove("pending_status")
            payload.remove("pending_move_other_table")
            payload.remove("reconciliation_error")

            db.update(
                "pmd_tables",
                ContentValues().apply {
                    put("status", status.trim().lowercase())
                    if (version != null) put("version", version)
                    put("payload_json", payload.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(tableId),
            )
        }
    }

    private fun revertTableState(
        tableId: String,
        status: String,
        message: String,
    ) {
        database.transaction { db ->
            val raw = db.query(
                "pmd_tables",
                arrayOf("payload_json"),
                "id = ?",
                arrayOf(tableId),
                null,
                null,
                null,
                "1",
            ).use {
                if (it.moveToFirst()) it.getString(0) else "{}"
            }
            val payload = runCatching {
                JSONObject(raw)
            }.getOrElse { JSONObject() }
            payload.remove("pending_table_command_id")
            payload.remove("pending_previous_status")
            payload.remove("pending_status")
            payload.remove("pending_move_other_table")
            payload.put("reconciliation_error", message.take(1_000))

            db.update(
                "pmd_tables",
                ContentValues().apply {
                    put("status", status.trim().lowercase())
                    put("payload_json", payload.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(tableId),
            )
        }
    }

    private fun applyCashPaymentResult(
        command: CommandEnvelope,
        response: JSONObject,
        result: JSONObject,
    ) {
        val orderId = result.optLong("order_id", 0L)
        if (orderId < 1) return
        val version = response.optLong(
            "aggregate_version",
            command.baseVersion + 1,
        )
        val totalMinor = moneyToMinor(
            result.optDouble("order_total", 0.0),
            localMinorExponent(),
        )
        val settledMinor = moneyToMinor(
            result.optDouble("settled_amount", 0.0),
            localMinorExponent(),
        )

        database.transaction { db ->
            val row = db.query(
                "pmd_orders",
                arrayOf("id", "payload_json"),
                "server_id = ?",
                arrayOf(orderId.toString()),
                null,
                null,
                "updated_at_ms DESC",
                "1",
            ).use {
                if (!it.moveToFirst()) null
                else it.getString(0) to it.getString(1)
            } ?: return@transaction

            val meta = runCatching {
                JSONObject(row.second)
            }.getOrElse { JSONObject() }
            meta.put("base_total_minor", totalMinor)
            meta.put("settled_amount_minor", settledMinor)
            meta.put(
                "settlement_status",
                result.optString("settlement_status"),
            )
            meta.put("server_updated_at", result.optString("updated_at"))
            meta.put("last_command_id", command.commandId)
            meta.remove("offline_cash_queued_minor")
            meta.remove("offline_cash_command_id")
            meta.remove("reconciliation_error")

            db.update(
                "pmd_orders",
                ContentValues().apply {
                    put("version", version)
                    put("total_minor", totalMinor)
                    put("status", STATUS_SERVER_OPEN)
                    put("dirty", 0)
                    put("payload_json", meta.toString())
                    put("updated_at_ms", System.currentTimeMillis())
                },
                "id = ?",
                arrayOf(row.first),
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

    private fun minorToMoney(
        value: Long,
        exponent: Int,
    ): Double = value.toDouble() / Math.pow(10.0, exponent.toDouble())

    companion object {
        private const val QPOS_UI_DRAFT_KEY = "qpos_ui_draft_v18"

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
