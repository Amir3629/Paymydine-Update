package com.paymydine.tabledisplay

import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ApiClient {
    suspend fun pair(
        host: String,
        code: String,
        installationId: String,
    ): PairResult = withContext(Dispatchers.IO) {
        val normalized = SecureStore.normalizeHost(host)
        val body =
            JSONObject()
                .put("code", code.trim())
                .put("installation_id", installationId)
                .put(
                    "device_name",
                    ("Table Companion " + Build.MANUFACTURER + " " + Build.MODEL).trim(),
                )
                .put(
                    "platform",
                    JSONObject()
                        .put("manufacturer", Build.MANUFACTURER)
                        .put("model", Build.MODEL)
                        .put("sdk", Build.VERSION.SDK_INT)
                        .put("release", Build.VERSION.RELEASE)
                        .put("app_version", BuildConfig.VERSION_NAME),
                )

        val json = request(normalized, "pair", "POST", body, null)
        PairResult(
            token = json.getString("device_token"),
            deviceId = json.getLong("device_id"),
            locationId = json.getLong("location_id"),
            deploymentMode = json.optBoolean("deployment_mode", false),
        )
    }

    suspend fun tables(host: String, token: String): List<DeviceTable> =
        withContext(Dispatchers.IO) {
            val json = request(host, "tables", "GET", null, token)
            val rows = json.optJSONArray("tables") ?: JSONArray()
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    add(
                        DeviceTable(
                            id = row.optLong("id"),
                            number = row.optString("number"),
                            name = row.optString("name", "Table"),
                            floor = row.optString("floor"),
                            enabled = row.optBoolean("enabled", true),
                        ),
                    )
                }
            }
        }

    suspend fun bind(
        host: String,
        token: String,
        tableId: Long,
    ) = withContext(Dispatchers.IO) {
        request(
            host,
            "bind",
            "POST",
            JSONObject().put("table_id", tableId),
            token,
        )
    }

    suspend fun state(host: String, token: String): DisplayState =
        withContext(Dispatchers.IO) {
            val result = rawRequest(host, "state", "GET", null, token)
            if (
                result.status == 409 &&
                result.json.optString("code") == "table_not_bound"
            ) {
                throw TableNotBoundException()
            }
            if (
                result.status !in 200..299 ||
                !result.json.optBoolean("ok", false)
            ) {
                throw IllegalStateException(
                    result.json.optString(
                        "message",
                        "Table display could not be loaded.",
                    ),
                )
            }

            val json = result.json
            val table = json.optJSONObject("table") ?: JSONObject()
            val restaurant = json.optJSONObject("restaurant") ?: JSONObject()
            val event = json.optJSONObject("event") ?: JSONObject()

            DisplayState(
                restaurantName = restaurant.optString("name", "PayMyDine"),
                restaurantLogoUrl = absoluteUrl(
                    host,
                    restaurant.optString("logo", "/brand/paymydine-logo.svg"),
                ),
                table = DisplayTable(
                    id = table.optLong("id"),
                    number = table.optString("number"),
                    name = table.optString("name", "Table"),
                    menuUrl = table.optString("menu_url"),
                    enabled = table.optBoolean("enabled", true),
                ),
                event = DisplayEvent(
                    type = event.optString("type", "idle"),
                    key = event.optString("key", "idle"),
                    headline = event.optString(
                        "headline",
                        "Scan to order",
                    ),
                    message = event.optString(
                        "message",
                        "",
                    ),
                    orderId = event.optLong("order_id"),
                    amount = event.optDouble("amount", 0.0),
                    currency = event.optString("currency", "EUR"),
                ),
                serverTime = json.optString("server_time"),
            )
        }

    private fun absoluteUrl(
        host: String,
        value: String,
    ): String {
        val raw = value.trim()
        if (raw.startsWith("https://", ignoreCase = true)) return raw
        if (raw.startsWith("http://", ignoreCase = true)) return raw

        val normalized = SecureStore.normalizeHost(host)
        if (raw.isBlank()) {
            return normalized + "/brand/paymydine-logo.svg"
        }

        return normalized + "/" + raw.trimStart('/')
    }

    private fun request(
        host: String,
        endpoint: String,
        method: String,
        body: JSONObject?,
        token: String?,
    ): JSONObject {
        val result = rawRequest(host, endpoint, method, body, token)
        if (
            result.status !in 200..299 ||
            !result.json.optBoolean("ok", false)
        ) {
            throw IllegalStateException(
                result.json.optString(
                    "message",
                    "PayMyDine request failed (" + result.status + ").",
                ),
            )
        }
        return result.json
    }

    private fun rawRequest(
        host: String,
        endpoint: String,
        method: String,
        body: JSONObject?,
        token: String?,
    ): HttpResult {
        val normalized = SecureStore.normalizeHost(host)
        val url =
            URL(
                normalized +
                    BuildConfig.TABLE_DISPLAY_API_PATH +
                    "/" +
                    endpoint.trim('/'),
            )

        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 12_000
            useCaches = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("X-PayMyDine-Table-Display", "1")
            if (!token.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }

        try {
            if (body != null) {
                connection.outputStream.use {
                    it.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val status = connection.responseCode
            val source =
                if (status in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }
            val text = source?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json =
                runCatching { JSONObject(text) }.getOrElse {
                    JSONObject()
                        .put("ok", false)
                        .put("message", "PayMyDine returned an invalid response.")
                }
            return HttpResult(status, json)
        } finally {
            connection.disconnect()
        }
    }

    private data class HttpResult(
        val status: Int,
        val json: JSONObject,
    )
}
