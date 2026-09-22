package com.paymydine.mobile

import android.app.Activity
import android.webkit.JavascriptInterface
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.sync.SyncEngine
import org.json.JSONArray
import org.json.JSONObject

/**
 * PMD_ANDROID_SEAMLESS_LOCAL_POS_BRIDGE_V17
 *
 * One bridge shared by the in-place POS failover surface. The live staff
 * session stays inside PosActivity; only the data/command authority changes
 * from Cloud to the durable local repository/Restaurant Edge.
 */
class LocalPosBridge(
    private val activity: Activity,
    private val app: PayMyDineApplication,
    private val initialSelectedTableId: String? = null,
    private val initialFloorId: String? = null,
    private val onTryCloud: () -> Unit,
    private val onWorkspaces: () -> Unit,
) {
    @JavascriptInterface
    fun snapshot(selectedTableId: String): String {
        return runCatching {
            val locationId = app.bootstrapRepository.locationId()
                ?: error("Restaurant snapshot is unavailable.")
            val tables = app.localPosRepository.tables(locationId)
            val menu = app.localPosRepository.menu(locationId)
            val requested = selectedTableId.trim()
                .ifBlank { initialSelectedTableId.orEmpty().trim() }
            val selected = requested
                .takeIf { id -> tables.any { it.id == id } }
                ?: tables.firstOrNull()?.id
            val draft = selected?.let(app.localPosRepository::draftForTable)
            val bill = selected?.let(app.localPosRepository::billForTable)

            JSONObject()
                .put("ok", true)
                .put(
                    "location_name",
                    app.bootstrapRepository.locationName().orEmpty(),
                )
                .put(
                    "staff_name",
                    app.credentials.staffSession()
                        ?.staffName
                        ?.ifBlank { null }
                        ?: app.bootstrapRepository.staffName().orEmpty(),
                )
                .put(
                    "role_code",
                    app.credentials.staffSession()
                        ?.roleCode
                        ?.ifBlank { null }
                        ?: app.bootstrapRepository.roleCode().orEmpty(),
                )
                .put("selected_table_id", selected ?: JSONObject.NULL)
                .put(
                    "selected_table_label",
                    tables.firstOrNull { it.id == selected }?.label.orEmpty(),
                )
                .put("cloud_available", app.connectivity.online.value)
                .put("authority", authorityLabel())
                .put("currency", app.bootstrapRepository.currencyCode())
                .put("queued", app.syncRepository.outboxCount())
                .put(
                    "active_floor_id",
                    initialFloorId?.takeIf { it.isNotBlank() }
                        ?: JSONObject.NULL,
                )
                .put("floors", app.bootstrapRepository.floorsSnapshot())
                .put(
                    "table_floor_map",
                    app.bootstrapRepository.tableFloorMapSnapshot(),
                )
                .put(
                    "tables",
                    JSONArray().apply {
                        tables.forEach { table ->
                            put(
                                JSONObject()
                                    .put("id", table.id)
                                    .put("number", table.number)
                                    .put("label", table.label)
                                    .put("status", table.status)
                                    .put(
                                        "status_label",
                                        statusLabel(table.status),
                                    ),
                            )
                        }
                    },
                )
                .put(
                    "menu",
                    JSONArray().apply {
                        menu.forEach { item ->
                            put(
                                JSONObject()
                                    .put("id", item.id)
                                    .put("name", item.name)
                                    .put("price_minor", item.priceMinor)
                                    .put("currency", item.currency)
                                    .put(
                                        "category_id",
                                        item.categoryId ?: JSONObject.NULL,
                                    )
                                    .put(
                                        "payload",
                                        runCatching {
                                            JSONObject(item.payloadJson)
                                        }.getOrElse { JSONObject() },
                                    ),
                            )
                        }
                    },
                )
                .put("draft", draft?.toJson() ?: JSONObject.NULL)
                .put(
                    "bill",
                    bill?.let {
                        JSONObject()
                            .put("server_id", it.serverId ?: JSONObject.NULL)
                            .put("status", it.status)
                            .put("version", it.version)
                            .put("base_total_minor", it.baseTotalMinor)
                            .put("pending_total_minor", it.pendingTotalMinor)
                            .put("projected_total_minor", it.projectedTotalMinor)
                            .put("currency", it.currency)
                            .put(
                                "reconciliation_error",
                                it.reconciliationError ?: JSONObject.NULL,
                            )
                    } ?: JSONObject.NULL,
                )
                .toString()
        }.getOrElse(::errorJson)
    }

    @JavascriptInterface
    fun history(
        scope: String,
        tableId: String,
    ): String {
        val cached = app.bootstrapRepository.historySnapshot()
        val source = cached?.optJSONArray("entries") ?: JSONArray()
        val selectedTableId = tableId.trim().toLongOrNull()
        val showAll = scope.trim().lowercase() == "all"

        val entries = JSONArray()
        for (index in 0 until source.length()) {
            val entry = source.optJSONObject(index) ?: continue
            val entryTableId = entry.optLong("table_id", 0L)
            if (
                showAll ||
                (
                    selectedTableId != null &&
                        selectedTableId > 0 &&
                        entryTableId == selectedTableId
                )
            ) {
                entries.put(JSONObject(entry.toString()))
            }
        }

        return JSONObject()
            .put("ok", true)
            .put(
                "version",
                cached?.optString(
                    "version",
                    "pmd-mobile-history-v1",
                ) ?: "pmd-mobile-history-v1",
            )
            .put(
                "generated_at",
                cached?.optString("generated_at").orEmpty(),
            )
            .put("scope", if (showAll) "all" else "selected")
            .put("table_id", selectedTableId ?: JSONObject.NULL)
            .put("entries", entries)
            .toString()
    }

    @JavascriptInterface
    fun image(itemId: String): String =
        app.offlineImageCache.dataUriForItem(itemId.trim())

    @JavascriptInterface
    fun addItem(
        tableId: String,
        itemId: String,
        optionIdsJson: String,
        note: String,
    ): String = action {
        val locationId = app.bootstrapRepository.locationId()
            ?: error("Restaurant snapshot is unavailable.")
        val options = JSONArray(optionIdsJson)
        val ids = buildList {
            for (index in 0 until options.length()) {
                add(options.optLong(index))
            }
        }

        app.localPosRepository.addItem(
            locationId = locationId,
            tableId = tableId,
            menuItemId = itemId,
            selectedOptionIds = ids,
            note = note,
        )
        "Item added."
    }

    @JavascriptInterface
    fun changeQuantity(lineId: String, delta: Int): String = action {
        app.localPosRepository.changeQuantity(lineId, delta)
        "Check updated."
    }

    @JavascriptInterface
    fun setDraftMeta(
        localOrderId: String,
        guestCount: Int,
        note: String,
    ): String = action {
        app.localPosRepository.setDraftMeta(
            localOrderId,
            guestCount,
            note,
        )
        "Check updated."
    }

    @JavascriptInterface
    fun queueOrder(tableId: String, hold: Boolean): String = action {
        val draft = app.localPosRepository.draftForTable(tableId)
            ?: error("Add items first.")
        val host = app.credentials.tenantHost()
            ?: error("Pair this device first.")
        val deviceId = app.credentials.deviceId()
            ?: error("Pair this device first.")
        val staffSession = app.credentials.staffSession()

        val command = app.localPosRepository.buildSendCommand(
            draft = draft,
            tenantHost = host,
            deviceId = deviceId,
            staffId = staffSession?.staffId,
            userId = staffSession?.userId,
            hold = hold,
        )
        check(app.syncRepository.enqueue(command)) {
            "This exact command is already queued."
        }
        app.localPosRepository.markQueued(draft.localId)
        SyncEngine.enqueueImmediate(app)

        if (hold) {
            "Order saved locally and queued."
        } else {
            "Order queued safely."
        }
    }

    @JavascriptInterface
    fun syncNow(): String = action {
        SyncEngine.enqueueImmediate(app)
        "Sync requested."
    }

    @JavascriptInterface
    fun tryCloud() {
        activity.runOnUiThread(onTryCloud)
    }

    @JavascriptInterface
    fun workspaces() {
        activity.runOnUiThread(onWorkspaces)
    }

    private fun action(block: () -> String): String =
        runCatching {
            JSONObject()
                .put("ok", true)
                .put("message", block())
                .toString()
        }.getOrElse(::errorJson)

    private fun com.paymydine.mobile.data.local.DraftOrder.toJson(): JSONObject =
        JSONObject()
            .put("local_id", localId)
            .put("status", status)
            .put("guest_count", guestCount)
            .put("note", note)
            .put("currency", currency)
            .put("total_minor", totalMinor)
            .put(
                "lines",
                JSONArray().apply {
                    lines.forEach { line ->
                        put(
                            JSONObject()
                                .put("line_id", line.lineId)
                                .put("item_id", line.itemId)
                                .put("name", line.name)
                                .put("quantity", line.quantity)
                                .put(
                                    "unit_price_minor",
                                    line.unitPriceMinor,
                                )
                                .put("note", line.note)
                                .put(
                                    "option_ids",
                                    JSONArray(line.optionIds),
                                ),
                        )
                    }
                },
            )

    private fun authorityLabel(): String {
        val edge = EdgeRuntimeState.state.value
        val pinned = app.credentials.edgeFingerprint()
        val trustedLocalEdge =
            edge.running &&
                !edge.fingerprintSha256.isNullOrBlank() &&
                !pinned.isNullOrBlank() &&
                edge.fingerprintSha256.equals(
                    pinned,
                    ignoreCase = true,
                )

        return when {
            app.connectivity.online.value -> "Cloud reconnecting"
            trustedLocalEdge -> "Restaurant Edge"
            else -> "Offline on this tablet"
        }
    }

    private fun statusLabel(status: String): String =
        when (status.lowercase()) {
            "occupied" -> "Busy"
            "reserved" -> "Reserved"
            "cleaning" -> "Clean"
            else -> "Free"
        }

    private fun errorJson(error: Throwable): String =
        JSONObject()
            .put("ok", false)
            .put(
                "message",
                error.message ?: "Local POS action failed.",
            )
            .toString()
}
