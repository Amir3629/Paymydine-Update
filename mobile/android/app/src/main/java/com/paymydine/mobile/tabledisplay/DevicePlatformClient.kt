package com.paymydine.mobile.tabledisplay

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class DeviceTerminalOption(
    val id: Long,
    val providerCode: String,
    val name: String,
)

data class DeviceHardwareState(
    val selectedTerminalId: Long,
    val terminals: List<DeviceTerminalOption>,
)

data class KioskTerminalPaymentResult(
    val ok: Boolean,
    val orderId: Long,
    val attemptId: Long,
    val status: String,
    val message: String,
    val paymentRecorded: Boolean,
)

class DevicePlatformClient {
    suspend fun heartbeat(
        host: String,
        token: String,
        payload: JSONObject,
    ): DeviceHeartbeatResult = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "heartbeat",
            body = payload,
            token = token,
        )

        val desiredJson = json.optJSONObject("desired") ?: JSONObject()
        val desired = DeviceDesiredState(
            screenState = desiredJson.optString("screen_state", "awake"),
            brightness = desiredJson.optInt("brightness", 80).coerceIn(0, 100),
            reason = desiredJson.optString("reason", ""),
            kiosk = desiredJson.optBoolean("kiosk", true),
        )

        val commandRows = json.optJSONArray("commands") ?: JSONArray()
        val commands = buildList {
            for (index in 0 until commandRows.length()) {
                val row = commandRows.optJSONObject(index) ?: continue
                val commandId = row.optString("command_id")
                val command = row.optString("command")
                if (commandId.isBlank() || command.isBlank()) continue

                val rawPayload = row.optJSONObject("payload") ?: JSONObject()
                val values = linkedMapOf<String, String>()
                val keys = rawPayload.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val value = rawPayload.opt(key)
                    values[key] =
                        when (value) {
                            null, JSONObject.NULL -> ""
                            is String -> value
                            else -> value.toString()
                        }
                }

                add(
                    DeviceCommand(
                        commandId = commandId,
                        command = command.uppercase(),
                        payload = values,
                    ),
                )
            }
        }

        DeviceHeartbeatResult(
            desired = desired,
            commands = commands,
            pollAfterSeconds = json.optLong("poll_after_seconds", 10L)
                .coerceIn(5L, 60L),
        )
    }

    suspend fun acknowledge(
        host: String,
        token: String,
        commandId: String,
        status: String,
        result: Map<String, Any?> = emptyMap(),
    ) = withContext(Dispatchers.IO) {
        val resultJson = JSONObject()
        result.forEach { (key, value) ->
            resultJson.put(key, value ?: JSONObject.NULL)
        }

        request(
            host = host,
            endpoint = "ack",
            body = JSONObject()
                .put("command_id", commandId)
                .put("status", status)
                .put("result", resultJson),
            token = token,
        )
    }

    suspend fun hardware(
        host: String,
        token: String,
    ): DeviceHardwareState = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "hardware",
            body = JSONObject(),
            token = token,
        )
        val rows = json.optJSONArray("terminal_options") ?: JSONArray()
        val terminals = buildList {
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                val id = row.optLong("id", 0L)
                if (id < 1L) continue
                add(
                    DeviceTerminalOption(
                        id = id,
                        providerCode = row.optString("provider_code").trim(),
                        name = row.optString("name", "Payment terminal").trim(),
                    ),
                )
            }
        }
        DeviceHardwareState(
            selectedTerminalId = json.optLong("payment_terminal_device_id", 0L),
            terminals = terminals,
        )
    }

    suspend fun configureTerminal(
        host: String,
        token: String,
        terminalId: Long?,
    ): DeviceHardwareState = withContext(Dispatchers.IO) {
        request(
            host = host,
            endpoint = "hardware/configure",
            body = JSONObject().apply {
                if (terminalId != null && terminalId > 0L) {
                    put("payment_terminal_device_id", terminalId)
                } else {
                    put("payment_terminal_device_id", JSONObject.NULL)
                }
            },
            token = token,
        )
        hardware(host, token)
    }

    suspend fun startKioskTerminalPayment(
        host: String,
        token: String,
        orderId: Long,
    ): KioskTerminalPaymentResult = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "kiosk/terminal-payment",
            body = JSONObject().put("order_id", orderId),
            token = token,
        )
        parseKioskPayment(json)
    }

    suspend fun refreshKioskTerminalPayment(
        host: String,
        token: String,
        attemptId: Long,
    ): KioskTerminalPaymentResult = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "kiosk/terminal-payment/refresh",
            body = JSONObject().put("attempt_id", attemptId),
            token = token,
        )
        parseKioskPayment(json)
    }

    private fun parseKioskPayment(json: JSONObject): KioskTerminalPaymentResult =
        KioskTerminalPaymentResult(
            ok = json.optBoolean("ok", false),
            orderId = json.optLong("order_id", 0L),
            attemptId = json.optLong("attempt_id", 0L),
            status = json.optString("status", "pending").trim().lowercase(),
            message = json.optString("message", "").trim(),
            paymentRecorded = json.optBoolean("payment_recorded", false),
        )

    suspend fun log(
        host: String,
        token: String,
        level: String,
        event: String,
        message: String,
        context: Map<String, Any?> = emptyMap(),
    ) = withContext(Dispatchers.IO) {
        val contextJson = JSONObject()
        context.forEach { (key, value) ->
            contextJson.put(key, value ?: JSONObject.NULL)
        }

        request(
            host = host,
            endpoint = "logs",
            body = JSONObject()
                .put("level", level)
                .put("event", event)
                .put("message", message)
                .put("context", contextJson),
            token = token,
        )
    }

    private fun request(
        host: String,
        endpoint: String,
        body: JSONObject,
        token: String,
    ): JSONObject {
        val base = SecureStore.normalizeHost(host)
        val url = URL(
            base +
                "/api/v1/device-platform/" +
                endpoint.trim('/'),
        )
        val connection =
            (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 10_000
                useCaches = false
                doOutput = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer " + token)
                setRequestProperty("X-PayMyDine-Device-Platform", "1")
            }

        try {
            connection.outputStream.use {
                it.write(body.toString().toByteArray(Charsets.UTF_8))
            }

            val status = connection.responseCode
            val source =
                if (status in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }

            val text = source?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrElse {
                JSONObject()
                    .put("ok", false)
                    .put(
                        "message",
                        "PayMyDine Device Platform returned an invalid response.",
                    )
            }

            if (status !in 200..299 || !json.optBoolean("ok", false)) {
                throw IllegalStateException(
                    json.optString(
                        "message",
                        "PayMyDine Device Platform request failed (" + status + ").",
                    ),
                )
            }

            return json
        } finally {
            connection.disconnect()
        }
    }
}
