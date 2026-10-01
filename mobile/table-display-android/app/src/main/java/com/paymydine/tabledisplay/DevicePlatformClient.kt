package com.paymydine.tabledisplay

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

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
