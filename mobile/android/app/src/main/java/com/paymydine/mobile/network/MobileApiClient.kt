package com.paymydine.mobile.network

import com.paymydine.mobile.sync.CommandEnvelope
import org.json.JSONObject
import java.io.IOException
import java.net.URI
import java.net.URL
import javax.net.ssl.HttpsURLConnection

data class PairExchangeResult(
    val tenantHost: String,
    val deviceToken: String,
    val deviceId: String,
    val locationId: Long,
)

class MobileApiException(
    val statusCode: Int,
    message: String,
) : IOException(message)

class MobileApiClient {
    fun exchange(tenantBaseUrl: String, exchange: String): PairExchangeResult {
        val base = trustedTenantBase(tenantBaseUrl)
        val body = JSONObject().put("exchange", exchange).toString()
        val response = request(
            url = URL(base.toString().trimEnd('/') + "/admin/api/mobile/v1/pair/exchange"),
            method = "POST",
            token = null,
            body = body,
        )
        val json = JSONObject(response)
        if (!json.optBoolean("ok")) throw IOException("Pairing exchange was rejected.")

        val token = json.optString("device_token").trim()
        val deviceId = json.optString("device_id").trim()
        val locationId = json.optLong("location_id", 0)

        if (token.isBlank() || deviceId.isBlank() || locationId < 1) {
            throw IOException("Pairing response is incomplete.")
        }

        return PairExchangeResult(
            tenantHost = base.host.lowercase(),
            deviceToken = token,
            deviceId = deviceId,
            locationId = locationId,
        )
    }

    fun bootstrap(tenantHost: String, deviceToken: String): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")
        val response = request(
            url = URL(base.toString().trimEnd('/') + "/admin/api/mobile/v1/bootstrap"),
            method = "GET",
            token = deviceToken,
            body = null,
        )
        return JSONObject(response).also {
            if (!it.optBoolean("ok")) throw IOException("Bootstrap was rejected.")
        }
    }

    fun sendCommand(
        tenantHost: String,
        deviceToken: String,
        command: CommandEnvelope,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")
        val payload = runCatching { JSONObject(command.payloadJson) }
            .getOrElse { throw IOException("Queued command payload is invalid JSON.") }

        val body = JSONObject()
            .put("command_id", command.commandId)
            .put("idempotency_key", command.idempotencyKey)
            .put("aggregate", command.aggregate)
            .put("aggregate_id", command.aggregateId)
            .put("base_version", command.baseVersion)
            .put("command_type", command.commandType)
            .put("payload", payload)
            .toString()

        return JSONObject(
            request(
                url = URL(base.toString().trimEnd('/') + "/admin/api/mobile/v1/sync/commands"),
                method = "POST",
                token = deviceToken,
                body = body,
            ),
        )
    }

    fun events(
        tenantHost: String,
        deviceToken: String,
        after: Long,
        limit: Int = 250,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")
        val safeLimit = limit.coerceIn(1, 500)
        val url = URL(
            base.toString().trimEnd('/') +
                "/admin/api/mobile/v1/sync/events?after=${after.coerceAtLeast(0)}&limit=$safeLimit",
        )

        return JSONObject(
            request(
                url = url,
                method = "GET",
                token = deviceToken,
                body = null,
            ),
        )
    }

    private fun trustedTenantBase(raw: String): URI {
        val uri = URI(raw.trim())
        val host = uri.host?.lowercase().orEmpty()

        require(uri.scheme.equals("https", ignoreCase = true)) {
            "PayMyDine pairing requires HTTPS."
        }
        require(host.endsWith(".paymydine.com") && host.length > ".paymydine.com".length) {
            "Untrusted PayMyDine tenant host."
        }
        require(uri.userInfo == null && uri.port == -1) {
            "Unexpected tenant URL authority."
        }

        return URI("https", null, host, -1, null, null, null)
    }

    private fun request(
        url: URL,
        method: String,
        token: String?,
        body: String?,
    ): String {
        val connection = (url.openConnection() as HttpsURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 20_000
            useCaches = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "PayMyDine-Android/0.1")
            if (!token.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }

        try {
            if (body != null) {
                connection.outputStream.use {
                    it.write(body.toByteArray(Charsets.UTF_8))
                }
            }

            val code = connection.responseCode
            val stream = if (code in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }
            val response = stream
                ?.bufferedReader(Charsets.UTF_8)
                ?.use { it.readText() }
                .orEmpty()

            if (code !in 200..299) {
                val message = runCatching {
                    JSONObject(response).optString("message")
                }.getOrNull().orEmpty()

                throw MobileApiException(
                    code,
                    if (message.isNotBlank()) {
                        message
                    } else {
                        "PayMyDine API returned HTTP $code."
                    },
                )
            }

            return response
        } finally {
            connection.disconnect()
        }
    }
}
