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

data class PairStatusResult(
    val status: String,
    val exchange: String?,
    val tenantBaseUrl: String?,
    val requestCode: String?,
    val deviceName: String?,
)

data class WorkspaceAuthorizationResult(
    val surface: String,
    val username: String,
    val leaseExpiresAt: Long,
)

class MobileApiException(
    val statusCode: Int,
    message: String,
) : IOException(message)

class MobileApiClient {
    fun pairStatus(
        tenantBaseUrl: String,
        pairRequest: String,
        codeVerifier: String,
    ): PairStatusResult {
        val base = trustedTenantBase(tenantBaseUrl)
        val body = JSONObject()
            .put("pair_request", pairRequest)
            .put("code_verifier", codeVerifier)
            .toString()

        val json = JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/pair/status",
                ),
                method = "POST",
                token = null,
                body = body,
            ),
        )

        if (!json.optBoolean("ok")) {
            throw IOException("Pairing status was rejected.")
        }

        val status = json.optString("status").trim().lowercase()
        require(status in setOf("pending", "approved", "expired", "used", "declined")) {
            "Pairing status is invalid."
        }

        val exchange = json.optString("exchange")
            .trim()
            .takeIf { it.length == 64 }
        val tenant = json.optString("tenant")
            .trim()
            .takeIf { it.isNotBlank() }
        val requestCode = json.optString("request_code")
            .filter(Char::isDigit)
            .takeIf { it.length == 6 }
        val deviceName = json.optString("device_name")
            .trim()
            .takeIf { it.isNotBlank() }

        if (status == "approved") {
            require(exchange != null && tenant != null) {
                "Approved pairing response is incomplete."
            }
            require(trustedTenantBase(tenant).host.equals(base.host, ignoreCase = true)) {
                "Pairing status belongs to another restaurant."
            }
        }

        return PairStatusResult(
            status = status,
            exchange = exchange,
            tenantBaseUrl = tenant,
            requestCode = requestCode,
            deviceName = deviceName,
        )
    }

    fun exchange(
        tenantBaseUrl: String,
        exchange: String,
        codeVerifier: String,
    ): PairExchangeResult {
        val base = trustedTenantBase(tenantBaseUrl)
        val body = JSONObject()
            .put("exchange", exchange)
            .put("code_verifier", codeVerifier)
            .toString()
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

    fun authorizeWorkspace(
        tenantHost: String,
        deviceToken: String,
        surface: String,
        username: String,
        password: String,
    ): WorkspaceAuthorizationResult {
        val normalizedSurface = surface.trim().lowercase()
        require(normalizedSurface in setOf("pos", "kds", "reservations")) {
            "Unsupported PayMyDine workspace."
        }

        val base = trustedTenantBase("https://$tenantHost")
        val body = JSONObject()
            .put("surface", normalizedSurface)
            .put("username", username.trim())
            .put("password", password)
            .toString()

        val json = JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/workspace/authorize",
                ),
                method = "POST",
                token = deviceToken,
                body = body,
            ),
        )

        if (!json.optBoolean("ok")) {
            throw IOException("Workspace authorization was rejected.")
        }

        val authorizedSurface = json.optString("surface").trim().lowercase()
        val authorizedUsername = json.optString("username").trim()
        val leaseExpiresAt = json.optLong("lease_expires_at", 0L)

        require(
            authorizedSurface == normalizedSurface &&
                authorizedUsername.isNotBlank() &&
                leaseExpiresAt > System.currentTimeMillis() / 1000L
        ) {
            "Workspace authorization response is incomplete."
        }

        return WorkspaceAuthorizationResult(
            surface = authorizedSurface,
            username = authorizedUsername,
            leaseExpiresAt = leaseExpiresAt,
        )
    }

    fun registerEdge(
        tenantHost: String,
        deviceToken: String,
        fingerprintSha256: String,
        port: Int,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")
        val body = JSONObject()
            .put("fingerprint_sha256", fingerprintSha256.lowercase())
            .put("port", port)
            .put("protocol", "pmd-edge-v1")
            .toString()

        return JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/edge/register",
                ),
                method = "POST",
                token = deviceToken,
                body = body,
            ),
        )
    }

    fun edgeHeartbeat(
        tenantHost: String,
        deviceToken: String,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")

        return JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/edge/heartbeat",
                ),
                method = "POST",
                token = deviceToken,
                body = "{}",
            ),
        )
    }

    fun disableEdge(
        tenantHost: String,
        deviceToken: String,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")

        return JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/edge/disable",
                ),
                method = "POST",
                token = deviceToken,
                body = "{}",
            ),
        )
    }

    fun kdsSnapshot(
        tenantHost: String,
        deviceToken: String,
        stationSlug: String? = null,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")
        val suffix = stationSlug
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { "?station=" + java.net.URLEncoder.encode(it, "UTF-8") }
            .orEmpty()

        return JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/kds/snapshot" +
                        suffix,
                ),
                method = "GET",
                token = deviceToken,
                body = null,
            ),
        )
    }

    fun sendCommand(
        tenantHost: String,
        deviceToken: String,
        command: CommandEnvelope,
    ): JSONObject {
        val payload = runCatching { JSONObject(command.payloadJson) }
            .getOrElse {
                throw IOException("Queued command payload is invalid JSON.")
            }

        return sendCommandJson(
            tenantHost = tenantHost,
            deviceToken = deviceToken,
            command = JSONObject()
                .put("command_id", command.commandId)
                .put("idempotency_key", command.idempotencyKey)
                .put("aggregate", command.aggregate)
                .put("aggregate_id", command.aggregateId)
                .put("base_version", command.baseVersion)
                .put("command_type", command.commandType)
                .put("payload", payload),
        )
    }

    fun sendCommandJson(
        tenantHost: String,
        deviceToken: String,
        command: JSONObject,
    ): JSONObject {
        val base = trustedTenantBase("https://$tenantHost")

        return JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/sync/commands",
                ),
                method = "POST",
                token = deviceToken,
                body = command.toString(),
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
