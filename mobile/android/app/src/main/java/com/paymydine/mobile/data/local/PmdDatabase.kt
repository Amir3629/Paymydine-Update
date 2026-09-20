package com.paymydine.mobile.data.local

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class PmdDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    init { setWriteAheadLoggingEnabled(true) }

    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) { schema.forEach(db::execSQL) }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        error("No destructive PayMyDine local DB upgrade: $oldVersion -> $newVersion")
    }

    fun <T> transaction(block: (SQLiteDatabase) -> T): T {
        val db = writableDatabase
        db.beginTransaction()
        return try {
            val result = block(db)
            db.setTransactionSuccessful()
            result
        } finally { db.endTransaction() }
    }

    companion object {
        const val DATABASE_NAME = "paymydine-local-v1.db"
        const val DATABASE_VERSION = 1
        private val schema = listOf(
            """CREATE TABLE pmd_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)""",
            """CREATE TABLE pmd_menu_items (
                id TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0,
                name TEXT NOT NULL, price_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL,
                category_id TEXT, payload_json TEXT NOT NULL DEFAULT '{}', deleted INTEGER NOT NULL DEFAULT 0,
                updated_at_ms INTEGER NOT NULL)""".trimIndent(),
            "CREATE INDEX idx_pmd_menu_location ON pmd_menu_items(location_id, deleted)",
            """CREATE TABLE pmd_tables (
                id TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0,
                number TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}', updated_at_ms INTEGER NOT NULL)""".trimIndent(),
            "CREATE INDEX idx_pmd_tables_location ON pmd_tables(location_id, status)",
            """CREATE TABLE pmd_orders (
                id TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0,
                server_id TEXT, table_id TEXT, status TEXT NOT NULL, total_minor INTEGER NOT NULL DEFAULT 0,
                currency TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}',
                dirty INTEGER NOT NULL DEFAULT 0, updated_at_ms INTEGER NOT NULL)""".trimIndent(),
            "CREATE INDEX idx_pmd_orders_location_status ON pmd_orders(location_id, status)",
            """CREATE TABLE pmd_order_lines (
                line_id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL, item_id TEXT NOT NULL,
                quantity_milli INTEGER NOT NULL, unit_price_minor INTEGER NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}', deleted INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(order_id) REFERENCES pmd_orders(id) ON DELETE CASCADE)""".trimIndent(),
            "CREATE INDEX idx_pmd_order_lines_order ON pmd_order_lines(order_id, deleted)",
            """CREATE TABLE pmd_kds_tickets (
                ticket_id TEXT PRIMARY KEY NOT NULL, location_id INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0,
                order_id TEXT NOT NULL, station_id TEXT, status TEXT NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}', updated_at_ms INTEGER NOT NULL)""".trimIndent(),
            "CREATE INDEX idx_pmd_kds_location_status ON pmd_kds_tickets(location_id, station_id, status)",
            """CREATE TABLE pmd_outbox (
                command_id TEXT PRIMARY KEY NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
                tenant_host TEXT NOT NULL, location_id INTEGER NOT NULL, device_id TEXT NOT NULL,
                staff_id INTEGER, user_id INTEGER, aggregate TEXT NOT NULL, aggregate_id TEXT NOT NULL,
                base_version INTEGER NOT NULL DEFAULT 0, command_type TEXT NOT NULL, payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING', retry_count INTEGER NOT NULL DEFAULT 0,
                created_at_ms INTEGER NOT NULL, next_retry_at_ms INTEGER NOT NULL DEFAULT 0, last_error TEXT)""".trimIndent(),
            "CREATE INDEX idx_pmd_outbox_drain ON pmd_outbox(status, next_retry_at_ms, created_at_ms)",
            """CREATE TABLE pmd_inbox_events (
                sequence INTEGER PRIMARY KEY NOT NULL, event_id TEXT NOT NULL UNIQUE, location_id INTEGER NOT NULL,
                aggregate TEXT NOT NULL, aggregate_id TEXT NOT NULL, aggregate_version INTEGER NOT NULL DEFAULT 0,
                event_type TEXT NOT NULL, payload_json TEXT NOT NULL, created_at_ms INTEGER NOT NULL,
                applied_at_ms INTEGER NOT NULL)""".trimIndent(),
            "CREATE INDEX idx_pmd_inbox_aggregate ON pmd_inbox_events(aggregate, aggregate_id, aggregate_version)",
            """CREATE TABLE pmd_sync_cursor (scope TEXT PRIMARY KEY NOT NULL, cursor INTEGER NOT NULL DEFAULT 0)"""
        )
    }
}
