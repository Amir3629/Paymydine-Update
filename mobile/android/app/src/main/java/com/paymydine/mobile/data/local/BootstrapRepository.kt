package com.paymydine.mobile.data.local

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
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
    fun apply(root: JSONObject): BootstrapSummary {
        check(root.optBoolean("ok")) { "Bootstrap payload is not successful." }

        val location = root.getJSONObject("location")
        val identity = root.getJSONObject("identity")
        val menu = root.optJSONObject("menu") ?: JSONObject()
        val items = menu.optJSONArray("items") ?: JSONArray()
        val tables = root.optJSONArray("tables") ?: JSONArray()
        val openOrders = root.optJSONArray("open_orders") ?: JSONArray()
        val stations = root.optJSONArray("kds_stations") ?: JSONArray()
        val sync = root.optJSONObject("sync") ?: JSONObject()

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
                    .put("items", JSONArray())
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

            putMeta(db, "bootstrap_json", root.toString())
            putMeta(db, "tenant_host", root.optJSONObject("tenant")?.optString("host").orEmpty())
            putMeta(db, "location_id", locationId.toString())
            putMeta(db, "role_code", identity.optString("role_code"))
            putMeta(db, "profile_expires_at", root.optString("profile_expires_at"))
            putMeta(
                db,
                "bootstrap_applied_at_ms",
                System.currentTimeMillis().toString(),
            )

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
    }
}
