package com.paymydine.mobile.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.network.MobileApiException
import com.paymydine.mobile.network.MobileApiClient
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class SyncEngine(
    private val app: PayMyDineApplication,
    private val api: MobileApiClient = MobileApiClient(),
) {
    suspend fun runOnce(): Boolean {
        val host = app.credentials.tenantHost() ?: return true
        val token = app.credentials.deviceToken() ?: return true

        app.syncRepository.recoverInFlight()

        var allGood = true
        val commands = app.syncRepository.pending(50)
        for (command in commands) {
            if (!app.syncRepository.markInFlight(command.commandId)) continue

            try {
                val response = api.sendCommand(host, token, command)
                if (command.commandType == "KDS_STATUS_V1") {
                    app.kdsRepository.applyCommandResult(command, response)
                } else {
                    app.localPosRepository.applyCommandResult(command, response)
                }
                app.syncRepository.acknowledge(command.commandId)
            } catch (error: MobileApiException) {
                if (error.statusCode in listOf(409, 422)) {
                    app.syncRepository.reject(command.commandId, error.message ?: "Command rejected.")
                } else {
                    app.syncRepository.retry(command.commandId, error.message ?: "HTTP ${error.statusCode}")
                    localOrderId(command)?.let(app.localPosRepository::markRetry)
                    allGood = false
                }
            } catch (error: IOException) {
                app.syncRepository.retry(command.commandId, error.message ?: "Network unavailable.")
                localOrderId(command)?.let(app.localPosRepository::markRetry)
                allGood = false
            } catch (error: Throwable) {
                app.syncRepository.retry(command.commandId, error.message ?: "Sync failed.")
                localOrderId(command)?.let(app.localPosRepository::markRetry)
                allGood = false
            }
        }

        try {
            pullEvents(host, token)
        } catch (_: Throwable) {
            allGood = false
        }

        if ("kds" in app.bootstrapRepository.surfaces()) {
            try {
                val station = app.kdsRepository.ensureDefaultStation()
                val snapshot = api.kdsSnapshot(host, token, station)
                app.kdsRepository.applySnapshot(snapshot)
            } catch (_: Throwable) {
                allGood = false
            }
        }

        return allGood
    }

    private fun pullEvents(host: String, token: String) {
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
                    aggregateVersion = row.optLong("aggregate_version", 0),
                    eventType = row.getString("event_type"),
                    payloadJson = payload.toString(),
                    createdAtMs = System.currentTimeMillis(),
                )

                if (app.syncRepository.applyEvent(event) && event.aggregate == "order") {
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

            if (!page.optBoolean("has_more") || events.length() == 0) break
        }
    }

    private fun localOrderId(command: CommandEnvelope): String? =
        command.aggregateId.takeIf { it.startsWith("local:") }?.removePrefix("local:")

    companion object {
        fun enqueueImmediate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<PmdSyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "pmd-sync-now",
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }

        fun schedulePeriodic(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<PmdSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
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
        return if (SyncEngine(app).runOnce()) Result.success() else Result.retry()
    }
}
