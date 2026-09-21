package com.paymydine.mobile.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.edge.EdgeApiClient
import com.paymydine.mobile.edge.EdgeAuthority
import com.paymydine.mobile.edge.EdgeHttpException
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.network.EdgeEndpoint
import com.paymydine.mobile.network.MobileApiException
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class SyncEngine(
    private val app: PayMyDineApplication,
    private val api: MobileApiClient =
        MobileApiClient(app.credentials.staffSession()?.staffGrant),
    private val edgeApi: EdgeApiClient = EdgeApiClient(),
    private val router: TransportRouter = TransportRouter(),
) {
    private data class AuthorityRoute(
        val kind: TransportKind,
        val edge: EdgeEndpoint? = null,
        val fingerprint: String? = null,
        val localEdge: Boolean = false,
    )

    suspend fun runOnce(): Boolean = processMutex.withLock {
        val host = app.credentials.tenantHost() ?: return@withLock true
        val token = app.credentials.deviceToken() ?: return@withLock true

        var allGood = true

        if (
            app.connectivity.online.value &&
            app.bootstrapRepository.needsRefresh()
        ) {
            try {
                refreshBootstrap(host, token)
            } catch (_: Throwable) {
                // Keep the last durable bootstrap. LAN/offline operation must
                // not be destroyed by a transient Cloud refresh failure.
                allGood = false
            }
        }

        val route = authorityRoute()
        app.syncRepository.recoverInFlight()

        val commands = app.syncRepository.pending(50)
        val blockedAggregates = mutableSetOf<String>()

        for (command in commands) {
            // Preserve command order inside one order aggregate. If an earlier
            // command could not reach an authority, a later local mutation
            // must not jump ahead and accidentally create/modify a different
            // canonical bill.
            if (command.aggregateId in blockedAggregates) {
                app.syncRepository.defer(
                    commandId = command.commandId,
                    delayMs = 5_000L,
                    reason = "Waiting for an earlier command on the same order.",
                )
                if (command.commandType != "KDS_STATUS_V1") {
                    app.localPosRepository.markRetryForCommand(command)
                }
                blockedAggregates += command.aggregateId
                allGood = false
                continue
            }

            if (!app.syncRepository.markInFlight(command.commandId)) continue

            if (route.kind == TransportKind.OFFLINE) {
                app.syncRepository.defer(
                    commandId = command.commandId,
                    delayMs = 5_000L,
                    reason = "No trusted PayMyDine Cloud or Restaurant Edge authority is reachable.",
                )
                if (command.commandType != "KDS_STATUS_V1") {
                    app.localPosRepository.markRetryForCommand(command)
                }
                allGood = false
                continue
            }

            try {
                val response = sendCommand(
                    host = host,
                    token = token,
                    command = command,
                    route = route,
                )
                val provisional = response.optBoolean("provisional", false)

                if (command.commandType == "KDS_STATUS_V1") {
                    app.kdsRepository.applyCommandResult(command, response)
                } else if (provisional) {
                    app.localPosRepository.applyEdgeCommandResult(
                        command,
                        response,
                    )
                } else {
                    app.localPosRepository.applyCommandResult(
                        command,
                        response,
                    )
                }

                if (provisional) {
                    // The Restaurant Edge has durably accepted responsibility.
                    // Keep the original stable command in the phone outbox as a
                    // second recovery copy until Edge/Cloud reconciliation is
                    // observed. Re-sends are safe because command_id is stable.
                    app.syncRepository.defer(
                        commandId = command.commandId,
                        delayMs = 15_000L,
                        reason = "Accepted by Restaurant Edge; waiting for Cloud reconciliation.",
                    )
                } else {
                    app.syncRepository.acknowledge(command.commandId)
                }
            } catch (error: MobileApiException) {
                when {
                    error.statusCode == 425 -> {
                        app.syncRepository.defer(
                            commandId = command.commandId,
                            delayMs = 3_000L,
                            reason = error.message
                                ?: "Restaurant Edge is already processing this command.",
                        )
                        blockedAggregates += command.aggregateId
                        allGood = false
                    }

                    error.statusCode in setOf(401, 403, 409, 422) -> {
                        val message = error.message ?: "Command rejected."
                        app.syncRepository.reject(
                            command.commandId,
                            message,
                        )
                        if (command.commandType != "KDS_STATUS_V1") {
                            app.localPosRepository.markConflictForCommand(
                                command,
                                message,
                            )
                        }
                        blockedAggregates += command.aggregateId
                        allGood = false
                    }

                    else -> {
                        app.syncRepository.defer(
                            commandId = command.commandId,
                            delayMs = 10_000L,
                            reason = error.message
                                ?: "PayMyDine authority is temporarily unavailable.",
                        )
                        if (command.commandType != "KDS_STATUS_V1") {
                            app.localPosRepository.markRetryForCommand(command)
                        }
                        blockedAggregates += command.aggregateId
                        allGood = false
                    }
                }
            } catch (error: IOException) {
                app.syncRepository.defer(
                    commandId = command.commandId,
                    delayMs = 5_000L,
                    reason = error.message ?: "Restaurant network is unavailable.",
                )
                if (command.commandType != "KDS_STATUS_V1") {
                    app.localPosRepository.markRetryForCommand(command)
                }
                blockedAggregates += command.aggregateId
                allGood = false
            } catch (error: Throwable) {
                app.syncRepository.defer(
                    commandId = command.commandId,
                    delayMs = 10_000L,
                    reason = error.message ?: "Sync failed.",
                )
                if (command.commandType != "KDS_STATUS_V1") {
                    app.localPosRepository.markRetryForCommand(command)
                }
                blockedAggregates += command.aggregateId
                allGood = false
            }
        }

        // Edge events first: provisional local state must be observed before a
        // later canonical Cloud event clears it.
        if (route.kind == TransportKind.EDGE) {
            try {
                pullEdgeEvents(token, route)
            } catch (_: Throwable) {
                allGood = false
            }
        }

        if (app.connectivity.online.value) {
            try {
                pullCloudEvents(host, token)
            } catch (_: Throwable) {
                allGood = false
            }
        }

        if (
            app.credentials.staffSession()?.surface == "kds" ||
            "kds" in app.bootstrapRepository.surfaces()
        ) {
            try {
                refreshKds(host, token, route)
            } catch (_: Throwable) {
                // Existing SQLite KDS projection stays visible.
                allGood = false
            }
        }

        return@withLock allGood
    }

    private fun refreshBootstrap(
        host: String,
        token: String,
    ) {
        val bootstrap = api.bootstrap(host, token)
        val fingerprint = bootstrap
            .optJSONObject("edge")
            ?.optString("fingerprint_sha256")
            ?.trim()
            ?.lowercase()
            ?.takeIf { it.length == 64 }

        if (fingerprint == null) {
            app.credentials.clearEdgeFingerprint()
        } else {
            app.credentials.setEdgeFingerprint(fingerprint)
        }

        app.bootstrapRepository.apply(bootstrap)
    }

    private fun authorityRoute(): AuthorityRoute {
        val pinned = app.credentials.edgeFingerprint()
            ?.lowercase()
            ?.replace(":", "")
            ?.trim()
            ?.takeIf { it.length == 64 }
        val localRuntime = EdgeRuntimeState.state.value
        val localFingerprint = localRuntime.fingerprintSha256
            ?.lowercase()
            ?.replace(":", "")
            ?.trim()

        if (
            localRuntime.running &&
            pinned != null &&
            localFingerprint == pinned
        ) {
            return AuthorityRoute(
                kind = TransportKind.EDGE,
                fingerprint = pinned,
                localEdge = true,
            )
        }

        val discovered = app.edgeDiscovery.endpoint.value
        val decision = router.decide(
            cloudOnline = app.connectivity.online.value,
            edge = discovered,
            pinnedEdgeFingerprint = pinned,
            expectedSiteId = app.bootstrapRepository.locationId()
                ?.toString(),
        )

        return AuthorityRoute(
            kind = decision.kind,
            edge = if (decision.kind == TransportKind.EDGE) {
                discovered
            } else {
                null
            },
            fingerprint = if (decision.kind == TransportKind.EDGE) {
                pinned
            } else {
                null
            },
            localEdge = false,
        )
    }

    private fun sendCommand(
        host: String,
        token: String,
        command: CommandEnvelope,
        route: AuthorityRoute,
    ): JSONObject {
        if (route.kind == TransportKind.CLOUD) {
            return sendCloudCommand(host, token, command)
        }

        if (route.kind != TransportKind.EDGE) {
            throw IOException("No PayMyDine command authority is reachable.")
        }

        try {
            return if (route.localEdge) {
                localEdgeAuthority().execute(
                    token,
                    commandJson(command),
                )
            } else {
                edgeApi.command(
                    edge = requireNotNull(route.edge),
                    pinnedFingerprint = requireNotNull(route.fingerprint),
                    bearerToken = token,
                    command = command,
                )
            }
        } catch (error: EdgeHttpException) {
            throw MobileApiException(
                error.statusCode,
                error.message,
            )
        } catch (error: MobileApiException) {
            // 425 means the Edge may already be applying this exact command;
            // never race it by independently sending a second authority path.
            if (error.statusCode == 425) throw error

            if (
                app.connectivity.online.value &&
                (error.statusCode == 404 || error.statusCode >= 500)
            ) {
                return sendCloudCommand(host, token, command)
            }
            throw error
        } catch (error: IOException) {
            // The exact same command/idempotency key is safe to submit to
            // Cloud after a lost Edge response. If Edge actually accepted it,
            // its later Cloud replay receives the already-stored result.
            if (app.connectivity.online.value) {
                return sendCloudCommand(host, token, command)
            }
            throw error
        }
    }

    private fun sendCloudCommand(
        host: String,
        token: String,
        command: CommandEnvelope,
    ): JSONObject {
        val routing = app.localPosRepository
            .cloudRoutingForCommand(command)

        val response = if (routing == null) {
            api.sendCommand(host, token, command)
        } else {
            val routed = commandJson(command)
                .put("client_aggregate_id", command.aggregateId)
                .put("client_base_version", command.baseVersion)
                .put(
                    "aggregate_id",
                    "order:${routing.serverOrderId}",
                )
                .put("base_version", routing.serverVersion)

            val payload = routed.getJSONObject("payload")
            payload.remove("order_ref")
            payload.put("order_id", routing.serverOrderId)
            routing.expectedUpdatedAt?.let {
                payload.put("expected_updated_at", it)
            }
            routed.put("payload", payload)

            api.sendCommandJson(
                tenantHost = host,
                deviceToken = token,
                command = routed,
            )
        }

        return response.apply {
            put("authority", "cloud")
            put("provisional", false)
        }
    }

    private fun pullCloudEvents(
        host: String,
        token: String,
    ) {
        var cursor = app.syncRepository.cursor()
        var loops = 0

        while (loops++ < 10) {
            val page = api.events(host, token, cursor)
            val events = page.optJSONArray("events") ?: break

            for (index in 0 until events.length()) {
                val row = events.getJSONObject(index)
                val payload = row.optJSONObject("payload") ?: JSONObject()
                val event = SyncEvent(
                    sequence = row.getLong("sequence"),
                    eventId = row.getString("event_id"),
                    locationId = row.getLong("location_id"),
                    aggregate = row.getString("aggregate"),
                    aggregateId = row.getString("aggregate_id"),
                    aggregateVersion = row.optLong(
                        "aggregate_version",
                        0,
                    ),
                    eventType = row.getString("event_type"),
                    payloadJson = payload.toString(),
                    createdAtMs = System.currentTimeMillis(),
                )

                if (
                    app.syncRepository.applyEvent(event) &&
                    event.aggregate == "order"
                ) {
                    if (event.eventType == "KDS_STATUS_CHANGED_V1") {
                        app.kdsRepository.applyEvent(
                            event.eventType,
                            event.aggregateVersion,
                            payload,
                        )
                    } else {
                        app.localPosRepository.applyOrderEvent(
                            payload,
                            event.aggregateVersion,
                        )
                    }
                }
                cursor = maxOf(cursor, event.sequence)
            }

            if (
                !page.optBoolean("has_more") ||
                events.length() == 0
            ) {
                break
            }
        }
    }

    private fun pullEdgeEvents(
        token: String,
        route: AuthorityRoute,
    ) {
        val fingerprint = requireNotNull(route.fingerprint)
        val scope = "edge:" + fingerprint.take(24)
        var cursor = app.syncRepository.cursor(scope)
        var loops = 0

        while (loops++ < 10) {
            val page = if (route.localEdge) {
                localEdgeAuthority().events(
                    rawBearer = token,
                    after = cursor,
                    limit = 250,
                )
            } else {
                edgeApi.events(
                    edge = requireNotNull(route.edge),
                    pinnedFingerprint = fingerprint,
                    bearerToken = token,
                    after = cursor,
                    limit = 250,
                )
            }
            val events = page.optJSONArray("events") ?: break

            for (index in 0 until events.length()) {
                val row = events.getJSONObject(index)
                val payload = row.optJSONObject("payload") ?: JSONObject()
                val event = SyncEvent(
                    sequence = row.getLong("sequence"),
                    eventId = row.getString("event_id"),
                    locationId = row.getLong("location_id"),
                    aggregate = row.getString("aggregate"),
                    aggregateId = row.getString("aggregate_id"),
                    aggregateVersion = row.optLong(
                        "aggregate_version",
                        0,
                    ),
                    eventType = row.getString("event_type"),
                    payloadJson = payload.toString(),
                    createdAtMs = row.optLong(
                        "created_at_ms",
                        System.currentTimeMillis(),
                    ),
                )

                if (
                    app.syncRepository.applyEdgeEvent(
                        event,
                        scope,
                    ) &&
                    event.aggregate == "order"
                ) {
                    when (event.eventType) {
                        "KDS_STATUS_EDGE_V1" ->
                            app.kdsRepository.applyEvent(
                                event.eventType,
                                event.aggregateVersion,
                                payload,
                            )

                        "ORDER_SENT_EDGE_V1",
                        "ORDER_HELD_EDGE_V1",
                        "CLOUD_RECONCILED_V1",
                        "RECONCILIATION_REQUIRED_V1" ->
                            app.localPosRepository.applyEdgeEvent(
                                event.eventType,
                                payload,
                                event.aggregateVersion,
                            )
                    }
                }

                cursor = maxOf(cursor, event.sequence)
            }

            if (
                !page.optBoolean("has_more") ||
                events.length() == 0
            ) {
                break
            }
        }
    }

    private fun refreshKds(
        host: String,
        token: String,
        route: AuthorityRoute,
    ) {
        val station = app.kdsRepository.ensureDefaultStation()

        val snapshot = when (route.kind) {
            TransportKind.EDGE -> {
                try {
                    if (route.localEdge) {
                        localEdgeAuthority().kdsSnapshot(
                            rawBearer = token,
                            stationSlug = station,
                        )
                    } else {
                        edgeApi.kdsSnapshot(
                            edge = requireNotNull(route.edge),
                            pinnedFingerprint = requireNotNull(
                                route.fingerprint,
                            ),
                            bearerToken = token,
                            stationSlug = station,
                        )
                    }
                } catch (error: EdgeHttpException) {
                    throw MobileApiException(
                        error.statusCode,
                        error.message,
                    )
                } catch (error: IOException) {
                    if (app.connectivity.online.value) {
                        api.kdsSnapshot(host, token, station)
                    } else {
                        throw error
                    }
                }
            }

            TransportKind.CLOUD ->
                api.kdsSnapshot(host, token, station)

            TransportKind.OFFLINE ->
                return
        }

        app.kdsRepository.applySnapshot(snapshot)
    }

    private fun commandJson(command: CommandEnvelope): JSONObject =
        JSONObject()
            .put("command_id", command.commandId)
            .put("idempotency_key", command.idempotencyKey)
            .put("aggregate", command.aggregate)
            .put("aggregate_id", command.aggregateId)
            .put("base_version", command.baseVersion)
            .put("command_type", command.commandType)
            .put(
                "payload",
                runCatching {
                    JSONObject(command.payloadJson)
                }.getOrElse {
                    throw IOException(
                        "Queued command payload is invalid JSON.",
                    )
                },
            )

    private fun localEdgeAuthority(): EdgeAuthority =
        EdgeAuthority(app)

    companion object {
        private val processMutex = Mutex()

        fun enqueueImmediate(context: Context) {
            val request = OneTimeWorkRequestBuilder<PmdSyncWorker>()
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "pmd-sync-now",
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }

        fun schedulePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<PmdSyncWorker>(
                15,
                TimeUnit.MINUTES,
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "pmd-sync-periodic",
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }
    }
}

class PmdSyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as PayMyDineApplication
        return if (SyncEngine(app).runOnce()) {
            Result.success()
        } else {
            Result.retry()
        }
    }
}
