package com.paymydine.mobile.data.local

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.math.RoundingMode

data class BootstrapSummary(
    val locationId: Long,
    val locationName: String,
    val roleCode: String,
    val menuItems: Int,
    val tables: Int,
    val openOrders: Int,
    val kdsStations: Int,
    val cursor: Long,
)

class BootstrapRepository(private val database: PmdDatabase) {
    /**
     * PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_SNAPSHOT_V23
     *
     * A reconnect bootstrap is not allowed to replace a healthy local floor/menu
     * with a transiently empty response. Cold/pair bootstrap remains strict;
     * reconnect callers opt into preserving only critical non-empty sections.
     */
    fun apply(
        root: JSONObject,
        preserveCriticalOnEmpty: Boolean = false,
    ): BootstrapSummary {
        check(root.optBoolean("ok")) { "Bootstrap payload is not successful." }

        val appliedRoot = if (preserveCriticalOnEmpty) {
            mergeCriticalSnapshot(root)
        } else {
            JSONObject(root.toString())
        }

        val location = appliedRoot.getJSONObject("location")
        val identity = appliedRoot.getJSONObject("identity")
        val menu = appliedRoot.optJSONObject("menu") ?: JSONObject()
        val items = menu.optJSONArray("items") ?: JSONArray()
        val tables = appliedRoot.optJSONArray("tables") ?: JSONArray()
        val openOrders = appliedRoot.optJSONArray("open_orders") ?: JSONArray()
        val stations = appliedRoot.optJSONArray("kds_stations") ?: JSONArray()
        val sync = appliedRoot.optJSONObject("sync") ?: JSONObject()

        val locationId = location.getLong("id")
        val currency = location.optString("currency_code", "EUR").ifBlank { "EUR" }
        val exponent = location.optInt("currency_minor_exponent", 2).coerceIn(0, 4)
        val now = System.currentTimeMillis()

        database.transaction { db ->
            db.delete("pmd_menu_items", "location_id = ?", arrayOf(locationId.toString()))
            db.delete("pmd_tables", "location_id = ?", arrayOf(locationId.toString()))

            // Refresh only canonical server shadows. Never delete a dirty local
            // draft/outbox order while applying a newer bootstrap.
            db.delete(
                "pmd_orders",
                "location_id = ? AND status = ? AND dirty = 0",
                arrayOf(locationId.toString(), STATUS_SERVER_OPEN),
            )
            db.delete(
                "pmd_edge_orders",
                "location_id = ? AND status = ?",
                arrayOf(locationId.toString(), EDGE_STATUS_CLOUD_OPEN),
            )

            db.delete(
                "pmd_kds_stations",
                "location_id = ? OR location_id IS NULL",
                arrayOf(locationId.toString()),
            )

            for (index in 0 until items.length()) {
                val item = items.getJSONObject(index)
                val categories = item.optJSONArray("category_ids")
                val firstCategory = if (categories != null && categories.length() > 0) {
                    categories.opt(0)?.toString()
                } else null

                db.insertOrThrow(
                    "pmd_menu_items",
                    null,
                    ContentValues().apply {
                        put("id", item.get("id").toString())
                        put("location_id", locationId)
                        put("version", 0)
                        put("name", item.optString("name"))
                        put("price_minor", toMinor(item.opt("price"), exponent))
                        put("currency", currency)
                        if (firstCategory == null) putNull("category_id") else put("category_id", firstCategory)
                        put("sort_order", index)
                        put("payload_json", item.toString())
                        put("deleted", 0)
                        put("updated_at_ms", now)
                    },
                )
            }

            for (index in 0 until tables.length()) {
                val table = tables.getJSONObject(index)
                db.insertOrThrow(
                    "pmd_tables",
                    null,
                    ContentValues().apply {
                        put("id", table.get("id").toString())
                        put("location_id", locationId)
                        put("version", table.optLong("aggregate_version", 0L))
                        put("number", table.optString("number"))
                        put("label", table.optString("name", table.optString("number")))
                        put("status", table.optString("operational_status", "available"))
                        put("sort_order", index)
                        put("payload_json", table.toString())
                        put("updated_at_ms", now)
                    },
                )
            }

            for (index in 0 until openOrders.length()) {
                val order = openOrders.getJSONObject(index)
                val orderId = order.optLong("order_id", 0)
                val tableId = order.optLong("table_id", 0)
                if (orderId < 1 || tableId < 1) continue

                val aggregateId = order.optString(
                    "aggregate_id",
                    "order:$orderId",
                ).ifBlank { "order:$orderId" }
                val version = order.optLong("aggregate_version", 0)
                val totalMinor = toMinor(order.opt("order_total"), exponent)
                val serverUpdatedAt = order.optString("updated_at")
                val state = JSONObject()
                    .put("server_updated_at", serverUpdatedAt)
                    .put("base_total_minor", totalMinor)
                    .put("guest_count", order.optInt("guest_count", 1).coerceIn(1, 99))
                    .put("note", order.optString("comment"))
                    .put("status_name", order.optString("status_name"))
                    .put("settlement_status", order.optString("settlement_status", "unpaid"))
                    .put(
                        "settled_amount_minor",
                        toMinor(order.opt("settled_amount"), exponent),
                    )

                val localShadowId = "server:$orderId"
                val hasPendingLocalChange = db.query(
                    "pmd_orders",
                    arrayOf("id"),
                    "(id = ? OR server_id = ?) AND dirty = 1",
                    arrayOf(localShadowId, orderId.toString()),
                    null,
                    null,
                    null,
                    "1",
                ).use { it.moveToFirst() }

                if (!hasPendingLocalChange) {
                    db.insertWithOnConflict(
                        "pmd_orders",
                        null,
                        ContentValues().apply {
                            put("id", localShadowId)
                            put("location_id", locationId)
                            put("version", version)
                            put("server_id", orderId.toString())
                            put("table_id", tableId.toString())
                            put("status", STATUS_SERVER_OPEN)
                            put("total_minor", totalMinor)
                            put("currency", currency)
                            put("payload_json", state.toString())
                            put("dirty", 0)
                            put("updated_at_ms", now)
                        },
                        SQLiteDatabase.CONFLICT_REPLACE,
                    )
                }

                // A device that later becomes Restaurant Edge must already know
                // existing Cloud orders, otherwise it would reject safe offline
                // continuation for a table that was opened while online.
                val edgeState = JSONObject()
                    .put("aggregate_id", aggregateId)
                    .put("table_id", tableId.toString())
                    .put("server_order_id", orderId)
                    .put("server_aggregate_id", aggregateId)
                    .put("server_aggregate_version", version)
                    .put("server_updated_at", serverUpdatedAt)
                    .put("guest_count", order.optInt("guest_count", 1).coerceIn(1, 99))
                    .put("note", order.optString("comment"))
                    // PMD_ANDROID_EDGE_OPEN_ORDER_ITEMS_V18
                    // Existing Cloud checks keep their sent line projection on
                    // the Restaurant Edge as well as in the tablet bootstrap.
                    .put(
                        "items",
                        order.optJSONArray("items")
                            ?.let { JSONArray(it.toString()) }
                            ?: JSONArray(),
                    )
                    .put("status_id", order.optLong("status_id", 0))
                    .put("status_name", order.optString("status_name"))
                    .put("created_at_ms", now)
                    .put("created_at", serverUpdatedAt)
                    .put("status_updated_at", serverUpdatedAt)

                val existingEdgeStatus = db.query(
                    "pmd_edge_orders",
                    arrayOf("status"),
                    "aggregate_id = ?",
                    arrayOf(aggregateId),
                    null,
                    null,
                    null,
                    "1",
                ).use {
                    if (it.moveToFirst()) it.getString(0) else null
                }

                // Never overwrite provisional Edge state during reconnect.
                // Pending Edge commands still need their exact local version and
                // accumulated items until Cloud reconciliation completes.
                if (
                    existingEdgeStatus == null ||
                    existingEdgeStatus == EDGE_STATUS_CLOUD_OPEN
                ) {
                    db.insertWithOnConflict(
                        "pmd_edge_orders",
                        null,
                        ContentValues().apply {
                            put("aggregate_id", aggregateId)
                            put("location_id", locationId)
                            put("table_id", tableId.toString())
                            put("status", EDGE_STATUS_CLOUD_OPEN)
                            put("version", version)
                            put("total_minor", totalMinor)
                            put("currency", currency)
                            put("payload_json", edgeState.toString())
                            put("created_at_ms", now)
                            put("updated_at_ms", now)
                        },
                        SQLiteDatabase.CONFLICT_REPLACE,
                    )
                }
            }

            for (index in 0 until stations.length()) {
                val station = stations.getJSONObject(index)
                db.insertOrThrow(
                    "pmd_kds_stations",
                    null,
                    ContentValues().apply {
                        put("station_id", station.get("id").toString())
                        if (station.isNull("location_id")) putNull("location_id")
                        else put("location_id", station.optLong("location_id", locationId))
                        put("name", station.optString("name"))
                        put("slug", station.optString("slug"))
                        put("payload_json", station.toString())
                        put("updated_at_ms", now)
                    },
                )
            }

            // Re-project pending local work after every Cloud refresh so a
            // delayed server table status cannot make an active offline check
            // appear available again.
            db.query(
                "pmd_orders",
                arrayOf("table_id", "id"),
                "dirty = 1 AND status IN (?, ?, ?)",
                arrayOf(
                    LocalPosRepository.STATUS_QUEUED,
                    LocalPosRepository.STATUS_RETRY,
                    LocalPosRepository.STATUS_CONFLICT,
                ),
                null,
                null,
                "updated_at_ms DESC",
            ).use { pending ->
                while (pending.moveToNext()) {
                    val tableId = pending.getString(0)
                    val localOrderId = pending.getString(1)
                    val rawTable = db.query(
                        "pmd_tables",
                        arrayOf("payload_json"),
                        "id = ?",
                        arrayOf(tableId),
                        null,
                        null,
                        null,
                        "1",
                    ).use { tableRows ->
                        if (tableRows.moveToFirst()) tableRows.getString(0)
                        else null
                    } ?: continue

                    val tablePayload = runCatching {
                        JSONObject(rawTable)
                    }.getOrElse { JSONObject() }
                        .put("native_local_order_id", localOrderId)
                        .put("native_local_order_pending", true)

                    db.update(
                        "pmd_tables",
                        ContentValues().apply {
                            put("status", "occupied")
                            put("payload_json", tablePayload.toString())
                            put("updated_at_ms", now)
                        },
                        "id = ?",
                        arrayOf(tableId),
                    )
                }
            }

            putMeta(db, "bootstrap_json", appliedRoot.toString())
            putMeta(
                db,
                "tenant_host",
                appliedRoot.optJSONObject("tenant")?.optString("host").orEmpty(),
            )
            putMeta(db, "location_id", locationId.toString())
            putMeta(db, "role_code", identity.optString("role_code"))
            putMeta(db, "profile_expires_at", root.optString("profile_expires_at"))
            putMeta(
                db,
                "bootstrap_applied_at_ms",
                System.currentTimeMillis().toString(),
            )
            val serverTimeMs = appliedRoot.optLong("server_time_ms", 0L)
            if (serverTimeMs > 0L) {
                putMeta(db, "trusted_server_epoch_ms", serverTimeMs.toString())
                putMeta(
                    db,
                    "trusted_server_elapsed_ms",
                    SystemClock.elapsedRealtime().toString(),
                )
            }

            val cursor = sync.optLong("cursor", 0)
            db.insertWithOnConflict(
                "pmd_sync_cursor",
                null,
                ContentValues().apply {
                    put("scope", "restaurant")
                    put("cursor", cursor)
                },
                SQLiteDatabase.CONFLICT_REPLACE,
            )
        }

        return BootstrapSummary(
            locationId = locationId,
            locationName = location.optString("name"),
            roleCode = identity.optString("role_code"),
            menuItems = items.length(),
            tables = tables.length(),
            openOrders = openOrders.length(),
            kdsStations = stations.length(),
            cursor = sync.optLong("cursor", 0),
        )
    }

    /**
     * PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_UNION_V101
     *
     * Online bootstrap is a refresh hint, not permission to erase the durable
     * restaurant copy. Some reconnect responses are transiently partial while
     * tenant/session state is converging. Merge critical collections by stable
     * id so an omitted table/menu item cannot disappear from SQLite.
     *
     * Incoming rows still win for canonical mutable fields. For menu media
     * fields, blank/missing reconnect values never erase a previously usable
     * image reference; a later explicit media-deletion contract can own that.
     */
    private fun mergeCriticalSnapshot(incoming: JSONObject): JSONObject {
        val merged = JSONObject(incoming.toString())
        val previous = bootstrapSnapshot() ?: return merged

        val previousMenu = previous.optJSONObject("menu")
        val incomingMenu = merged.optJSONObject("menu")
        if (previousMenu != null) {
            val menu = overlayObject(
                previous = previousMenu,
                incoming = incomingMenu,
            )
            menu.put(
                "items",
                mergeRowsByIdentity(
                    previous = previousMenu.optJSONArray("items"),
                    incoming = incomingMenu?.optJSONArray("items"),
                    identityKeys = listOf("id"),
                    preserveBlankKeys = MENU_MEDIA_KEYS_V101,
                ),
            )
            merged.put("menu", menu)
        }

        merged.put(
            "tables",
            mergeRowsByIdentity(
                previous = previous.optJSONArray("tables"),
                incoming = merged.optJSONArray("tables"),
                identityKeys = listOf("id"),
            ),
        )

        val previousFloorMap = previous.optJSONObject("table_floor_map")
        val incomingFloorMap = merged.optJSONObject("table_floor_map")
        if (previousFloorMap != null) {
            merged.put(
                "table_floor_map",
                overlayObject(previousFloorMap, incomingFloorMap),
            )
        }

        val previousFloors = previous.optJSONArray("floors")
        if (previousFloors != null && previousFloors.length() > 0) {
            merged.put(
                "floors",
                mergeRowsByIdentity(
                    previous = previousFloors,
                    incoming = merged.optJSONArray("floors"),
                    identityKeys = listOf("id", "floor_id", "slug", "name"),
                ),
            )
        }

        for (key in listOf("default_floor_id", "active_floor_id")) {
            val current = merged.opt(key)
            if (isBlankJsonValue(current) && previous.has(key)) {
                merged.put(key, cloneJsonValue(previous.opt(key)))
            }
        }

        if (
            merged.optJSONObject("history") == null &&
            previous.optJSONObject("history") != null
        ) {
            merged.put(
                "history",
                JSONObject(previous.getJSONObject("history").toString()),
            )
        }

        return merged
    }

    private fun mergeRowsByIdentity(
        previous: JSONArray?,
        incoming: JSONArray?,
        identityKeys: List<String>,
        preserveBlankKeys: Set<String> = emptySet(),
    ): JSONArray {
        if (previous == null || previous.length() == 0) {
            return incoming?.let { JSONArray(it.toString()) } ?: JSONArray()
        }
        if (incoming == null || incoming.length() == 0) {
            return JSONArray(previous.toString())
        }

        val previousById = linkedMapOf<String, JSONObject>()
        val previousWithoutId = mutableListOf<JSONObject>()
        for (index in 0 until previous.length()) {
            val row = previous.optJSONObject(index) ?: continue
            val identity = jsonIdentity(row, identityKeys)
            if (identity == null) {
                previousWithoutId += JSONObject(row.toString())
            } else {
                previousById[identity] = JSONObject(row.toString())
            }
        }

        val result = JSONArray()
        val seen = mutableSetOf<String>()

        for (index in 0 until incoming.length()) {
            val incomingRow = incoming.optJSONObject(index) ?: continue
            val identity = jsonIdentity(incomingRow, identityKeys)
            if (identity == null) {
                result.put(JSONObject(incomingRow.toString()))
                continue
            }

            val oldRow = previousById[identity]
            result.put(
                overlayObject(
                    previous = oldRow,
                    incoming = incomingRow,
                    preserveBlankKeys = preserveBlankKeys,
                ),
            )
            seen += identity
        }

        previousById.forEach { (identity, row) ->
            if (identity !in seen) result.put(JSONObject(row.toString()))
        }
        previousWithoutId.forEach { result.put(JSONObject(it.toString())) }

        return result
    }

    private fun overlayObject(
        previous: JSONObject?,
        incoming: JSONObject?,
        preserveBlankKeys: Set<String> = emptySet(),
    ): JSONObject {
        val result = previous?.let { JSONObject(it.toString()) } ?: JSONObject()
        if (incoming == null) return result

        val keys = incoming.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = incoming.opt(key)
            if (key in preserveBlankKeys && isBlankJsonValue(value)) continue
            result.put(key, cloneJsonValue(value))
        }
        return result
    }

    private fun jsonIdentity(
        row: JSONObject,
        keys: List<String>,
    ): String? {
        for (key in keys) {
            if (!row.has(key)) continue
            val value = row.opt(key)
            if (isBlankJsonValue(value)) continue
            return key + ":" + value.toString().trim()
        }
        return null
    }

    private fun isBlankJsonValue(value: Any?): Boolean = when (value) {
        null,
        JSONObject.NULL -> true
        is String -> value.isBlank()
        is JSONArray -> value.length() == 0
        is JSONObject -> value.length() == 0
        else -> false
    }

    private fun cloneJsonValue(value: Any?): Any? = when (value) {
        is JSONObject -> JSONObject(value.toString())
        is JSONArray -> JSONArray(value.toString())
        else -> value
    }

    fun locationId(): Long? = meta("location_id")?.toLongOrNull()

    fun locationName(): String? {
        val raw = meta("bootstrap_json") ?: return null
        return runCatching {
            JSONObject(raw)
                .optJSONObject("location")
                ?.optString("name")
                ?.takeIf { it.isNotBlank() }
        }.getOrNull()
    }

    fun staffName(): String? {
        val raw = meta("bootstrap_json") ?: return null
        return runCatching {
            JSONObject(raw)
                .optJSONObject("identity")
                ?.optString("staff_name")
                ?.takeIf { it.isNotBlank() }
        }.getOrNull()
    }

    fun roleCode(): String? = meta("role_code")?.takeIf { it.isNotBlank() }

    // PMD_ANDROID_CANONICAL_POS_LOCAL_TRANSPORT_V18
    // The native Quick POS transport consumes the same trusted bootstrap
    // document that seeds SQLite, so the canonical web UI can keep its exact
    // structure while only the data authority changes.
    fun bootstrapSnapshot(): JSONObject? =
        meta("bootstrap_json")?.let { raw ->
            runCatching { JSONObject(raw) }.getOrNull()
        }

    fun menuSnapshot(): JSONObject =
        bootstrapSnapshot()?.optJSONObject("menu") ?: JSONObject()

    // PMD_ANDROID_OFFLINE_HISTORY_CACHE_V16
    // History is part of the trusted bootstrap blob, so it survives WAN loss
    // without a second SQLite schema or a Cloud request from the offline UI.
    fun historySnapshot(): JSONObject? {
        val raw = meta("bootstrap_json") ?: return null
        return runCatching {
            JSONObject(raw)
                .optJSONObject("history")
                ?.takeIf { it.optJSONArray("entries") != null }
        }.getOrNull()
    }

    fun hasHistorySnapshot(): Boolean =
        historySnapshot()?.optJSONArray("entries") != null

    fun floorsSnapshot(): JSONArray =
        runCatching {
            JSONObject(meta("bootstrap_json").orEmpty())
                .optJSONArray("floors")
                ?: JSONArray()
        }.getOrElse { JSONArray() }

    fun tableFloorMapSnapshot(): JSONObject =
        runCatching {
            JSONObject(meta("bootstrap_json").orEmpty())
                .optJSONObject("table_floor_map")
                ?: JSONObject()
        }.getOrElse { JSONObject() }

    fun currencyCode(): String =
        runCatching {
            JSONObject(meta("bootstrap_json").orEmpty())
                .optJSONObject("location")
                ?.optString("currency_code", "EUR")
                ?.ifBlank { "EUR" }
                ?: "EUR"
        }.getOrDefault("EUR")

    fun profileExpiresAt(): String? = meta("profile_expires_at")?.takeIf { it.isNotBlank() }

    fun surfaces(): Set<String> {
        val raw = meta("bootstrap_json") ?: return emptySet()

        return runCatching {
            val root = JSONObject(raw)
            val array = root.optJSONObject("identity")
                ?.optJSONArray("surfaces")
                ?: JSONArray()

            buildSet {
                for (index in 0 until array.length()) {
                    val value = array.optString(index).trim().lowercase()
                    if (value.isNotBlank()) add(value)
                }
            }
        }.getOrDefault(emptySet())
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

    fun markStale() {
        database.transaction { db ->
            putMeta(db, "bootstrap_applied_at_ms", "0")
        }
    }

    fun needsRefresh(
        maxAgeMs: Long = 60_000L,
        nowMs: Long = System.currentTimeMillis(),
    ): Boolean {
        val applied = meta("bootstrap_applied_at_ms")
            ?.toLongOrNull()
            ?: return true

        return nowMs - applied >= maxAgeMs
    }

    fun hasBootstrap(): Boolean = database.readableDatabase.query(
        "pmd_meta",
        arrayOf("value"),
        "key = ?",
        arrayOf("bootstrap_json"),
        null,
        null,
        null,
        "1",
    ).use { it.moveToFirst() && it.getString(0).isNotBlank() }

    private fun putMeta(db: SQLiteDatabase, key: String, value: String) {
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

    private fun toMinor(value: Any?, exponent: Int): Long {
        val decimal = when (value) {
            null, JSONObject.NULL -> BigDecimal.ZERO
            is Number -> BigDecimal(value.toString())
            else -> value.toString().toBigDecimalOrNull() ?: BigDecimal.ZERO
        }
        return decimal
            .movePointRight(exponent)
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact()
    }

    companion object {
        const val STATUS_SERVER_OPEN = "SERVER_OPEN"
        const val EDGE_STATUS_CLOUD_OPEN = "CLOUD_OPEN"

        private val MENU_MEDIA_KEYS_V101 = setOf(
            "image",
            "image_url",
            "imageUrl",
            "image_path",
            "imagePath",
            "thumb",
            "thumbnail",
            "media_url",
            "mediaUrl",
            "photo_url",
            "photoUrl",
            "photo",
            "primary_image",
            "primaryImage",
            "images",
            "gallery",
            "media",
            "additional_images",
        )
    }
}
