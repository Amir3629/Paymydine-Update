package com.paymydine.mobile.device

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class DeviceDesiredState(
    val screenState: String,
    val brightness: Int,
    val reason: String,
    val kiosk: Boolean,
)

data class DeviceCommand(
    val commandId: String,
    val command: String,
    val payload: Map<String, String>,
)

data class DeviceHeartbeatResult(
    val desired: DeviceDesiredState,
    val commands: List<DeviceCommand>,
    val pollAfterSeconds: Long,
)

class DevicePlatformClient {
    suspend fun heartbeat(
        tenantHost: String,
        token: String,
        payload: JSONObject,
    ): DeviceHeartbeatResult = withContext(Dispatchers.IO) {
        val json = request(
            tenantHost = tenantHost,
            endpoint = "heartbeat",
            token = token,
            body = payload,
        )

        val desiredJson = json.optJSONObject("desired") ?: JSONObject()
        val desired = DeviceDesiredState(
            screenState = desiredJson.optString("screen_state", "awake"),
            brightness = desiredJson.optInt("brightness", 80).coerceIn(0, 100),
            reason = desiredJson.optString("reason", ""),
            kiosk = desiredJson.optBoolean("kiosk", true),
        )

        val rows = json.optJSONArray("commands") ?: JSONArray()
        val commands = buildList {
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                val commandId = row.optString("command_id")
                val command = row.optString("command")
                if (commandId.isBlank() || command.isBlank()) continue

                val source = row.optJSONObject("payload") ?: JSONObject()
                val payloadValues = linkedMapOf<String, String>()
                val keys = source.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val value = source.opt(key)
                    payloadValues[key] =
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
                        payload = payloadValues,
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
        tenantHost: String,
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
            tenantHost = tenantHost,
            endpoint = "ack",
            token = token,
            body = JSONObject()
                .put("command_id", commandId)
                .put("status", status)
                .put("result", resultJson),
        )
    }

    suspend fun log(
        tenantHost: String,
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
            tenantHost = tenantHost,
            endpoint = "logs",
            token = token,
            body = JSONObject()
                .put("level", level)
                .put("event", event)
                .put("message", message)
                .put("context", contextJson),
        )
    }

    private fun request(
        tenantHost: String,
        endpoint: String,
        token: String,
        body: JSONObject,
    ): JSONObject {
        val host = tenantHost
            .trim()
            .removePrefix("https://")
            .removePrefix("http://")
            .trimEnd('/')

        require(host.isNotBlank()) {
            "Restaurant address is unavailable."
        }

        val connection =
            (
                URL(
                    "https://" +
                        host +
                        "/api/v1/device-platform/" +
                        endpoint.trim('/'),
                ).openConnection()
                as HttpURLConnection
            ).apply {
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
                    .put("message", "Invalid PayMyDine Device Platform response.")
            }

            if (status !in 200..299 || !json.optBoolean("ok", false)) {
                throw IllegalStateException(
                    json.optString(
                        "message",
                        "Device Platform request failed (" + status + ").",
                    ),
                )
            }

            return json
        } finally {
            connection.disconnect()
        }
    }
}
