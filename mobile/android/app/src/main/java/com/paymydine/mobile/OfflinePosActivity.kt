package com.paymydine.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.sync.SyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/**
 * PMD_ANDROID_OFFLINE_POS_V2_CANONICAL_UI
 *
 * Offline POS uses the same pmd-qpos DOM/class contract and the exact canonical
 * pmd-quick-pos-v1.css shipped by the web platform. Only the data/command
 * transport changes: Cloud WebView online, SQLite/Restaurant Edge bridge
 * offline. This prevents the offline product from becoming a second UI.
 *
 * No device bearer token, username or password is exposed to JavaScript.
 * Payments remain fail-closed and can only jump back to canonical Cloud POS.
 */
class OfflinePosActivity : ComponentActivity() {
    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    private lateinit var webView: WebView
    private var sawOfflineSignal = false
    private var returningToCloud = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (
            !app.bootstrapRepository.hasBootstrap() ||
            !app.credentials.offlineSessionValid("pos")
        ) {
            startActivity(
                Intent(this, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP,
                    )
                },
            )
            finish()
            return
        }

        sawOfflineSignal = !app.connectivity.online.value

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(244, 246, 248))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = false
                databaseEnabled = false
                allowFileAccess = true
                allowContentAccess = false
                blockNetworkLoads = true
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
            }
            addJavascriptInterface(OfflineBridge(), "PayMyDineOffline")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    return !request.url.toString()
                        .startsWith("file:///android_asset/")
                }
            }
            loadUrl("file:///android_asset/pmd-offline-pos.html")
        }
        setContentView(webView)

        SyncEngine.enqueueImmediate(app)
        observeConnectivity()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("PayMyDineOffline")
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.removeAllViews()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun observeConnectivity() {
        lifecycleScope.launch {
            app.connectivity.online.collectLatest { online ->
                if (!online) {
                    sawOfflineSignal = true
                    refreshWeb()
                    return@collectLatest
                }

                refreshWeb()

                // Preserve the proven V15/V16 behavior: after a real WAN
                // outage, drain local commands and return to canonical Cloud POS.
                if (!sawOfflineSignal || returningToCloud) {
                    return@collectLatest
                }

                delay(900)
                if (app.connectivity.online.value) {
                    returnToCloud()
                }
            }
        }
    }

    private fun refreshWeb() {
        if (!::webView.isInitialized || isFinishing || isDestroyed) return
        webView.post {
            webView.evaluateJavascript(
                "if(window.pmdOfflineRefresh){window.pmdOfflineRefresh();}",
                null,
            )
        }
    }

    private fun returnToCloud() {
        if (returningToCloud || isFinishing || isDestroyed) return
        if (!app.connectivity.online.value) return

        returningToCloud = true
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                runCatching { SyncEngine(app).runOnce() }
            }

            if (
                app.connectivity.online.value &&
                !isFinishing &&
                !isDestroyed
            ) {
                startActivity(
                    Intent(
                        this@OfflinePosActivity,
                        PosActivity::class.java,
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    },
                )
                finish()
            } else {
                returningToCloud = false
            }
        }
    }

    private inner class OfflineBridge {
        @JavascriptInterface
        fun snapshot(selectedTableId: String): String {
            return runCatching {
                val locationId = app.bootstrapRepository.locationId()
                    ?: error("Restaurant snapshot is unavailable.")
                val tables = app.localPosRepository.tables(locationId)
                val menu = app.localPosRepository.menu(locationId)
                val selected = selectedTableId
                    .trim()
                    .takeIf { id -> tables.any { it.id == id } }
                    ?: tables.firstOrNull()?.id
                val draft = selected?.let(app.localPosRepository::draftForTable)
                val bill = selected?.let(app.localPosRepository::billForTable)

                JSONObject()
                    .put("ok", true)
                    .put("location_name", app.bootstrapRepository.locationName().orEmpty())
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
                        "tables",
                        JSONArray().apply {
                            tables.forEach { table ->
                                put(
                                    JSONObject()
                                        .put("id", table.id)
                                        .put("number", table.number)
                                        .put("label", table.label)
                                        .put("status", table.status)
                                        .put("status_label", statusLabel(table.status)),
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
                                .put("status", it.status)
                                .put("version", it.version)
                                .put("base_total_minor", it.baseTotalMinor)
                                .put("pending_total_minor", it.pendingTotalMinor)
                                .put("currency", it.currency)
                        } ?: JSONObject.NULL,
                    )
                    .toString()
            }.getOrElse { errorJson(it) }
        }

        /**
         * PMD_ANDROID_OFFLINE_HISTORY_BRIDGE_V16
         *
         * History and product photos are served only from trusted local state.
         * No Cloud request is initiated from the offline WebView.
         */
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
        ): String {
            return action {
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
        }

        @JavascriptInterface
        fun changeQuantity(lineId: String, delta: Int): String =
            action {
                app.localPosRepository.changeQuantity(lineId, delta)
                "Check updated."
            }

        @JavascriptInterface
        fun setDraftMeta(
            localOrderId: String,
            guestCount: Int,
            note: String,
        ): String =
            action {
                app.localPosRepository.setDraftMeta(
                    localOrderId,
                    guestCount,
                    note,
                )
                "Check updated."
            }

        @JavascriptInterface
        fun queueOrder(tableId: String, hold: Boolean): String =
            action {
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
                    "Order saved to durable outbox."
                } else {
                    "Order queued safely."
                }
            }

        @JavascriptInterface
        fun syncNow(): String =
            action {
                SyncEngine.enqueueImmediate(app)
                "Sync requested."
            }

        @JavascriptInterface
        fun tryCloud() {
            runOnUiThread { returnToCloud() }
        }

        @JavascriptInterface
        fun workspaces() {
            runOnUiThread { finish() }
        }

        private fun action(block: () -> String): String =
            runCatching {
                JSONObject()
                    .put("ok", true)
                    .put("message", block())
                    .toString()
            }.getOrElse { errorJson(it) }
    }

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
                                .put("unit_price_minor", line.unitPriceMinor)
                                .put("note", line.note)
                                .put("option_ids", JSONArray(line.optionIds)),
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
                edge.fingerprintSha256.equals(pinned, ignoreCase = true)

        return when {
            app.connectivity.online.value -> "Cloud available"
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
            .put("message", error.message ?: "Local POS action failed.")
            .toString()

    companion object {
        const val EXTRA_REASON = "pmd.offline.reason"
    }
}
