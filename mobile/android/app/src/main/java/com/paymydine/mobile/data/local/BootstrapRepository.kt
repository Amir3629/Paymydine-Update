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
        val stations = root.optJSONArray("kds_stations") ?: JSONArray()
        val sync = root.optJSONObject("sync") ?: JSONObject()

        val locationId = location.getLong("id")
        val currency = location.optString("currency_code", "EUR").ifBlank { "EUR" }
        val exponent = location.optInt("currency_minor_exponent", 2).coerceIn(0, 4)
        val now = System.currentTimeMillis()

        database.transaction { db ->
            db.delete("pmd_menu_items", "location_id = ?", arrayOf(locationId.toString()))
            db.delete("pmd_tables", "location_id = ?", arrayOf(locationId.toString()))
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
                        put("version", 0)
                        put("number", table.optString("number"))
                        put("label", table.optString("name", table.optString("number")))
                        put("status", table.optString("operational_status", "available"))
                        put("payload_json", table.toString())
                        put("updated_at_ms", now)
                    },
                )
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
            kdsStations = stations.length(),
            cursor = sync.optLong("cursor", 0),
        )
    }

    fun locationId(): Long? = meta("location_id")?.toLongOrNull()

    fun roleCode(): String? = meta("role_code")?.takeIf { it.isNotBlank() }

    fun profileExpiresAt(): String? = meta("profile_expires_at")?.takeIf { it.isNotBlank() }

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
}
