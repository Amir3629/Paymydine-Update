package com.paymydine.mobile.edge

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.network.MobileApiException
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.sync.CommandEnvelope
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import kotlin.math.roundToLong

class EdgeHttpException(
    val statusCode: Int,
    override val message: String,
) : RuntimeException(message)

data class EdgePeer(
    val tokenHash: String,
    val tokenCiphertext: String,
    val deviceId: String,
    val locationId: Long,
    val profile: JSONObject,
    val expiresAtMs: Long,
) {
    fun surfaces(): Set<String> {
        val array = profile.optJSONObject("identity")
            ?.optJSONArray("surfaces")
            ?: JSONArray()

        return buildSet {
            for (index in 0 until array.length()) {
                val value = array.optString(index).trim().lowercase()
                if (value.isNotBlank()) add(value)
            }
        }
    }
}

class EdgeAuthority(
    private val app: PayMyDineApplication,
    private val cloudApi: MobileApiClient = MobileApiClient(),
    private val vault: EdgeSecretVault = EdgeSecretVault(),
) {
    private val database get() = app.database

    fun authenticate(rawBearer: String): EdgePeer {
        val token = rawBearer.trim()
        if (token.isBlank()) {
            throw EdgeHttpException(401, "PayMyDine device token required.")
        }

        val tokenHash = vault.hash(token)
        val now = System.currentTimeMillis()
        val localLocation = app.bootstrapRepository.locationId()
            ?: throw EdgeHttpException(503, "Primary Edge has no restaurant bootstrap.")

        val cached = database.readableDatabase.query(
            "pmd_edge_peers",
            null,
            "token_hash = ?",
            arrayOf(tokenHash),
            null,
            null,
            null,
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) null
            else EdgePeer(
                tokenHash = rows.getString(rows.getColumnIndexOrThrow("token_hash")),
                tokenCiphertext = rows.getString(rows.getColumnIndexOrThrow("token_ciphertext")),
                deviceId = rows.getString(rows.getColumnIndexOrThrow("device_id")),
                locationId = rows.getLong(rows.getColumnIndexOrThrow("location_id")),
                profile = JSONObject(rows.getString(rows.getColumnIndexOrThrow("profile_json"))),
                expiresAtMs = rows.getLong(rows.getColumnIndexOrThrow("profile_expires_at_ms")),
            )
        }

        if (
            cached != null
            && cached.locationId == localLocation
            && cached.expiresAtMs > now
        ) {
            database.writableDatabase.update(
                "pmd_edge_peers",
                ContentValues().apply {
                    put("token_ciphertext", vault.encrypt(token))
                    put("last_seen_at_ms", now)
                },
                "token_hash = ?",
                arrayOf(tokenHash),
            )
            return cached.copy(
                tokenCiphertext = vault.encrypt(token),
            )
        }

        if (!app.connectivity.online.value) {
            throw EdgeHttpException(
                401,
                "This device has not established a current offline trust snapshot with the restaurant Edge.",
            )
        }

        val tenantHost = app.credentials.tenantHost()
            ?: throw EdgeHttpException(503, "Primary Edge tenant is not configured.")

        val profile = try {
            cloudApi.bootstrap(tenantHost, token)
        } catch (error: MobileApiException) {
            throw EdgeHttpException(
                error.statusCode,
                error.message ?: "Cloud device verification failed.",
            )
        } catch (error: IOException) {
            throw EdgeHttpException(503, "Cloud device verification is unavailable.")
        }

        val locationId = profile.optJSONObject("location")
            ?.optLong("id", 0)
            ?: 0
        val identity = profile.optJSONObject("identity") ?: JSONObject()
        val deviceId = identity.opt("device_id")?.toString().orEmpty()

        if (locationId != localLocation || deviceId.isBlank()) {
            throw EdgeHttpException(
                403,
                "This PayMyDine device belongs to another restaurant.",
            )
        }

        val expiresAt = runCatching {
            Instant.parse(profile.optString("profile_expires_at")).toEpochMilli()
        }.getOrElse {
            now + 8L * 60L * 60L * 1000L
        }

        val encrypted = vault.encrypt(token)
        database.writableDatabase.insertWithOnConflict(
            "pmd_edge_peers",
            null,
            ContentValues().apply {
                put("token_hash", tokenHash)
                put("token_ciphertext", encrypted)
                put("device_id", deviceId)
                put("location_id", locationId)
                put("profile_json", profile.toString())
                put("profile_expires_at_ms", expiresAt)
                put("last_seen_at_ms", now)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )

        return EdgePeer(
            tokenHash = tokenHash,
            tokenCiphertext = encrypted,
            deviceId = deviceId,
            locationId = locationId,
            profile = profile,
            expiresAtMs = expiresAt,
        )
    }

    fun execute(rawBearer: String, request: JSONObject): JSONObject {
        val peer = authenticate(rawBearer)
        val command = commandFromRequest(peer, request)
        val requestHash = sha256(request.toString())
        val now = System.currentTimeMillis()

        val existing = findCommand(
            command.commandId,
            command.idempotencyKey,
        )

        if (existing != null) {
            val storedHash = existing.optString("request_hash")
            if (!storedHash.equals(requestHash, ignoreCase = true)) {
                throw EdgeHttpException(
                    409,
                    "This idempotency key was already used for a different command.",
                )
            }

            val status = existing.optString("status")
            val result = existing.optString("result_json")
            if (
                status in setOf(
                    STATUS_EDGE_APPLIED,
                    STATUS_CLOUD_APPLIED,
                    STATUS_CLOUD_REJECTED,
                )
                && result.isNotBlank()
            ) {
                return JSONObject(result).put(
                    "replayed",
                    true,
                )
            }

            val updatedAt = existing.optLong("updated_at_ms", now)
            if (status == STATUS_PROCESSING && updatedAt > now - 30_000L) {
                throw EdgeHttpException(
                    409,
                    "This command is already being processed by the restaurant Edge.",
                )
            }
        }

        database.writableDatabase.insertWithOnConflict(
            "pmd_edge_commands",
            null,
            ContentValues().apply {
                put("command_id", command.commandId)
                put("idempotency_key", command.idempotencyKey)
                put("request_hash", requestHash)
                put("peer_token_hash", peer.tokenHash)
                put("command_json", request.toString())
                put("status", STATUS_PROCESSING)
                putNull("result_json")
                putNull("last_error")
                put("created_at_ms", existing?.optLong("created_at_ms", now) ?: now)
                put("updated_at_ms", now)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )

        if (app.connectivity.online.value) {
            try {
                val cloud = cloudApi.sendCommand(
                    tenantHost = app.credentials.tenantHost()
                        ?: throw IOException("Tenant unavailable."),
                    deviceToken = rawBearer,
                    command = command,
                )
                cloud.put("authority", "cloud")
                cloud.put("provisional", false)

                markCommand(
                    command.commandId,
                    STATUS_CLOUD_APPLIED,
                    cloud,
                    null,
                )
                mirrorCloudResult(command, cloud)
                emit(
                    peer.locationId,
                    command.aggregate,
                    command.aggregateId,
                    cloud.optLong(
                        "aggregate_version",
                        command.baseVersion + 1,
                    ),
                    "CLOUD_COMMAND_APPLIED_V1",
                    JSONObject()
                        .put("command_id", command.commandId)
                        .put("cloud", cloud),
                )

                return cloud
            } catch (error: MobileApiException) {
                if (error.statusCode in 400..499 && error.statusCode !in listOf(408, 429)) {
                    val rejected = JSONObject()
                        .put("ok", false)
                        .put("authority", "cloud")
                        .put("provisional", false)
                        .put("error", "cloud_command_rejected")
                        .put("message", error.message ?: "Cloud rejected command.")

                    markCommand(
                        command.commandId,
                        STATUS_CLOUD_REJECTED,
                        rejected,
                        error.message,
                    )
                    throw EdgeHttpException(
                        error.statusCode,
                        error.message ?: "Cloud rejected command.",
                    )
                }
                // WAN/server outage: fall through to local restaurant authority.
            } catch (_: IOException) {
                // WAN outage: local Edge remains restaurant authority.
            }
        }

        val local = when (command.commandType) {
            "ORDER_SEND_V1", "ORDER_HOLD_V1" ->
                applyLocalOrder(peer, command)
            "KDS_STATUS_V1" ->
                applyLocalKds(peer, command)
            else -> throw EdgeHttpException(
                422,
                "This command is not certified for offline restaurant Edge.",
            )
        }

        local.put("authority", "edge")
        local.put("provisional", true)

        markCommand(
            command.commandId,
            STATUS_EDGE_APPLIED,
            local,
            null,
        )

        return local
    }

    fun events(
        rawBearer: String,
        after: Long,
        limit: Int = 250,
    ): JSONObject {
        val peer = authenticate(rawBearer)
        val safeLimit = limit.coerceIn(1, 500)

        val rows = database.readableDatabase.query(
            "pmd_edge_events",
            null,
            "location_id = ? AND sequence > ?",
            arrayOf(peer.locationId.toString(), after.coerceAtLeast(0).toString()),
            null,
            null,
            "sequence ASC",
            safeLimit.toString(),
        ).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(
                        JSONObject()
                            .put("sequence", cursor.getLong(cursor.getColumnIndexOrThrow("sequence")))
                            .put("event_id", cursor.getString(cursor.getColumnIndexOrThrow("event_id")))
                            .put("location_id", cursor.getLong(cursor.getColumnIndexOrThrow("location_id")))
                            .put("aggregate", cursor.getString(cursor.getColumnIndexOrThrow("aggregate")))
                            .put("aggregate_id", cursor.getString(cursor.getColumnIndexOrThrow("aggregate_id")))
                            .put("aggregate_version", cursor.getLong(cursor.getColumnIndexOrThrow("aggregate_version")))
                            .put("event_type", cursor.getString(cursor.getColumnIndexOrThrow("event_type")))
                            .put(
                                "payload",
                                JSONObject(
                                    cursor.getString(
                                        cursor.getColumnIndexOrThrow("payload_json"),
                                    ),
                                ),
                            )
                            .put("created_at_ms", cursor.getLong(cursor.getColumnIndexOrThrow("created_at_ms"))),
                    )
                }
            }
        }

        val next = rows.lastOrNull()?.optLong("sequence", after) ?: after

        return JSONObject()
            .put("ok", true)
            .put("protocol", "pmd-edge-v1")
            .put("authority", "edge")
            .put("events", JSONArray(rows))
            .put("cursor", next)
            .put("has_more", rows.size == safeLimit)
    }

    fun kdsSnapshot(
        rawBearer: String,
        stationSlug: String?,
    ): JSONObject {
        val peer = authenticate(rawBearer)
        requireSurface(peer, "kds")

        val statuses = kdsStatuses()
        val station = stationSlug
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { slug ->
                database.readableDatabase.query(
                    "pmd_kds_stations",
                    arrayOf("station_id", "name", "slug", "payload_json"),
                    "slug = ?",
                    arrayOf(slug),
                    null,
                    null,
                    null,
                    "1",
                ).use { rows ->
                    if (!rows.moveToFirst()) {
                        throw EdgeHttpException(404, "KDS station is unavailable.")
                    }
                    JSONObject()
                        .put("id", rows.getString(0))
                        .put("name", rows.getString(1))
                        .put("slug", rows.getString(2))
                        .put("config", JSONObject(rows.getString(3)))
                }
            }

        val stationId = station?.optString("id")?.takeIf { it.isNotBlank() }
        val stationCategories = station
            ?.optJSONObject("config")
            ?.optJSONArray("category_ids")
            ?.let(::longSet)
            ?: emptySet()

        val byKey = linkedMapOf<String, JSONObject>()

        // Cached canonical cloud KDS tickets from the primary Edge device.
        val cloudSelection: String
        val cloudArgs: Array<String>
        if (stationId != null) {
            cloudSelection = "location_id = ? AND station_id = ?"
            cloudArgs = arrayOf(peer.locationId.toString(), stationId)
        } else {
            cloudSelection = "location_id = ? AND station_id IS NULL"
            cloudArgs = arrayOf(peer.locationId.toString())
        }

        database.readableDatabase.query(
            "pmd_kds_tickets",
            arrayOf("order_id", "version", "payload_json"),
            cloudSelection,
            cloudArgs,
            null,
            null,
            "updated_at_ms ASC",
        ).use { rows ->
            while (rows.moveToNext()) {
                val payload = JSONObject(rows.getString(2))
                payload.put("aggregate_version", rows.getLong(1))
                byKey["order:" + rows.getString(0)] = payload
            }
        }

        // Offline/provisional Edge orders override stale cloud cache when they
        // represent the same canonical order.
        database.readableDatabase.query(
            "pmd_edge_orders",
            null,
            "location_id = ? AND status = ?",
            arrayOf(peer.locationId.toString(), "SENT"),
            null,
            null,
            "updated_at_ms ASC",
        ).use { rows ->
            while (rows.moveToNext()) {
                val aggregateId = rows.getString(
                    rows.getColumnIndexOrThrow("aggregate_id"),
                )
                val state = JSONObject(
                    rows.getString(rows.getColumnIndexOrThrow("payload_json")),
                )
                val visibleItems = filterKitchenItems(
                    state.optJSONArray("items") ?: JSONArray(),
                    stationCategories,
                )
                if (visibleItems.length() == 0) continue

                val serverOrderId = state.optLong("server_order_id", 0)
                val orderKey = if (serverOrderId > 0) {
                    "order:$serverOrderId"
                } else {
                    aggregateId
                }

                byKey[orderKey] = JSONObject()
                    .put(
                        "order_id",
                        if (serverOrderId > 0) serverOrderId else aggregateId,
                    )
                    .put("order_ref", aggregateId)
                    .put(
                        "order_type_name",
                        tableLabel(rows.getString(rows.getColumnIndexOrThrow("table_id"))),
                    )
                    .put("created_at", state.optString("created_at"))
                    .put("status_updated_at", state.optString("status_updated_at"))
                    .put("elapsed_time", elapsed(state.optLong("created_at_ms", 0)))
                    .put("status_id", state.optLong("status_id", 0))
                    .put("status_name", state.optString("status_name", "Received"))
                    .put("status_color", "")
                    .put("items", visibleItems)
                    .put("notes", state.optJSONArray("notes") ?: JSONArray())
                    .put(
                        "aggregate_version",
                        rows.getLong(rows.getColumnIndexOrThrow("version")),
                    )
                    .put("authority", "edge")
            }
        }

        return JSONObject()
            .put("ok", true)
            .put("version", "pmd-edge-kds-v1")
            .put("authority", "edge")
            .put("location_id", peer.locationId)
            .put(
                "station",
                station?.let {
                    JSONObject()
                        .put("id", it.optString("id"))
                        .put("name", it.optString("name"))
                        .put("slug", it.optString("slug"))
                },
            )
            .put("statuses", statuses)
            .put("orders", JSONArray(byKey.values.toList()))
            .put("generated_at", Instant.now().toString())
    }

    fun drainCloud(limit: Int = 50) {
        if (!app.connectivity.online.value) return
        val tenantHost = app.credentials.tenantHost() ?: return

        val pending = database.readableDatabase.query(
            "pmd_edge_commands",
            arrayOf(
                "command_id",
                "peer_token_hash",
                "command_json",
            ),
            "status = ?",
            arrayOf(STATUS_EDGE_APPLIED),
            null,
            null,
            "created_at_ms ASC",
            limit.coerceIn(1, 100).toString(),
        ).use { rows ->
            buildList {
                while (rows.moveToNext()) {
                    add(
                        Triple(
                            rows.getString(0),
                            rows.getString(1),
                            rows.getString(2),
                        ),
                    )
                }
            }
        }

        for ((commandId, tokenHash, rawJson) in pending) {
            val encrypted = database.readableDatabase.query(
                "pmd_edge_peers",
                arrayOf("token_ciphertext", "profile_json"),
                "token_hash = ?",
                arrayOf(tokenHash),
                null,
                null,
                null,
                "1",
            ).use { rows ->
                if (!rows.moveToFirst()) null
                else rows.getString(0) to rows.getString(1)
            } ?: continue

            val token = vault.decrypt(encrypted.first) ?: continue
            val peerProfile = JSONObject(encrypted.second)
            val request = JSONObject(rawJson)

            val cloudRequest = prepareCloudRequest(request)
                ?: continue
            val peer = peerFromProfile(tokenHash, encrypted.first, peerProfile)
            val command = commandFromRequest(peer, cloudRequest)

            try {
                val cloud = cloudApi.sendCommand(
                    tenantHost,
                    token,
                    command,
                )
                cloud.put("authority", "cloud")
                cloud.put("provisional", false)

                markCommand(
                    commandId,
                    STATUS_CLOUD_APPLIED,
                    cloud,
                    null,
                )
                mirrorCloudResult(command, cloud)

                emit(
                    peer.locationId,
                    "order",
                    request.optString("aggregate_id"),
                    cloud.optLong("aggregate_version", 0),
                    "CLOUD_RECONCILED_V1",
                    JSONObject()
                        .put(
                            "local_aggregate_id",
                            request.optString("aggregate_id"),
                        )
                        .put("cloud", cloud),
                )
            } catch (error: MobileApiException) {
                if (error.statusCode in listOf(409, 422, 403)) {
                    val rejected = JSONObject()
                        .put("ok", false)
                        .put("authority", "cloud")
                        .put("provisional", false)
                        .put("error", "reconciliation_required")
                        .put("message", error.message ?: "Cloud reconciliation rejected.")

                    markCommand(
                        commandId,
                        STATUS_CLOUD_REJECTED,
                        rejected,
                        error.message,
                    )

                    emit(
                        peer.locationId,
                        "order",
                        request.optString("aggregate_id"),
                        request.optLong("base_version", 0),
                        "RECONCILIATION_REQUIRED_V1",
                        JSONObject()
                            .put("command_id", commandId)
                            .put("message", error.message ?: "Cloud reconciliation rejected."),
                    )
                }
            } catch (_: IOException) {
                return
            }
        }
    }

    private fun applyLocalOrder(
        peer: EdgePeer,
        command: CommandEnvelope,
    ): JSONObject {
        requireAnySurface(peer, setOf("pos", "waiter", "manager"))

        val payload = JSONObject(command.payloadJson)
        val tableId = payload.opt("table_id")?.toString()?.trim().orEmpty()
        if (tableId.isBlank()) {
            throw EdgeHttpException(422, "Restaurant table is required.")
        }

        val tableExists = database.readableDatabase.query(
            "pmd_tables",
            arrayOf("id"),
            "id = ? AND location_id = ?",
            arrayOf(tableId, peer.locationId.toString()),
            null,
            null,
            null,
            "1",
        ).use { it.moveToFirst() }

        if (!tableExists) {
            throw EdgeHttpException(422, "Restaurant table is not in the Edge snapshot.")
        }

        val existing = edgeOrder(command.aggregateId)
        if (existing == null && !command.aggregateId.startsWith("local:")) {
            throw EdgeHttpException(
                409,
                "This existing cloud order is not mirrored on the restaurant Edge. Refresh while online before editing it offline.",
            )
        }

        val currentVersion = existing?.optLong("version", 0) ?: 0
        if (currentVersion != command.baseVersion) {
            throw EdgeHttpException(
                409,
                "This order changed on another restaurant device. Refresh before sending.",
            )
        }

        val items = payload.optJSONArray("items") ?: JSONArray()
        if (items.length() == 0) {
            throw EdgeHttpException(422, "Add at least one item.")
        }

        val currency = localCurrency()
        val exponent = localMinorExponent()
        val normalized = JSONArray()
        var addedTotal = 0L

        for (index in 0 until items.length()) {
            val input = items.optJSONObject(index) ?: continue
            val menuId = input.opt("menu_id")?.toString()?.trim().orEmpty()
            val qty = input.optInt("quantity", 1).coerceIn(1, 99)
            if (menuId.isBlank()) continue

            val menu = localMenu(menuId, peer.locationId)
                ?: throw EdgeHttpException(
                    422,
                    "Menu item $menuId is not available in the restaurant Edge snapshot.",
                )

            val menuPayload = JSONObject(menu.third)
            val selectedIds = longSet(
                input.optJSONArray("options") ?: JSONArray(),
            )
            val optionResult = validateOptions(
                menuPayload,
                selectedIds,
                exponent,
            )

            val unitMinor = menu.second + optionResult.second
            val subtotal = unitMinor * qty
            addedTotal += subtotal

            normalized.put(
                JSONObject()
                    .put("menu_id", menuId)
                    .put("name", menu.first)
                    .put("quantity", qty)
                    .put("unit_price_minor", unitMinor)
                    .put("subtotal_minor", subtotal)
                    .put("comment", input.optString("comment"))
                    .put("options", optionResult.first)
                    .put(
                        "category_ids",
                        menuPayload.optJSONArray("category_ids") ?: JSONArray(),
                    ),
            )
        }

        if (normalized.length() == 0) {
            throw EdgeHttpException(422, "No valid menu items were added.")
        }

        val now = System.currentTimeMillis()
        val previousState = existing?.optJSONObject("state") ?: JSONObject()
        val existingItems = previousState.optJSONArray("items") ?: JSONArray()
        for (index in 0 until normalized.length()) {
            existingItems.put(normalized.get(index))
        }

        val newVersion = currentVersion + 1
        val mode = if (command.commandType == "ORDER_HOLD_V1") "hold" else "send"
        val statusName = if (mode == "hold") "Held" else "Received"
        val statusId = if (mode == "send") kdsStatusId("Received") else 0L
        val totalMinor = (existing?.optLong("total_minor", 0) ?: 0) + addedTotal

        val state = previousState
            .put("aggregate_id", command.aggregateId)
            .put("table_id", tableId)
            .put("guest_count", payload.optInt("guest_count", 1).coerceIn(1, 99))
            .put("note", payload.optString("note"))
            .put("items", existingItems)
            .put("status_id", statusId)
            .put("status_name", statusName)
            .put("created_at_ms", previousState.optLong("created_at_ms", now))
            .put(
                "created_at",
                previousState.optString("created_at").ifBlank {
                    Instant.ofEpochMilli(now).toString()
                },
            )
            .put("status_updated_at", Instant.ofEpochMilli(now).toString())

        database.writableDatabase.insertWithOnConflict(
            "pmd_edge_orders",
            null,
            ContentValues().apply {
                put("aggregate_id", command.aggregateId)
                put("location_id", peer.locationId)
                put("table_id", tableId)
                put("status", if (mode == "hold") "HELD" else "SENT")
                put("version", newVersion)
                put("total_minor", totalMinor)
                put("currency", currency)
                put("payload_json", state.toString())
                put("created_at_ms", previousState.optLong("created_at_ms", now))
                put("updated_at_ms", now)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )

        val result = JSONObject()
            .put("order_ref", command.aggregateId)
            .put("table_id", tableId)
            .put("mode", mode)
            .put("order_total_minor", totalMinor)
            .put(
                "order_total",
                totalMinor / Math.pow(10.0, exponent.toDouble()),
            )
            .put("currency", currency)
            .put("status_id", statusId)
            .put("status_name", statusName)
            .put("updated_at", Instant.ofEpochMilli(now).toString())

        val event = emit(
            peer.locationId,
            "order",
            command.aggregateId,
            newVersion,
            if (mode == "hold") "ORDER_HELD_EDGE_V1" else "ORDER_SENT_EDGE_V1",
            JSONObject()
                .put("command_id", command.commandId)
                .put("client_aggregate_id", command.aggregateId)
                .put("order", result)
                .put("edge_order", state),
        )

        return JSONObject()
            .put("ok", true)
            .put("protocol", "pmd-edge-v1")
            .put("command_id", command.commandId)
            .put("idempotency_key", command.idempotencyKey)
            .put("aggregate", "order")
            .put("aggregate_id", command.aggregateId)
            .put("aggregate_version", newVersion)
            .put("sequence", event.first)
            .put("event_id", event.second)
            .put("replayed", false)
            .put("result", result)
    }

    private fun applyLocalKds(
        peer: EdgePeer,
        command: CommandEnvelope,
    ): JSONObject {
        requireSurface(peer, "kds")

        val payload = JSONObject(command.payloadJson)
        val expectedStatus = payload.optLong("expected_status_id", 0)
        val newStatus = payload.optLong("status_id", 0)
        if (expectedStatus < 1 || newStatus < 1) {
            throw EdgeHttpException(
                422,
                "KDS expected and new status are required.",
            )
        }

        var existing = edgeOrder(command.aggregateId)

        if (existing == null && command.aggregateId.startsWith("order:")) {
            val serverId = command.aggregateId.removePrefix("order:")
            val cached = cachedKdsTicket(serverId)
            if (cached != null) {
                val now = System.currentTimeMillis()
                database.writableDatabase.insertWithOnConflict(
                    "pmd_edge_orders",
                    null,
                    ContentValues().apply {
                        put("aggregate_id", command.aggregateId)
                        put("location_id", peer.locationId)
                        put("table_id", "")
                        put("status", "SENT")
                        put("version", command.baseVersion)
                        put("total_minor", 0)
                        put("currency", localCurrency())
                        put("payload_json", cached.toString())
                        put("created_at_ms", now)
                        put("updated_at_ms", now)
                    },
                    SQLiteDatabase.CONFLICT_REPLACE,
                )
                existing = edgeOrder(command.aggregateId)
            }
        }

        if (existing == null) {
            throw EdgeHttpException(
                409,
                "This kitchen order is not mirrored on the restaurant Edge.",
            )
        }

        val currentVersion = existing.optLong("version", 0)
        if (currentVersion != command.baseVersion) {
            throw EdgeHttpException(
                409,
                "This kitchen ticket changed on another device.",
            )
        }

        val state = existing.getJSONObject("state")
        val currentStatus = state.optLong("status_id", 0)
        if (currentStatus != expectedStatus) {
            throw EdgeHttpException(
                409,
                "Kitchen status changed on another device.",
            )
        }

        val statusName = kdsStatusName(newStatus)
            ?: throw EdgeHttpException(
                422,
                "This status is not part of the cached KDS workflow.",
            )

        if (statusName !in setOf("Preparation", "Delivery")) {
            throw EdgeHttpException(
                422,
                "This status is not a mutable KDS workflow state.",
            )
        }

        val now = System.currentTimeMillis()
        val newVersion = currentVersion + 1
        state.put("status_id", newStatus)
        state.put("status_name", statusName)
        state.put("status_updated_at", Instant.ofEpochMilli(now).toString())

        database.writableDatabase.update(
            "pmd_edge_orders",
            ContentValues().apply {
                put("version", newVersion)
                put("payload_json", state.toString())
                put("updated_at_ms", now)
            },
            "aggregate_id = ?",
            arrayOf(command.aggregateId),
        )

        val numericOrderId = command.aggregateId
            .removePrefix("order:")
            .toLongOrNull()

        val result = JSONObject()
            .put("order_ref", command.aggregateId)
            .put(
                "order_id",
                numericOrderId ?: JSONObject.NULL,
            )
            .put("status_id", newStatus)
            .put("status_name", statusName)
            .put(
                "display_status_name",
                if (statusName == "Preparation") "Preparing" else "Ready",
            )
            .put("updated_at", Instant.ofEpochMilli(now).toString())

        val event = emit(
            peer.locationId,
            "order",
            command.aggregateId,
            newVersion,
            "KDS_STATUS_EDGE_V1",
            JSONObject()
                .put("command_id", command.commandId)
                .put("order", result),
        )

        return JSONObject()
            .put("ok", true)
            .put("protocol", "pmd-edge-v1")
            .put("command_id", command.commandId)
            .put("idempotency_key", command.idempotencyKey)
            .put("aggregate", "order")
            .put("aggregate_id", command.aggregateId)
            .put("aggregate_version", newVersion)
            .put("sequence", event.first)
            .put("event_id", event.second)
            .put("replayed", false)
            .put("result", result)
    }

    private fun prepareCloudRequest(original: JSONObject): JSONObject? {
        val type = original.optString("command_type")
        val aggregateId = original.optString("aggregate_id")

        if (type != "KDS_STATUS_V1" || !aggregateId.startsWith("local:")) {
            return JSONObject(original.toString())
        }

        val edgeOrder = edgeOrder(aggregateId) ?: return null
        val state = edgeOrder.optJSONObject("state") ?: return null
        val serverOrderId = state.optLong("server_order_id", 0)
        val serverVersion = state.optLong("server_aggregate_version", 0)
        if (serverOrderId < 1) return null

        val rewritten = JSONObject(original.toString())
        rewritten.put("aggregate_id", "order:$serverOrderId")
        rewritten.put("base_version", serverVersion)

        val payload = rewritten.optJSONObject("payload") ?: JSONObject()
        payload.remove("order_ref")
        payload.put("order_id", serverOrderId)
        rewritten.put("payload", payload)

        return rewritten
    }

    private fun mirrorCloudResult(
        command: CommandEnvelope,
        cloud: JSONObject,
    ) {
        if (!command.aggregateId.startsWith("local:")) return

        val result = cloud.optJSONObject("result") ?: return
        val serverOrderId = result.optLong("order_id", 0)
        if (serverOrderId < 1) return

        val existing = edgeOrder(command.aggregateId) ?: return
        val state = existing.optJSONObject("state") ?: JSONObject()
        state.put("server_order_id", serverOrderId)
        state.put(
            "server_aggregate_id",
            cloud.optString("aggregate_id", "order:$serverOrderId"),
        )
        state.put(
            "server_aggregate_version",
            cloud.optLong("aggregate_version", 0),
        )
        state.put(
            "server_updated_at",
            result.optString("updated_at"),
        )

        database.writableDatabase.update(
            "pmd_edge_orders",
            ContentValues().apply {
                put("payload_json", state.toString())
                put("updated_at_ms", System.currentTimeMillis())
            },
            "aggregate_id = ?",
            arrayOf(command.aggregateId),
        )
    }

    private fun commandFromRequest(
        peer: EdgePeer,
        request: JSONObject,
    ): CommandEnvelope {
        val commandId = request.optString("command_id").trim().lowercase()
        val idempotency = request.optString(
            "idempotency_key",
            commandId,
        ).trim()
        val aggregate = request.optString("aggregate").trim().lowercase()
        val aggregateId = request.optString("aggregate_id").trim()
        val commandType = request.optString("command_type").trim().uppercase()
        val payload = request.optJSONObject("payload") ?: JSONObject()

        if (
            commandId.isBlank()
            || idempotency.isBlank()
            || aggregate != "order"
            || aggregateId.isBlank()
            || commandType.isBlank()
        ) {
            throw EdgeHttpException(422, "Invalid PayMyDine Edge command envelope.")
        }

        return CommandEnvelope(
            commandId = commandId,
            idempotencyKey = idempotency,
            tenantHost = app.credentials.tenantHost().orEmpty(),
            locationId = peer.locationId,
            deviceId = peer.deviceId,
            staffId = peer.profile.optJSONObject("identity")
                ?.optLong("staff_id", 0)
                ?.takeIf { it > 0 },
            userId = peer.profile.optJSONObject("identity")
                ?.optLong("user_id", 0)
                ?.takeIf { it > 0 },
            aggregate = aggregate,
            aggregateId = aggregateId,
            baseVersion = request.optLong("base_version", 0),
            commandType = commandType,
            payloadJson = payload.toString(),
            createdAtMs = System.currentTimeMillis(),
        )
    }

    private fun findCommand(
        commandId: String,
        idempotencyKey: String,
    ): JSONObject? = database.readableDatabase.query(
        "pmd_edge_commands",
        null,
        "command_id = ? OR idempotency_key = ?",
        arrayOf(commandId, idempotencyKey),
        null,
        null,
        null,
        "1",
    ).use { rows ->
        if (!rows.moveToFirst()) null
        else JSONObject()
            .put("command_id", rows.getString(rows.getColumnIndexOrThrow("command_id")))
            .put("idempotency_key", rows.getString(rows.getColumnIndexOrThrow("idempotency_key")))
            .put("request_hash", rows.getString(rows.getColumnIndexOrThrow("request_hash")))
            .put("status", rows.getString(rows.getColumnIndexOrThrow("status")))
            .put(
                "result_json",
                rows.getColumnIndexOrThrow("result_json").let { i ->
                    if (rows.isNull(i)) "" else rows.getString(i)
                },
            )
            .put("created_at_ms", rows.getLong(rows.getColumnIndexOrThrow("created_at_ms")))
            .put("updated_at_ms", rows.getLong(rows.getColumnIndexOrThrow("updated_at_ms")))
    }

    private fun markCommand(
        commandId: String,
        status: String,
        result: JSONObject,
        error: String?,
    ) {
        database.writableDatabase.update(
            "pmd_edge_commands",
            ContentValues().apply {
                put("status", status)
                put("result_json", result.toString())
                if (error == null) putNull("last_error")
                else put("last_error", error.take(1000))
                put("updated_at_ms", System.currentTimeMillis())
            },
            "command_id = ?",
            arrayOf(commandId),
        )
    }

    private fun edgeOrder(aggregateId: String): JSONObject? =
        database.readableDatabase.query(
            "pmd_edge_orders",
            null,
            "aggregate_id = ?",
            arrayOf(aggregateId),
            null,
            null,
            null,
            "1",
        ).use { rows ->
            if (!rows.moveToFirst()) null
            else JSONObject()
                .put("aggregate_id", rows.getString(rows.getColumnIndexOrThrow("aggregate_id")))
                .put("location_id", rows.getLong(rows.getColumnIndexOrThrow("location_id")))
                .put("table_id", rows.getString(rows.getColumnIndexOrThrow("table_id")))
                .put("status", rows.getString(rows.getColumnIndexOrThrow("status")))
                .put("version", rows.getLong(rows.getColumnIndexOrThrow("version")))
                .put("total_minor", rows.getLong(rows.getColumnIndexOrThrow("total_minor")))
                .put("currency", rows.getString(rows.getColumnIndexOrThrow("currency")))
                .put(
                    "state",
                    JSONObject(
                        rows.getString(rows.getColumnIndexOrThrow("payload_json")),
                    ),
                )
        }

    private fun emit(
        locationId: Long,
        aggregate: String,
        aggregateId: String,
        version: Long,
        type: String,
        payload: JSONObject,
    ): Pair<Long, String> {
        val eventId = UUID.randomUUID().toString()
        val db = database.writableDatabase
        val sequence = db.insertOrThrow(
            "pmd_edge_events",
            null,
            ContentValues().apply {
                put("event_id", eventId)
                put("location_id", locationId)
                put("aggregate", aggregate)
                put("aggregate_id", aggregateId)
                put("aggregate_version", version)
                put("event_type", type)
                put("payload_json", payload.toString())
                put("created_at_ms", System.currentTimeMillis())
            },
        )

        return sequence to eventId
    }

    private fun localMenu(
        menuId: String,
        locationId: Long,
    ): Triple<String, Long, String>? =
        database.readableDatabase.query(
            "pmd_menu_items",
            arrayOf("name", "price_minor", "payload_json"),
            "id = ? AND location_id = ? AND deleted = 0",
            arrayOf(menuId, locationId.toString()),
            null,
            null,
            null,
            "1",
        ).use {
            if (!it.moveToFirst()) null
            else Triple(it.getString(0), it.getLong(1), it.getString(2))
        }

    private fun validateOptions(
        menu: JSONObject,
        selectedIds: Set<Long>,
        exponent: Int,
    ): Pair<JSONArray, Long> {
        val groups = menu.optJSONArray("options") ?: JSONArray()
        val selectedRows = JSONArray()
        var total = 0L

        for (groupIndex in 0 until groups.length()) {
            val group = groups.optJSONObject(groupIndex) ?: continue
            val values = group.optJSONArray("values") ?: JSONArray()
            val selectedInGroup = mutableListOf<JSONObject>()

            for (valueIndex in 0 until values.length()) {
                val value = values.optJSONObject(valueIndex) ?: continue
                val id = value.optLong("id", 0)
                if (id > 0 && id in selectedIds) {
                    selectedInGroup += value
                }
            }

            val min = group.optInt(
                "min",
                if (group.optBoolean("required")) 1 else 0,
            ).coerceAtLeast(0)
            val max = group.optInt("max", 1).coerceAtLeast(1)

            if (selectedInGroup.size !in min..max) {
                throw EdgeHttpException(
                    422,
                    "Invalid modifier selection for " +
                        group.optString("name", "Options") + ".",
                )
            }

            for (value in selectedInGroup) {
                val priceMinor = moneyToMinor(
                    value.optDouble("price", 0.0),
                    exponent,
                )
                total += priceMinor
                selectedRows.put(
                    JSONObject()
                        .put("id", value.optLong("id"))
                        .put("name", value.optString("name"))
                        .put("price_minor", priceMinor),
                )
            }
        }

        return selectedRows to total
    }

    private fun cachedKdsTicket(orderId: String): JSONObject? =
        database.readableDatabase.query(
            "pmd_kds_tickets",
            arrayOf("payload_json"),
            "order_id = ?",
            arrayOf(orderId),
            null,
            null,
            "updated_at_ms DESC",
            "1",
        ).use {
            if (!it.moveToFirst()) null else JSONObject(it.getString(0))
        }

    private fun kdsStatuses(): JSONArray {
        val bootstrap = bootstrapJson()
        val source = bootstrap.optJSONArray("kds_statuses") ?: JSONArray()
        val out = JSONArray()

        for (index in 0 until source.length()) {
            val row = source.optJSONObject(index) ?: continue
            val name = row.optString("status_name")
            if (name !in setOf("Preparation", "Delivery")) continue

            out.put(
                JSONObject()
                    .put("status_id", row.optLong("status_id"))
                    .put(
                        "status_name",
                        row.optString("display_name").ifBlank { name },
                    )
                    .put("status_color", row.optString("status_color")),
            )
        }

        return out
    }

    private fun kdsStatusId(name: String): Long {
        val array = bootstrapJson().optJSONArray("kds_statuses") ?: return 0
        for (index in 0 until array.length()) {
            val row = array.optJSONObject(index) ?: continue
            if (row.optString("status_name").equals(name, true)) {
                return row.optLong("status_id", 0)
            }
        }
        return 0
    }

    private fun kdsStatusName(id: Long): String? {
        val array = bootstrapJson().optJSONArray("kds_statuses") ?: return null
        for (index in 0 until array.length()) {
            val row = array.optJSONObject(index) ?: continue
            if (row.optLong("status_id", 0) == id) {
                return row.optString("status_name").takeIf { it.isNotBlank() }
            }
        }
        return null
    }

    private fun bootstrapJson(): JSONObject {
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
        return runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
    }

    private fun localCurrency(): String =
        bootstrapJson()
            .optJSONObject("location")
            ?.optString("currency_code", "EUR")
            ?.ifBlank { "EUR" }
            ?: "EUR"

    private fun localMinorExponent(): Int =
        bootstrapJson()
            .optJSONObject("location")
            ?.optInt("currency_minor_exponent", 2)
            ?.coerceIn(0, 4)
            ?: 2

    private fun tableLabel(tableId: String): String =
        database.readableDatabase.query(
            "pmd_tables",
            arrayOf("label", "number"),
            "id = ?",
            arrayOf(tableId),
            null,
            null,
            null,
            "1",
        ).use {
            if (!it.moveToFirst()) "Order"
            else it.getString(0).ifBlank {
                "Table " + it.getString(1)
            }
        }

    private fun filterKitchenItems(
        items: JSONArray,
        stationCategories: Set<Long>,
    ): JSONArray {
        if (stationCategories.isEmpty()) {
            return JSONArray().apply {
                for (index in 0 until items.length()) {
                    put(items.get(index))
                }
            }
        }

        return JSONArray().apply {
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                val categories = longSet(
                    item.optJSONArray("category_ids") ?: JSONArray(),
                )
                if (categories.any { it in stationCategories }) {
                    put(item)
                }
            }
        }
    }

    private fun longSet(array: JSONArray): Set<Long> = buildSet {
        for (index in 0 until array.length()) {
            val value = array.optLong(index, 0)
            if (value > 0) add(value)
        }
    }

    private fun moneyToMinor(value: Double, exponent: Int): Long =
        (value * Math.pow(10.0, exponent.toDouble())).roundToLong()

    private fun elapsed(createdAtMs: Long): String {
        if (createdAtMs <= 0) return "0s"
        val seconds = ((System.currentTimeMillis() - createdAtMs) / 1000L)
            .coerceAtLeast(0)
        val hours = seconds / 3600L
        val minutes = (seconds % 3600L) / 60L
        val rest = seconds % 60L

        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            minutes > 0 -> "${minutes}m ${rest}s"
            else -> "${rest}s"
        }
    }

    private fun requireSurface(peer: EdgePeer, surface: String) {
        if (surface !in peer.surfaces()) {
            throw EdgeHttpException(
                403,
                "This paired staff profile cannot use $surface on restaurant Edge.",
            )
        }
    }

    private fun requireAnySurface(
        peer: EdgePeer,
        surfaces: Set<String>,
    ) {
        if (peer.surfaces().none { it in surfaces }) {
            throw EdgeHttpException(
                403,
                "This paired staff profile cannot send restaurant orders.",
            )
        }
    }

    private fun peerFromProfile(
        tokenHash: String,
        ciphertext: String,
        profile: JSONObject,
    ): EdgePeer {
        val identity = profile.optJSONObject("identity") ?: JSONObject()
        val location = profile.optJSONObject("location") ?: JSONObject()
        return EdgePeer(
            tokenHash = tokenHash,
            tokenCiphertext = ciphertext,
            deviceId = identity.opt("device_id")?.toString().orEmpty(),
            locationId = location.optLong("id", 0),
            profile = profile,
            expiresAtMs = runCatching {
                Instant.parse(profile.optString("profile_expires_at")).toEpochMilli()
            }.getOrElse {
                System.currentTimeMillis() + 8L * 60L * 60L * 1000L
            },
        )
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    companion object {
        private const val STATUS_PROCESSING = "PROCESSING"
        private const val STATUS_EDGE_APPLIED = "EDGE_APPLIED"
        private const val STATUS_CLOUD_APPLIED = "CLOUD_APPLIED"
        private const val STATUS_CLOUD_REJECTED = "CLOUD_REJECTED"
    }
}
