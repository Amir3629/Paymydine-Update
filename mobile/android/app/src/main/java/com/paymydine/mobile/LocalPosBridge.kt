package com.paymydine.mobile

import android.app.Activity
import android.net.Uri
import android.webkit.JavascriptInterface
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.sync.CommandEnvelope
import com.paymydine.mobile.sync.SyncEngine
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

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
    private val onRequireLocalTransport: () -> Unit = {},
    private val onLocalUiReady: () -> Unit = {},
) {
    @JavascriptInterface
    fun persistUiDraft(payloadJson: String): String =
        runCatching {
            app.localPosRepository.saveQuickPosUiDraft(payloadJson)
            """{"ok":true}"""
        }.getOrElse(::errorJson)

    @JavascriptInterface
    fun clearUiDraft(): String =
        runCatching {
            app.localPosRepository.clearQuickPosUiDraft()
            """{"ok":true}"""
        }.getOrElse(::errorJson)

    @JavascriptInterface
    fun syncStatus(): String = runCatching {
        val counts = app.syncRepository.statusCounts()
        val networkValidated = app.connectivity.online.value
        val cloudState = app.syncRepository.cloudHealthState(networkValidated)
        JSONObject()
            .put("ok", true)
            .put("local_first", true)
            .put("network_validated", networkValidated)
            .put("cloud_state", cloudState)
            .put("cloud_available", cloudState == "online")
            .put("pending", counts.pending)
            .put("retrying", counts.retrying)
            .put("in_flight", counts.inFlight)
            .put("active", counts.active)
            .put("rejected", counts.rejected)
            .toString()
    }.getOrElse(::errorJson)

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
            val draft = selected?.let(app.localPosRepository::localWorkForTable)
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
                .put("rejected", app.syncRepository.rejectedCount())
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
                            .put("settled_minor", it.settledMinor)
                            .put("remaining_minor", it.remainingMinor)
                            .put("payment_queued_minor", it.paymentQueuedMinor)
                            .put(
                                "remaining_after_queued_minor",
                                it.remainingAfterQueuedMinor,
                            )
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

    /**
     * PMD_ANDROID_CANONICAL_POS_LOCAL_TRANSPORT_V18
     *
     * Adapter for the canonical pmd-quick-pos-v1.js fetchJson contract.
     * The browser UI does not know or care whether the authority is Cloud or
     * SQLite; it receives the same endpoint-shaped JSON either way.
     */
    @JavascriptInterface
    fun fetchJson(
        url: String,
        method: String,
        body: String,
    ): String = runCatching {
        routeCanonicalRequest(
            rawUrl = url,
            method = method.trim().uppercase().ifBlank { "GET" },
            body = body,
        ).toString()
    }.getOrElse(::errorJson)

    private fun routeCanonicalRequest(
        rawUrl: String,
        method: String,
        body: String,
    ): JSONObject {
        val uri = Uri.parse(rawUrl)
        val path = uri.path.orEmpty()
        val payload = body
            .takeIf { it.isNotBlank() }
            ?.let { JSONObject(it) }
            ?: JSONObject()

        if (path.startsWith("/admin/pos/bootstrap/")) {
            return canonicalBootstrap()
        }

        Regex("^/admin/pos/table/(\\d+)$")
            .matchEntire(path)
            ?.groupValues
            ?.getOrNull(1)
            ?.let { return canonicalTableData(it) }

        Regex("^/admin/pos/save/(\\d+)$")
            .matchEntire(path)
            ?.groupValues
            ?.getOrNull(1)
            ?.let {
                require(method == "POST") { "This action is not available." }
                return canonicalSave(it, payload)
            }

        Regex("^/admin/pos/payment-summary/(-?\\d+)$")
            .matchEntire(path)
            ?.groupValues
            ?.getOrNull(1)
            ?.toLongOrNull()
            ?.let { return canonicalPaymentSummary(it) }

        Regex("^/admin/pos/payment-settle/(-?\\d+)$")
            .matchEntire(path)
            ?.groupValues
            ?.getOrNull(1)
            ?.toLongOrNull()
            ?.let {
                require(method == "POST") { "This action is not available." }
                return canonicalPaymentSettle(it, payload)
            }

        Regex("^/admin/pmd-waiter-table-states-v154/(\\d+)$")
            .matchEntire(path)
            ?.groupValues
            ?.getOrNull(1)
            ?.let {
                require(method == "POST") { "This action is not available." }
                return canonicalTableState(it, payload)
            }

        if (path == "/admin/pos/transfer") {
            require(method == "POST") { "This action is not available." }
            return canonicalTransfer(payload)
        }

        if (path == "/admin/pos/history") {
            return canonicalHistory(uri)
        }

        if (path == "/admin/pos/pickup") {
            // Keep the canonical Pickup workspace shape present offline. New
            // Pickup persistence remains Cloud-only until it has its own
            // certified durable command.
            return JSONObject()
                .put("ok", true)
                .put("open_orders", JSONArray())
        }

        if (path == "/admin/pos/save-off-premise") {
            return unavailable(
                "Pickup orders need an internet connection right now.",
            )
        }

        Regex(
            "^/admin/pmd-waiter-pos-v22/operations/(-?\\d+)/" +
                "(void-item|increase-item)$",
        ).matchEntire(path)?.let { match ->
            require(method == "POST") { "This action is not available." }
            val orderId = match.groupValues[1].toLongOrNull()
                ?: error("This check is unavailable.")
            if (orderId < 0L) {
                return canonicalProvisionalItemMutation(
                    orderId = orderId,
                    payload = payload,
                    increase = match.groupValues[2] == "increase-item",
                )
            }
            return canonicalServerItemMutationV106(
                orderId = orderId,
                payload = payload,
                increase = match.groupValues[2] == "increase-item",
            )
        }

        if (
            Regex("^/admin/pos/attention/\\d+/seen$").matches(path)
        ) {
            return unavailable(
                "Marking this alert as seen needs an internet connection right now.",
            )
        }

        if (path == "/admin/notifications-api/count") {
            return JSONObject()
                .put("ok", true)
                .put("new", 0)
        }

        if (
            path.contains("/terminal-payment") ||
            path.contains("/terminal-payments/") ||
            path.contains("/payment-coupon/")
        ) {
            return unavailable(
                "Card terminal and online payment actions need an internet connection.",
            )
        }

        return unavailable(
            "This action needs an internet connection.",
        )
    }

    private fun canonicalBootstrap(): JSONObject {
        val root = app.bootstrapRepository.bootstrapSnapshot()
            ?: error("Restaurant data is not available on this tablet.")
        val locationId = app.bootstrapRepository.locationId()
            ?: error("Restaurant data is not available on this tablet.")
        val identity = root.optJSONObject("identity") ?: JSONObject()
        val rawMenu = root.optJSONObject("menu") ?: JSONObject()
        val quickPosSettings =
            root.optJSONObject("quick_pos_settings") ?: JSONObject()
        val roleCode = app.credentials.staffSession()
            ?.roleCode
            ?.takeIf { it.isNotBlank() }
            ?: identity.optString("role_code")
        val mode = if (roleCode.contains("waiter", ignoreCase = true)) {
            "waiter"
        } else {
            "cashier"
        }
        val floors = cloneArray(root.optJSONArray("floors"))
        val activeFloor = initialFloorId
            ?.takeIf { it.isNotBlank() }
            ?: floors.optJSONObject(0)?.opt("id")?.toString().orEmpty()

        return JSONObject()
            .put("ok", true)
            .put("version", "pmd-quick-pos-v2-native-local")
            .put("mode", mode)
            .put("can_switch_mode", mode == "cashier")
            .put("location_id", locationId)
            .put("location_name", app.bootstrapRepository.locationName().orEmpty())
            .put("active_floor_id", activeFloor)
            .put("default_floor_id", activeFloor)
            .put("floors", floors)
            .put("tables", canonicalTables(root))
            .put(
                "menu_items",
                canonicalMenuItems(rawMenu),
            )
            .put(
                "categories",
                cloneArray(rawMenu.optJSONArray("categories")),
            )
            .put(
                "settings",
                JSONObject()
                    .put("currency", currencySymbol())
                    .put(
                        "currency_code",
                        quickPosSettings.optString(
                            "currency_code",
                            app.bootstrapRepository.currencyCode(),
                        ),
                    )
                    .put(
                        "tax_enabled",
                        quickPosSettings.optBoolean("tax_enabled", false),
                    )
                    .put(
                        "tax_percentage",
                        quickPosSettings.optDouble("tax_percentage", 0.0),
                    )
                    .put(
                        "tax_menu_price",
                        quickPosSettings.optInt("tax_menu_price", 1),
                    )
                    .put(
                        "tax_title",
                        quickPosSettings.optString("tax_title", "VAT"),
                    )
                    .put("can_switch_mode", mode == "cashier")
                    .put("table_data_url", "/admin/pos/table/{table}")
                    .put("table_save_url", "/admin/pos/save/{table}")
                    .put("pickup_data_url", "/admin/pos/pickup")
                    .put("off_premise_save_url", "/admin/pos/save-off-premise")
                    .put(
                        "item_decrease_url",
                        "/admin/pmd-waiter-pos-v22/operations/{order}/void-item",
                    )
                    .put(
                        "item_increase_url",
                        "/admin/pmd-waiter-pos-v22/operations/{order}/increase-item",
                    )
                    .put(
                        "payment_summary_url",
                        "/admin/pos/payment-summary/{order}",
                    )
                    .put(
                        "payment_settle_url",
                        "/admin/pos/payment-settle/{order}",
                    )
                    .put(
                        "payment_coupon_url",
                        "/admin/pos/payment-coupon/{order}",
                    )
                    .put(
                        "terminal_payment_url",
                        "/admin/pos/terminal-payment/{order}",
                    )
                    .put(
                        "terminal_attempts_url",
                        "/admin/orders/{order}/terminal-payment-attempts",
                    )
                    .put(
                        "terminal_refresh_url",
                        "/admin/terminal-payments/attempts/{attempt}/refresh",
                    )
                    .put(
                        "table_state_url",
                        "/admin/pmd-waiter-table-states-v154/{table}",
                    )
                    .put("history_url", "/admin/pos/history")
                    .put(
                        "attention_seen_url",
                        "/admin/pos/attention/{notification}/seen",
                    )
                    .put("transfer_url", "/admin/pos/transfer"),
            )
            .put(
                "profile",
                cloneObject(
                    root.optJSONObject("platform_context")
                        ?.optJSONObject("profile"),
                ),
            )
            .put(
                "permissions",
                JSONObject()
                    .put("orders", true)
                    .put("payments", true),
            )
            .put(
                "user",
                JSONObject()
                    .put("id", identity.optLong("user_id", 0L))
                    .put(
                        "name",
                        app.credentials.staffSession()
                            ?.staffName
                            ?.takeIf { it.isNotBlank() }
                            ?: identity.optString("staff_name", "Staff"),
                    )
                    .put("role", roleCode),
            )
            .put(
                "native_ui_draft",
                app.localPosRepository.quickPosUiDraft(locationId)
                    ?: JSONObject.NULL,
            )
    }

    // PMD_ANDROID_OFFLINE_IMAGE_ROUTE_V20
    // Local mode never asks the network for a menu thumbnail. Cached products
    // use a synthetic same-tenant HTTPS path intercepted by PosActivity.
    private fun canonicalMenuItems(rawMenu: JSONObject): JSONArray {
        val items = rawMenu.optJSONArray("items") ?: JSONArray()
        val host = app.credentials.tenantHost().orEmpty()

        return JSONArray().apply {
            for (index in 0 until items.length()) {
                val row = cloneObject(items.optJSONObject(index))
                val itemId = row.opt("id")?.toString().orEmpty()
                val cached = if (itemId.isNotBlank()) {
                    app.offlineImageCache.cachedForItem(itemId)
                } else {
                    null
                }

                if (cached != null && host.isNotBlank()) {
                    val localUrl =
                        "https://$host/__pmd_offline/image/" +
                            Uri.encode(itemId)
                    row.put("image", localUrl)
                    row.put("images", JSONArray().put(localUrl))
                } else if (row.optString("image").isNotBlank()) {
                    row.put("image", "")
                    row.put("images", JSONArray())
                }

                put(row)
            }
        }
    }

    private fun canonicalTables(root: JSONObject): JSONArray {
        val locationId = app.bootstrapRepository.locationId()
            ?: return JSONArray()
        val raw = root.optJSONArray("tables") ?: JSONArray()
        val byId = mutableMapOf<String, JSONObject>()
        for (index in 0 until raw.length()) {
            val table = raw.optJSONObject(index) ?: continue
            byId[table.opt("id")?.toString().orEmpty()] = table
        }

        val floorMap = root.optJSONObject("table_floor_map") ?: JSONObject()
        return JSONArray().apply {
            app.localPosRepository.tables(locationId).forEach { local ->
                val row = cloneObject(byId[local.id])
                val floorId = floorMap.opt(local.id)
                val bill = app.localPosRepository.billForTable(local.id)
                val dueMinor = bill?.remainingAfterQueuedMinor ?: 0L
                val paymentState = when {
                    bill == null -> "none"
                    bill.paymentQueuedMinor > 0L -> "paid"
                    bill.settledMinor > 0L -> "partial"
                    bill.remainingMinor > 0L -> "due"
                    else -> "none"
                }

                row
                    .put("id", local.id.toLongOrNull() ?: local.id)
                    .put("number", local.number)
                    .put("name", local.label)
                    .put("status", local.status)
                    .put("operational_status", local.status)
                    .put("payment_state", paymentState)
                    .put("due_amount", minorToMajor(dueMinor))

                if (floorId != null && floorId !== JSONObject.NULL) {
                    row.put("floor_id", floorId)
                }

                put(row)
            }
        }
    }

    private fun canonicalTableData(tableId: String): JSONObject {
        val root = app.bootstrapRepository.bootstrapSnapshot()
            ?: error("Restaurant data is not available on this tablet.")
        val table = findCanonicalTable(root, tableId)
            ?: error("Table is not available.")
        val openOrders = JSONArray()
        val rawOrders = root.optJSONArray("open_orders") ?: JSONArray()

        for (index in 0 until rawOrders.length()) {
            val order = rawOrders.optJSONObject(index) ?: continue
            if (order.opt("table_id")?.toString() != tableId) continue
            openOrders.put(projectPendingItemAdjustmentsV106(order))
        }

        val work = app.localPosRepository.localWorkForTable(tableId)
        val bill = app.localPosRepository.billForTable(tableId)

        if (work != null) {
            val localItems = canonicalDraftItems(work)
            val serverId = work.serverId?.toLongOrNull()?.takeIf { it > 0L }

            if (serverId != null) {
                var matched: JSONObject? = null
                for (index in 0 until openOrders.length()) {
                    val order = openOrders.optJSONObject(index) ?: continue
                    if (order.optLong("order_id", 0L) == serverId) {
                        matched = order
                        break
                    }
                }

                val order = matched ?: JSONObject()
                    .put("order_id", serverId)
                    .put("table_id", tableId.toLongOrNull() ?: tableId)
                    .also { openOrders.put(it) }

                val merged = cloneArray(order.optJSONArray("items"))
                for (index in 0 until localItems.length()) {
                    merged.put(localItems.get(index))
                }
                val projected = bill?.projectedTotalMinor ?: work.totalMinor
                order
                    .put("items", merged)
                    .put("order_total", minorToMajor(projected))
                    .put("total", minorToMajor(projected))
                    .put(
                        "total_items",
                        mergedQuantity(merged),
                    )
                    .put("guest_count", work.guestCount)
                    .put("comment", work.note)
                    .put(
                        "updated_at",
                        instantString(
                            app.localPosRepository.localWorkUpdatedAtMs(tableId),
                        ),
                    )
            } else if (work.status != "DRAFT") {
                val pseudoId = app.localPosRepository.pseudoOrderId(work.localId)
                openOrders.put(
                    0,
                    JSONObject()
                        .put("order_id", pseudoId)
                        .put("table_id", tableId.toLongOrNull() ?: tableId)
                        .put("order_total", minorToMajor(work.totalMinor))
                        .put("total", minorToMajor(work.totalMinor))
                        .put("total_items", mergedQuantity(localItems))
                        .put("guest_count", work.guestCount)
                        .put("comment", work.note)
                        .put("settlement_status", "unpaid")
                        .put("settled_amount", 0)
                        .put("status_name", "Open")
                        .put("structural_locked", false)
                        .put(
                            "item_mutation",
                            JSONObject()
                                .put(
                                    "allowed",
                                    work.status in setOf("QUEUED", "RETRY") &&
                                        (bill?.paymentQueuedMinor ?: 0L) <= 0L,
                                )
                                .put("locked", false)
                                .put("payment_started", (bill?.paymentQueuedMinor ?: 0L) > 0L)
                                .put(
                                    "reason",
                                    if ((bill?.paymentQueuedMinor ?: 0L) > 0L) {
                                        "Cash is already saved for this check."
                                    } else {
                                        ""
                                    },
                                ),
                        )
                        .put(
                            "updated_at",
                            instantString(
                                app.localPosRepository.localWorkUpdatedAtMs(tableId),
                            ),
                        )
                        .put("items", localItems)
                        .put("native_provisional", true),
                )
            }
        }

        val activeOrderId = when {
            work != null && work.status != "DRAFT" ->
                work.serverId?.toLongOrNull()?.takeIf { it > 0L }
                    ?: app.localPosRepository.pseudoOrderId(work.localId)
            openOrders.length() > 0 ->
                openOrders.optJSONObject(0)?.optLong("order_id", 0L)
            else -> null
        }

        return JSONObject()
            .put("ok", true)
            .put("version", "pmd-quick-pos-v2-native-local")
            .put("table", table)
            .put("open_orders", openOrders)
            .put("active_order_id", activeOrderId ?: JSONObject.NULL)
            .put(
                "native_cart",
                if (work != null && work.status == "DRAFT") {
                    canonicalDraftItems(work)
                } else {
                    JSONArray()
                },
            )
    }

    private fun canonicalSave(
        tableId: String,
        payload: JSONObject,
    ): JSONObject {
        val locationId = app.bootstrapRepository.locationId()
            ?: error("Restaurant data is not available on this tablet.")
        val host = app.credentials.tenantHost()
            ?: error("This tablet is not paired.")
        val deviceId = app.credentials.deviceId()
            ?: error("This tablet is not paired.")
        val session = app.credentials.staffSession()
            ?: error("Sign in again to continue.")

        val draft = app.localPosRepository.stageQuickPosCart(
            locationId = locationId,
            tableId = tableId,
            payload = payload,
        )
        val hold = payload.optString("mode", "send")
            .equals("hold", ignoreCase = true)
        val command = app.localPosRepository.buildSendCommand(
            draft = draft,
            tenantHost = host,
            deviceId = deviceId,
            staffId = session.staffId,
            userId = session.userId,
            hold = hold,
        )

        check(app.syncRepository.enqueue(command)) {
            "This check is already saved."
        }
        app.localPosRepository.markQueued(draft.localId)
        // PMD_ANDROID_LOCAL_TABLE_OCCUPIED_V23
        // The Cloud save will persist canonical table state later; the local
        // projection turns the floor occupied immediately during the outage.
        app.localPosRepository.markTableOccupiedProjection(
            tableId = tableId,
            localOrderId = draft.localId,
        )
        SyncEngine.enqueueImmediate(app)

        val queued = app.localPosRepository.localWorkForTable(tableId)
            ?: draft
        val orderId = queued.serverId
            ?.toLongOrNull()
            ?.takeIf { it > 0L }
            ?: app.localPosRepository.pseudoOrderId(queued.localId)
        val bill = app.localPosRepository.billForTable(tableId)
        val totalMinor = bill?.projectedTotalMinor ?: queued.totalMinor
        val response = JSONObject()
            .put("ok", true)
            .put("order_id", orderId)
            .put("order_total", minorToMajor(totalMinor))
            .put(
                "total_items",
                queued.lines.sumOf { it.quantity },
            )
            .put("guest_count", queued.guestCount)
            .put("updated_at", instantString(command.createdAtMs))
            .put("native_provisional", orderId < 0L)
            .put("items", canonicalDraftItems(queued))
            .put(
                "item_mutation",
                JSONObject()
                    .put("allowed", orderId < 0L)
                    .put("locked", false)
                    .put("payment_started", false)
                    .put("reason", ""),
            )
            .put(
                "message",
                if (hold) "Saved on this tablet."
                else "Order saved. It will sync automatically.",
            )

        if (!hold) {
            response.put(
                "payment_quick",
                canonicalPaymentSummary(orderId),
            )
        }

        return response
    }

    private fun canonicalPaymentSummary(orderId: Long): JSONObject {
        val tableId = tableIdForOrder(orderId)
            ?: error("This check is not available on this tablet.")
        val tableData = canonicalTableData(tableId)
        val orders = tableData.optJSONArray("open_orders") ?: JSONArray()
        var order: JSONObject? = null
        for (index in 0 until orders.length()) {
            val candidate = orders.optJSONObject(index) ?: continue
            if (candidate.optLong("order_id", 0L) == orderId) {
                order = candidate
                break
            }
        }
        val current = order ?: error("This check is not available.")

        val bill = if (orderId > 0L) {
            app.localPosRepository.billForServerOrder(orderId)
        } else {
            app.localPosRepository.billForTable(tableId)
        }
        val total = current.optDouble(
            "order_total",
            current.optDouble("total", 0.0),
        )
        val settled = if (bill != null) {
            minorToMajor(bill.settledMinor)
        } else {
            current.optDouble("settled_amount", 0.0)
        }
        val paymentQueued = (bill?.paymentQueuedMinor ?: 0L) > 0L
        val effectiveSettled = if (paymentQueued) total else settled
        val remaining = if (paymentQueued) 0.0 else maxOf(0.0, total - settled)
        val items = canonicalPaymentItems(
            current.optJSONArray("items") ?: JSONArray(),
        )

        return JSONObject()
            .put("ok", true)
            .put("version", "pmd-waiter-pos-v2.1.2-native-local")
            .put(
                "order",
                JSONObject()
                    .put("order_id", orderId)
                    .put("status_id", current.optLong("status_id", 0L))
                    .put("payment", "cash")
                    .put(
                        "updated_at",
                        current.optString(
                            "updated_at",
                            instantString(
                                app.localPosRepository.localWorkUpdatedAtMs(tableId),
                            ),
                        ),
                    )
                    .put("comment", current.optString("comment")),
            )
            .put("table", findCanonicalTable(
                app.bootstrapRepository.bootstrapSnapshot() ?: JSONObject(),
                tableId,
            ) ?: JSONObject.NULL)
            .put("items", items)
            .put(
                "settlement",
                JSONObject()
                    .put("order_total", total)
                    .put("settled_amount", effectiveSettled)
                    .put("remaining_amount", remaining)
                    .put(
                        "status",
                        if (remaining <= 0.0001) "paid"
                        else if (effectiveSettled > 0.0001) "partial"
                        else "unpaid",
                    )
                    .put("gross_ratio", 1.0),
            )
            .put(
                "methods",
                JSONArray()
                    .put(
                        JSONObject()
                            .put("code", "cash")
                            .put("name", "Cash")
                            .put("provider_code", JSONObject.NULL)
                            .put("kind", "staff")
                            .put("priority", 1),
                    ),
            )
            .put("terminal_providers", JSONArray())
            .put("transactions", JSONArray())
            .put(
                "permissions",
                JSONObject()
                    .put("can_collect_payment", true)
                    .put("can_open_guest_checkout", false),
            )
            .put("guest_checkout_url", JSONObject.NULL)
            .put(
                "currency",
                JSONObject()
                    .put("symbol", currencySymbol())
                    .put("code", app.bootstrapRepository.currencyCode()),
            )
            .put("native_payment_pending", paymentQueued)
    }

    private fun canonicalPaymentSettle(
        orderId: Long,
        payload: JSONObject,
    ): JSONObject {
        val method = payload.optString("payment_method", "cash")
            .trim()
            .lowercase()
        if (method != "cash") {
            return unavailable(
                "Card and terminal payments need an internet connection.",
            )
        }

        val splitMode = payload.optString("split_mode", "full")
            .trim()
            .lowercase()
        if (splitMode != "full") {
            return unavailable(
                "Split payments need an internet connection right now.",
            )
        }

        val tableId = tableIdForOrder(orderId)
            ?: error("This check is not available on this tablet.")
        val cashReceivedMinor = majorToMinor(
            payload.optDouble(
                "cash_received",
                payload.optDouble("amount", 0.0),
            ),
        )
        val host = app.credentials.tenantHost()
            ?: error("This tablet is not paired.")
        val deviceId = app.credentials.deviceId()
            ?: error("This tablet is not paired.")
        val session = app.credentials.staffSession()
            ?: error("Sign in again to continue.")

        val localWork = app.localPosRepository.localWorkForTable(tableId)
        val command = if (
            localWork != null &&
            (
                localWork.status == "QUEUED" ||
                    localWork.status == "RETRY"
            )
        ) {
            app.localPosRepository.buildCashPaymentForQueuedOrder(
                tableId = tableId,
                tenantHost = host,
                deviceId = deviceId,
                staffId = session.staffId,
                userId = session.userId,
                cashReceivedMinor = cashReceivedMinor,
            )
        } else {
            require(orderId > 0L) {
                "Save the check before collecting payment."
            }
            app.localPosRepository.buildCashPaymentCommandForOrder(
                orderId = orderId,
                tableId = tableId,
                tenantHost = host,
                deviceId = deviceId,
                staffId = session.staffId,
                userId = session.userId,
                cashReceivedMinor = cashReceivedMinor,
            )
        }

        check(app.syncRepository.enqueue(command)) {
            "Cash is already saved for this check."
        }

        val billBefore = if (orderId > 0L) {
            app.localPosRepository.billForServerOrder(orderId)
        } else {
            app.localPosRepository.billForTable(tableId)
        }
        val dueMinor = maxOf(
            0L,
            (billBefore?.projectedTotalMinor ?: 0L) -
                (billBefore?.settledMinor ?: 0L),
        )

        if (orderId > 0L && localWork?.serverId?.toLongOrNull() == orderId) {
            app.localPosRepository.markCashPaymentQueuedForServerOrder(
                orderId,
                command.commandId,
                dueMinor,
            )
        } else if (localWork != null) {
            app.localPosRepository.markCashPaymentQueuedForLocalOrder(
                localWork.localId,
                command.commandId,
                dueMinor,
            )
        } else {
            app.localPosRepository.markCashPaymentQueuedForServerOrder(
                orderId,
                command.commandId,
                dueMinor,
            )
        }

        SyncEngine.enqueueImmediate(app)
        val summary = canonicalPaymentSummary(orderId)

        return JSONObject()
            .put("ok", true)
            .put(
                "message",
                "Cash saved on this tablet. It will sync automatically.",
            )
            .put("settlement_status", "paid")
            .put("remaining_amount", 0)
            .put("paid_amount", minorToMajor(dueMinor))
            .put("settled_base_amount", minorToMajor(dueMinor))
            .put("cash_received", minorToMajor(cashReceivedMinor))
            .put(
                "change_due",
                minorToMajor(maxOf(0L, cashReceivedMinor - dueMinor)),
            )
            .put("summary", summary)
            .put("receipt_url", "")
            .put("invoice_url", "")
            .put("native_pending_sync", true)
    }

    private fun canonicalTableState(
        tableId: String,
        payload: JSONObject,
    ): JSONObject {
        val status = payload.optString("status", "available")
        val queued = JSONObject(
            queueTableState(
                tableId,
                status,
                payload.optBoolean("skip_cleaning", false),
            ),
        )
        if (!queued.optBoolean("ok")) {
            error(queued.optString("message", "Table could not be updated."))
        }

        return JSONObject()
            .put("ok", true)
            .put("status", status)
            .put("status_label", statusLabel(status))
            .put("message", "Table updated.")
    }

    private fun canonicalTransfer(payload: JSONObject): JSONObject {
        val source = payload.opt("source_table_id")?.toString().orEmpty()
        val target = payload.opt("target_table_id")?.toString().orEmpty()
        val scope = payload.optString("scope", "order")
        val queued = JSONObject(
            queueTableMove(source, target, scope),
        )
        if (!queued.optBoolean("ok")) {
            error(queued.optString("message", "Move could not be saved."))
        }

        val sourceStatus = app.localPosRepository.tables(
            app.bootstrapRepository.locationId() ?: 0L,
        ).firstOrNull { it.id == source }?.status ?: "available"
        val targetStatus = app.localPosRepository.tables(
            app.bootstrapRepository.locationId() ?: 0L,
        ).firstOrNull { it.id == target }?.status ?: "occupied"

        return JSONObject()
            .put("ok", true)
            .put("message", "Moved on this tablet.")
            .put("source_table_id", source.toLongOrNull() ?: source)
            .put("target_table_id", target.toLongOrNull() ?: target)
            .put("source_status", sourceStatus)
            .put("target_status", targetStatus)
    }

    private fun canonicalHistory(uri: Uri): JSONObject {
        val scope = uri.getQueryParameter("scope").orEmpty()
        val tableId = uri.getQueryParameter("table_id")?.toLongOrNull()
        val from = uri.getQueryParameter("from").orEmpty()
        val to = uri.getQueryParameter("to").orEmpty()
        val cached = app.bootstrapRepository.historySnapshot()
        val source = cached?.optJSONArray("entries") ?: JSONArray()
        val entries = mutableListOf<JSONObject>()

        for (index in 0 until source.length()) {
            val entry = source.optJSONObject(index) ?: continue
            val entryTableId = entry.optLong("table_id", 0L)
            if (scope == "table" && tableId != null && entryTableId != tableId) {
                continue
            }
            if (scope == "pickup" && entryTableId > 0L) continue
            if (!historyDateMatches(entry.optString("time"), from, to)) continue
            entries += cloneObject(entry)
        }

        val locationId = app.bootstrapRepository.locationId() ?: 0L
        app.localPosRepository.pendingLocalOrders(locationId)
            .filter { (order, _) ->
                when {
                    order.serverId != null -> false
                    scope == "table" && tableId != null ->
                        order.tableId.toLongOrNull() == tableId
                    scope == "pickup" -> false
                    else -> true
                }
            }
            .forEach { (order, updatedAt) ->
                val time = instantString(updatedAt)
                if (!historyDateMatches(time, from, to)) return@forEach
                val items = canonicalDraftItems(order)
                val bill = app.localPosRepository.billForTable(order.tableId)
                val payments = JSONArray()
                if ((bill?.paymentQueuedMinor ?: 0L) > 0L) {
                    payments.put(
                        JSONObject()
                            .put("time", time)
                            .put("method", "cash")
                            .put(
                                "amount",
                                minorToMajor(bill?.paymentQueuedMinor ?: 0L),
                            )
                            .put("reference", ""),
                    )
                }

                entries += JSONObject()
                    .put("kind", "order")
                    .put("time", time)
                    .put(
                        "title",
                        "Order " + app.localPosRepository.pseudoOrderId(
                            order.localId,
                        ),
                    )
                    .put(
                        "order_id",
                        app.localPosRepository.pseudoOrderId(order.localId),
                    )
                    .put(
                        "table_id",
                        order.tableId.toLongOrNull() ?: JSONObject.NULL,
                    )
                    .put("total", minorToMajor(order.totalMinor))
                    .put("status", "Saved")
                    .put(
                        "settlement_status",
                        if (payments.length() > 0) "paid" else "unpaid",
                    )
                    .put("item_count", mergedQuantity(items))
                    .put(
                        "item_summary",
                        buildString {
                            for (index in 0 until minOf(items.length(), 8)) {
                                if (isNotEmpty()) append(", ")
                                val item = items.optJSONObject(index) ?: continue
                                append(item.optInt("quantity", 1))
                                append("× ")
                                append(item.optString("name", "Item"))
                            }
                        },
                    )
                    .put("items", items)
                    .put("notes", JSONArray().put(order.note).takeIf {
                        order.note.isNotBlank()
                    } ?: JSONArray())
                    .put("payments", payments)
            }

        entries.sortByDescending { parseTimeMillis(it.optString("time")) }

        return JSONObject()
            .put("ok", true)
            .put(
                "version",
                cached?.optString(
                    "version",
                    "pmd-mobile-history-v2",
                ) ?: "pmd-mobile-history-v2",
            )
            .put("scope", scope.ifBlank { "all" })
            .put(
                "scope_label",
                if (scope == "table" && tableId != null) {
                    "Table $tableId"
                } else {
                    "All tables"
                },
            )
            .put(
                "entries",
                JSONArray().apply {
                    entries.forEach(::put)
                },
            )
    }

    private fun findCanonicalTable(
        root: JSONObject,
        tableId: String,
    ): JSONObject? {
        val tables = canonicalTables(root)
        for (index in 0 until tables.length()) {
            val table = tables.optJSONObject(index) ?: continue
            if (table.opt("id")?.toString() == tableId) {
                return table
            }
        }
        return null
    }

    private fun tableIdForOrder(orderId: Long): String? {
        if (orderId < 0L) {
            return app.localPosRepository.tableForPseudoOrderId(orderId)
        }

        app.localPosRepository.tableIdForServerOrder(orderId)?.let {
            return it
        }

        val root = app.bootstrapRepository.bootstrapSnapshot() ?: return null
        val orders = root.optJSONArray("open_orders") ?: return null
        for (index in 0 until orders.length()) {
            val order = orders.optJSONObject(index) ?: continue
            if (order.optLong("order_id", 0L) == orderId) {
                return order.opt("table_id")?.toString()
            }
        }

        return null
    }

    private fun canonicalDraftItems(
        order: com.paymydine.mobile.data.local.DraftOrder,
    ): JSONArray = JSONArray().apply {
        order.lines.forEach { line ->
            put(
                JSONObject()
                    .put(
                        "order_menu_id",
                        app.localPosRepository.pseudoLineId(line.lineId),
                    )
                    .put(
                        "menu_id",
                        line.itemId.toLongOrNull() ?: line.itemId,
                    )
                    .put("name", line.name)
                    .put("quantity", line.quantity)
                    .put("price", minorToMajor(line.unitPriceMinor))
                    .put(
                        "subtotal",
                        minorToMajor(
                            line.unitPriceMinor * line.quantity,
                        ),
                    )
                    .put("comment", line.note),
            )
        }
    }

    // PMD_ANDROID_CLOUD_LINE_EDIT_V106
    // Existing Cloud lines keep their canonical order_menu_id. The tablet queues
    // only a quantity intent; modifiers/options are never reconstructed locally.
    private fun canonicalServerItemMutationV106(
        orderId: Long,
        payload: JSONObject,
        increase: Boolean,
    ): JSONObject {
        require(orderId > 0L) { "This check is unavailable." }
        val tableId = tableIdForOrder(orderId)
            ?: error("This check is not available on this tablet.")
        require(
            !app.syncRepository.hasActiveOrderCommand(
                orderId,
                "CASH_PAYMENT_V1",
            ),
        ) {
            "Cash is already queued for this check. Sync/review it before changing items."
        }

        val tableData = canonicalTableData(tableId)
        val orders = tableData.optJSONArray("open_orders") ?: JSONArray()
        var order: JSONObject? = null
        for (index in 0 until orders.length()) {
            val candidate = orders.optJSONObject(index) ?: continue
            if (candidate.optLong("order_id", 0L) == orderId) {
                order = candidate
                break
            }
        }
        val currentOrder = order ?: error("This check is unavailable.")
        val settlement = currentOrder.optString("settlement_status", "unpaid")
            .trim()
            .lowercase()
        val settledAmount = currentOrder.optDouble("settled_amount", 0.0)
        val operational = currentOrder.optString("status_name")
            .trim()
            .lowercase()
        require(
            settledAmount <= 0.0001 &&
                settlement !in setOf(
                    "partial",
                    "paid",
                    "settled",
                    "closed",
                    "cancelled",
                    "canceled",
                    "refunded",
                ),
        ) {
            "Payment has already started. Ordered item quantities are locked."
        }
        require(
            !Regex("prepar|cook|delivery|ready|served|cancel|void|closed|complete")
                .containsMatchIn(operational),
        ) {
            "Kitchen preparation has started or this order is closed. Ordered item quantities are locked."
        }

        val itemId = payload.optLong("order_menu_id", 0L)
        require(itemId > 0L) { "This ordered item is unavailable." }
        val items = currentOrder.optJSONArray("items") ?: JSONArray()
        var item: JSONObject? = null
        for (index in 0 until items.length()) {
            val candidate = items.optJSONObject(index) ?: continue
            if (
                candidate.optLong(
                    "order_menu_id",
                    candidate.optLong("id", 0L),
                ) == itemId
            ) {
                item = candidate
                break
            }
        }
        val currentItem = item ?: error("This ordered item is unavailable.")
        val currentQty = currentItem.optInt("quantity", 0).coerceAtLeast(0)
        val changeQty = payload.optInt("quantity", 1).coerceIn(1, 99)
        val delta = if (increase) changeQty else -changeQty
        val nextQty = currentQty + delta
        require(nextQty in 0..99) { "Item quantity is outside the allowed range." }

        val currentSubtotal = currentItem.optDouble("subtotal", 0.0)
        val unitPrice = if (currentQty > 0 && currentSubtotal > 0.0) {
            currentSubtotal / currentQty
        } else {
            currentItem.optDouble(
                "price",
                currentItem.optDouble("unit_price", 0.0),
            )
        }
        val serverBaseVersion = currentOrder.optLong("aggregate_version", 0L)
        val baseVersion = app.syncRepository.nextAggregateBaseVersion(
            "order:$orderId",
            serverBaseVersion,
        )
        val host = app.credentials.tenantHost()
            ?: error("This tablet is not paired.")
        val deviceId = app.credentials.deviceId()
            ?: error("This tablet is not paired.")
        val session = app.credentials.staffSession()
            ?: error("Sign in again to continue.")
        val nowMs = System.currentTimeMillis()
        val commandPayload = JSONObject()
            .put("action", if (increase) "increase" else "void")
            .put("order_id", orderId)
            .put("order_menu_id", itemId)
            .put("quantity", changeQty)
            .put("unit_price_minor", majorToMinor(unitPrice))
            .put(
                "expected_updated_at",
                currentOrder.optString("updated_at"),
            )
        if (!increase) {
            commandPayload.put(
                "reason",
                payload.optString(
                    "reason",
                    "Quick POS quantity correction before kitchen preparation",
                ),
            )
        }
        commandPayload.put(
            "undo_quantity_correction",
            payload.optBoolean("undo_quantity_correction", false),
        )

        val command = CommandEnvelope.create(
            tenantHost = host,
            locationId = app.bootstrapRepository.locationId()
                ?: error("Restaurant data is not available on this tablet."),
            deviceId = deviceId,
            staffId = session.staffId,
            userId = session.userId,
            aggregate = "order",
            aggregateId = "order:$orderId",
            baseVersion = baseVersion,
            commandType = "ORDER_ITEM_ADJUST_V1",
            payloadJson = commandPayload.toString(),
            nowMs = nowMs,
        )
        check(app.syncRepository.enqueue(command)) {
            "This item change is already saved."
        }
        SyncEngine.enqueueImmediate(app)

        val oldTotal = currentOrder.optDouble(
            "order_total",
            currentOrder.optDouble("total", 0.0),
        )
        val nextSubtotal = maxOf(0.0, unitPrice * nextQty)
        val nextTotal = maxOf(0.0, oldTotal + (unitPrice * delta))
        val oldTotalItems = currentOrder.optInt("total_items", 0)
        return JSONObject()
            .put("ok", true)
            .put("order_id", orderId)
            .put("order_menu_id", itemId)
            .put("new_quantity", nextQty)
            .put("remaining_quantity", nextQty)
            .put("line_subtotal", nextSubtotal)
            .put("order_total", nextTotal)
            .put(
                "total_items",
                maxOf(0, oldTotalItems + delta),
            )
            .put("updated_at", currentOrder.optString("updated_at"))
            .put("native_reconciliation_pending", true)
            .put(
                "message",
                if (increase) "Quantity saved locally."
                else "Quantity correction saved locally.",
            )
    }

    private fun projectPendingItemAdjustmentsV106(
        source: JSONObject,
    ): JSONObject {
        val order = cloneObject(source)
        val orderId = order.optLong("order_id", 0L)
        if (orderId < 1L) return order

        val pending = app.syncRepository.pendingItemAdjustments(orderId)
        if (pending.isEmpty()) return order

        val items = cloneArray(order.optJSONArray("items"))
        var totalDeltaMinor = 0L
        var quantityDelta = 0
        pending.forEach { adjustment ->
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                val itemId = item.optLong(
                    "order_menu_id",
                    item.optLong("id", 0L),
                )
                if (itemId != adjustment.orderMenuId) continue

                val oldQty = item.optInt("quantity", 0).coerceAtLeast(0)
                val newQty = maxOf(0, oldQty + adjustment.delta)
                val unitMinor = if (adjustment.unitPriceMinor > 0L) {
                    adjustment.unitPriceMinor
                } else {
                    val subtotal = item.optDouble("subtotal", 0.0)
                    majorToMinor(
                        if (oldQty > 0 && subtotal > 0.0) subtotal / oldQty
                        else item.optDouble("price", 0.0),
                    )
                }
                val appliedDelta = newQty - oldQty
                item
                    .put("quantity", newQty)
                    .put(
                        "subtotal",
                        minorToMajor(unitMinor * newQty),
                    )
                    .put("native_reconciliation_pending", true)
                totalDeltaMinor += unitMinor * appliedDelta
                quantityDelta += appliedDelta
                break
            }
        }

        val baseTotalMinor = majorToMinor(
            order.optDouble(
                "order_total",
                order.optDouble("total", 0.0),
            ),
        )
        order
            .put("items", items)
            .put(
                "order_total",
                minorToMajor(maxOf(0L, baseTotalMinor + totalDeltaMinor)),
            )
            .put(
                "total",
                minorToMajor(maxOf(0L, baseTotalMinor + totalDeltaMinor)),
            )
            .put(
                "total_items",
                maxOf(0, order.optInt("total_items", 0) + quantityDelta),
            )
            .put("native_item_adjust_pending", true)
        return order
    }

    // PMD_ANDROID_PROVISIONAL_ITEM_MUTATION_V23
    // Before first Cloud reconciliation, the queued SEND/HOLD payload itself is
    // the canonical local mutation. Rewriting it preserves one idempotent
    // command and lets +/- work immediately on the same visible check.
    private fun canonicalProvisionalItemMutation(
        orderId: Long,
        payload: JSONObject,
        increase: Boolean,
    ): JSONObject {
        val itemId = payload.optLong("order_menu_id", 0L)
        require(itemId < 0L) {
            "This local ordered item is unavailable."
        }

        val updated = app.localPosRepository.adjustQueuedProvisionalLine(
            pseudoOrderId = orderId,
            pseudoLineId = itemId,
            delta = if (increase) 1 else -1,
        )
        val changedLine = updated.lines.firstOrNull {
            app.localPosRepository.pseudoLineId(it.lineId) == itemId
        }
        val updatedAtMs = app.localPosRepository.localWorkUpdatedAtMs(
            updated.tableId,
        )

        return JSONObject()
            .put("ok", true)
            .put("order_id", orderId)
            .put("order_menu_id", itemId)
            .put("new_quantity", changedLine?.quantity ?: 0)
            .put("remaining_quantity", changedLine?.quantity ?: 0)
            .put(
                "line_subtotal",
                minorToMajor(
                    (changedLine?.unitPriceMinor ?: 0L) *
                        (changedLine?.quantity ?: 0),
                ),
            )
            .put("order_total", minorToMajor(updated.totalMinor))
            .put("total_items", updated.lines.sumOf { it.quantity })
            .put("updated_at", instantString(updatedAtMs))
            .put(
                "message",
                if (increase) "Quantity increased."
                else "Quantity reduced.",
            )
    }

    private fun canonicalPaymentItems(items: JSONArray): JSONArray =
        JSONArray().apply {
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                val quantity = item.optDouble("quantity", 1.0)
                val subtotal = item.optDouble(
                    "subtotal",
                    item.optDouble("line_subtotal", 0.0),
                )
                val unit = item.optDouble(
                    "price",
                    item.optDouble(
                        "unit_price",
                        if (quantity > 0) subtotal / quantity else 0.0,
                    ),
                )
                put(
                    JSONObject()
                        .put(
                            "order_menu_id",
                            item.optLong(
                                "order_menu_id",
                                -(index + 1L),
                            ),
                        )
                        .put("menu_id", item.optLong("menu_id", 0L))
                        .put("name", item.optString("name", "Item"))
                        .put("quantity", quantity)
                        .put("paid_quantity", 0)
                        .put("unpaid_quantity", quantity)
                        .put("unit_price", unit)
                        .put("line_subtotal", subtotal)
                        .put("unpaid_subtotal", subtotal)
                        .put("unpaid_gross", subtotal)
                        .put("comment", item.optString("comment")),
                )
            }
        }

    private fun cloneObject(value: JSONObject?): JSONObject =
        if (value == null) JSONObject() else JSONObject(value.toString())

    private fun cloneArray(value: JSONArray?): JSONArray =
        if (value == null) JSONArray() else JSONArray(value.toString())

    private fun mergedQuantity(items: JSONArray): Int {
        var total = 0
        for (index in 0 until items.length()) {
            total += items.optJSONObject(index)
                ?.optInt("quantity", 1)
                ?.coerceAtLeast(1)
                ?: 0
        }
        return total
    }

    private fun currencySymbol(): String =
        when (app.bootstrapRepository.currencyCode().uppercase()) {
            "EUR" -> "€"
            "USD" -> "$"
            "GBP" -> "£"
            "CHF" -> "CHF "
            else -> app.bootstrapRepository.currencyCode() + " "
        }

    private fun minorToMajor(value: Long): Double = value.toDouble() / 100.0

    private fun majorToMinor(value: Double): Long =
        kotlin.math.round(value * 100.0).toLong()

    private fun instantString(value: Long): String =
        if (value > 0L) Instant.ofEpochMilli(value).toString() else ""

    private fun parseTimeMillis(value: String): Long =
        runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)

    private fun historyDateMatches(
        value: String,
        from: String,
        to: String,
    ): Boolean {
        val date = value.take(10)
        if (date.length != 10) return true
        if (from.isNotBlank() && date < from) return false
        if (to.isNotBlank() && date > to) return false
        return true
    }

    private fun unavailable(message: String): JSONObject =
        JSONObject()
            .put("ok", false)
            .put("status", 409)
            .put("message", message)

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
    fun queueSendAndCash(
        tableId: String,
        cashReceivedMinor: Long,
    ): String = action {
        val draft = app.localPosRepository.draftForTable(tableId)
            ?: error("Add items first.")
        val host = app.credentials.tenantHost()
            ?: error("Pair this device first.")
        val deviceId = app.credentials.deviceId()
            ?: error("Pair this device first.")
        val session = app.credentials.staffSession()
            ?: error("Verified staff session is unavailable.")

        val send = app.localPosRepository.buildSendCommand(
            draft = draft,
            tenantHost = host,
            deviceId = deviceId,
            staffId = session.staffId,
            userId = session.userId,
            hold = false,
        )
        val (cash, amountMinor) =
            app.localPosRepository.buildCashPaymentAfterSendCommand(
                draft = draft,
                sendCommand = send,
                tenantHost = host,
                deviceId = deviceId,
                staffId = session.staffId,
                userId = session.userId,
                cashReceivedMinor = cashReceivedMinor,
            )

        check(
            app.syncRepository.enqueueOrdered(
                listOf(send, cash),
            ),
        ) {
            "Order/payment sequence could not be queued."
        }

        app.localPosRepository.markQueued(draft.localId)
        app.localPosRepository.markCashPaymentQueued(
            tableId = tableId,
            commandId = cash.commandId,
            amountMinor = amountMinor,
        )
        SyncEngine.enqueueImmediate(app)
        "Order and cash payment saved locally in sequence."
    }

    @JavascriptInterface
    fun queueCashPayment(
        tableId: String,
        cashReceivedMinor: Long,
    ): String = action {
        val host = app.credentials.tenantHost()
            ?: error("Pair this device first.")
        val deviceId = app.credentials.deviceId()
            ?: error("Pair this device first.")
        val staffSession = app.credentials.staffSession()
            ?: error("Verified staff session is unavailable.")
        val bill = app.localPosRepository.billForTable(tableId)
            ?: error("No open bill is available.")
        val amountMinor = bill.remainingMinor
        require(amountMinor > 0L) {
            "This bill has no remaining balance."
        }

        val command = app.localPosRepository.buildCashPaymentCommand(
            tableId = tableId,
            tenantHost = host,
            deviceId = deviceId,
            staffId = staffSession.staffId,
            userId = staffSession.userId,
            cashReceivedMinor = cashReceivedMinor,
        )
        check(app.syncRepository.enqueue(command)) {
            "This cash payment is already queued."
        }
        app.localPosRepository.markCashPaymentQueued(
            tableId = tableId,
            commandId = command.commandId,
            amountMinor = amountMinor,
        )
        SyncEngine.enqueueImmediate(app)
        "Cash payment saved locally and queued for Cloud."
    }

    @JavascriptInterface
    fun queueTableState(
        tableId: String,
        status: String,
        skipCleaning: Boolean,
    ): String = action {
        val host = app.credentials.tenantHost()
            ?: error("Pair this device first.")
        val deviceId = app.credentials.deviceId()
            ?: error("Pair this device first.")
        val session = app.credentials.staffSession()
            ?: error("Verified staff session is unavailable.")

        val command = app.localPosRepository.buildTableStateCommand(
            tableId = tableId,
            status = status,
            skipCleaning = skipCleaning,
            tenantHost = host,
            deviceId = deviceId,
            staffId = session.staffId,
            userId = session.userId,
        )
        check(app.syncRepository.enqueue(command)) {
            "This table action is already queued."
        }
        app.localPosRepository.markTableStateQueued(
            tableId,
            status.trim().lowercase(),
            command.commandId,
        )
        SyncEngine.enqueueImmediate(app)
        "Table update saved locally and queued."
    }

    @JavascriptInterface
    fun queueTableMove(
        sourceTableId: String,
        targetTableId: String,
        scope: String,
    ): String = action {
        val host = app.credentials.tenantHost()
            ?: error("Pair this device first.")
        val deviceId = app.credentials.deviceId()
            ?: error("Pair this device first.")
        val session = app.credentials.staffSession()
            ?: error("Verified staff session is unavailable.")

        val command = app.localPosRepository.buildTableMoveCommand(
            sourceTableId = sourceTableId,
            targetTableId = targetTableId,
            scope = scope,
            tenantHost = host,
            deviceId = deviceId,
            staffId = session.staffId,
            userId = session.userId,
        )
        check(app.syncRepository.enqueue(command)) {
            "This move is already queued."
        }
        val payload = JSONObject(command.payloadJson)
        app.localPosRepository.markTableMoveQueued(
            sourceTableId = sourceTableId,
            targetTableId = targetTableId,
            scope = payload.optString("scope", "order"),
            orderId = payload.optLong("order_id", 0L)
                .takeIf { it > 0L },
            commandId = command.commandId,
        )
        SyncEngine.enqueueImmediate(app)
        "Move saved locally and queued."
    }

    @JavascriptInterface
    fun cloudMutationCommitted(
        url: String,
        method: String,
    ) {
        if (method.trim().uppercase() == "GET") return
        app.bootstrapRepository.markStale()
        SyncEngine.enqueueImmediate(app)
    }

    @JavascriptInterface
    fun syncNow(): String = action {
        SyncEngine.enqueueImmediate(app)
        "Sync requested."
    }

    // PMD_ANDROID_POS_REQUEST_FAILOVER_V21
    // Quick POS can discover a dead Cloud path before Android connectivity
    // callbacks fire. Promote the native transport immediately so the same
    // Activity/WebView remains on SQLite for all following requests.
    @JavascriptInterface
    fun activateLocalTransport() {
        activity.runOnUiThread(onRequireLocalTransport)
    }

    @JavascriptInterface
    fun cloudAvailable(): Boolean = app.connectivity.isOnlineNow()

    @JavascriptInterface
    fun localUiReady() {
        activity.runOnUiThread(onLocalUiReady)
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
            .put("status", 422)
            .put("message", cashierMessage(error.message))
            .toString()

    // PMD_ANDROID_CASHIER_SAFE_MESSAGES_V18
    // Repository/sync terminology is useful in logs, not at the till.
    private fun cashierMessage(raw: String?): String {
        val value = raw.orEmpty().trim()
        if (value.isBlank()) return "This action could not be completed."

        val lower = value.lowercase()
        return when {
            "snapshot" in lower ->
                "Offline restaurant data is not ready yet."
            "pair this device" in lower ||
                "not paired" in lower ->
                "This tablet needs to reconnect before this action."
            "verified staff session" in lower ->
                "Sign in again to continue."
            "already queued" in lower ||
                "waiting to retry" in lower ||
                "command is pending" in lower ||
                "order queued" in lower ->
                "Already saved. Waiting to sync."
            "reconciliation" in lower ||
                "aggregate_version" in lower ||
                "conflict" in lower ->
                "This check changed elsewhere. Reconnect before editing it."
            "idempot" in lower ->
                "Already saved."
            "http " in lower ||
                "exception" in lower ||
                "socket" in lower ||
                "ssl" in lower ||
                "dns" in lower ->
                "Connection is unavailable. Keep working offline."
            "invalid table id" in lower ->
                "This table is not available."
            "menu item is no longer available" in lower ||
                "menu item is unavailable" in lower ->
                "This item is no longer available."
            else -> value.take(180)
        }
    }
}
