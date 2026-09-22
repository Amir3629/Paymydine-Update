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
    // PMD_ANDROID_PAIR_INITIAL_AUTH_V16
    val initialAuthorization: WorkspaceAuthorizationResult?,
)

data class PairStatusResult(
    val status: String,
    val exchange: String?,
    val tenantBaseUrl: String?,
    val requestCode: String?,
    val deviceName: String?,
)

data class PairRequestResult(
    val status: String,
    val requestCode: String?,
)

data class StaffLoginRequestResult(
    val status: String,
    val loginRequest: String?,
    val requestCode: String?,
    val authorization: WorkspaceAuthorizationResult?,
)

data class WorkspaceAuthorizationResult(
    val surface: String,
    val destination: String,
    val username: String,
    val staffName: String,
    val userId: Long,
    val staffId: Long,
    val roleCode: String,
    val route: String,
    val staffGrant: String,
    val leaseExpiresAt: Long,
    val offlineExpiresAt: Long,
)

class MobileApiException(
    val statusCode: Int,
    message: String,
) : IOException(message)

class MobileApiClient(private val staffGrant: String? = null) {
    /** PMD_ANDROID_NATIVE_PAIR_REQUEST_V12 */
    fun requestPairing(
        tenantBaseUrl: String,
        pairRequest: String,
        codeChallenge: String,
        deviceName: String,
        username: String,
        password: String,
    ): PairRequestResult {
        val base = trustedTenantBase(tenantBaseUrl)
        val body = JSONObject()
            .put("pair_request", pairRequest)
            .put("code_challenge", codeChallenge)
            .put("device_name", deviceName)
            .put("username", username.trim())
            .put("password", password)
            .toString()

        val json = JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/pair/request",
                ),
                method = "POST",
                token = null,
                body = body,
            ),
        )

        if (!json.optBoolean("ok")) {
            throw IOException("Pairing request was rejected.")
        }

        val status = json.optString("status").trim().lowercase()
        require(status == "pending") {
            "Pairing request status is invalid."
        }

        return PairRequestResult(
            status = status,
            requestCode = json.optString("request_code")
                .filter(Char::isDigit)
                .takeIf { it.length == 6 },
        )
    }

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

        val initialAuthorization = json
            .optJSONObject("initial_authorization")
            ?.let(::parseAuthorization)

        return PairExchangeResult(
            tenantHost = base.host.lowercase(),
            deviceToken = token,
            deviceId = deviceId,
            locationId = locationId,
            initialAuthorization = initialAuthorization,
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

    /** PMD_ANDROID_CANONICAL_LOGIN_WAIT_CLIENT_V12 */
    fun requestStaffLogin(
        tenantHost: String,
        deviceToken: String,
        username: String,
        password: String,
    ): StaffLoginRequestResult {
        val base = trustedTenantBase("https://$tenantHost")
        val json = JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/workspace/request",
                ),
                method = "POST",
                token = deviceToken,
                body = JSONObject()
                    .put("username", username.trim())
                    .put("password", password)
                    .toString(),
            ),
        )

        return parseStaffLoginRequest(json)
    }

    fun staffLoginStatus(
        tenantHost: String,
        deviceToken: String,
        loginRequest: String,
    ): StaffLoginRequestResult {
        val base = trustedTenantBase("https://$tenantHost")
        val json = JSONObject(
            request(
                url = URL(
                    base.toString().trimEnd('/') +
                        "/admin/api/mobile/v1/workspace/status",
                ),
                method = "POST",
                token = deviceToken,
                body = JSONObject()
                    .put("login_request", loginRequest)
                    .toString(),
            ),
        )

        return parseStaffLoginRequest(json)
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
        return authorizeStaffInternal(
            tenantHost = tenantHost,
            deviceToken = deviceToken,
            surface = normalizedSurface,
            username = username,
            password = password,
        ).also {
            require(it.surface == normalizedSurface) {
                "Workspace authorization response is incomplete."
            }
        }
    }

    fun authorizeStaff(
        tenantHost: String,
        deviceToken: String,
        username: String,
        password: String,
    ): WorkspaceAuthorizationResult =
        authorizeStaffInternal(
            tenantHost = tenantHost,
            deviceToken = deviceToken,
            surface = null,
            username = username,
            password = password,
        )

    private fun authorizeStaffInternal(
        tenantHost: String,
        deviceToken: String,
        surface: String?,
        username: String,
        password: String,
    ): WorkspaceAuthorizationResult {
        val base = trustedTenantBase("https://$tenantHost")
        val body = JSONObject()
            .put("username", username.trim())
            .put("password", password)
            .apply {
                if (!surface.isNullOrBlank()) put("surface", surface)
            }
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
            throw IOException("PayMyDine sign-in was rejected.")
        }

        return parseAuthorization(json)
    }

    private fun parseStaffLoginRequest(
        json: JSONObject,
    ): StaffLoginRequestResult {
        if (!json.optBoolean("ok")) {
            throw IOException("PayMyDine sign-in was rejected.")
        }

        val status = json.optString("status").trim().lowercase()
        require(status in setOf("pending", "authorized", "declined", "expired")) {
            "PayMyDine sign-in status is invalid."
        }

        val authorization = if (status == "authorized") {
            parseAuthorization(json)
        } else {
            null
        }

        return StaffLoginRequestResult(
            status = status,
            loginRequest = json.optString("login_request")
                .trim()
                .takeIf { it.isNotBlank() },
            requestCode = json.optString("request_code")
                .filter(Char::isDigit)
                .takeIf { it.length == 6 },
            authorization = authorization,
        ).also {
            if (status == "pending") {
                require(!it.loginRequest.isNullOrBlank()) {
                    "Restaurant approval request is incomplete."
                }
            }
        }
    }

    private fun parseAuthorization(
        json: JSONObject,
    ): WorkspaceAuthorizationResult {
        val leaseExpiresAt = json.optLong("lease_expires_at", 0L)
        val offlineExpiresAt = json.optLong(
            "offline_expires_at",
            leaseExpiresAt,
        )

        val result = WorkspaceAuthorizationResult(
            surface = json.optString("surface").trim().lowercase(),
            destination = json.optString("destination", "workspace")
                .trim()
                .lowercase(),
            username = json.optString("username").trim(),
            staffName = json.optString("staff_name").trim(),
            userId = json.optLong("user_id", 0L),
            staffId = json.optLong("staff_id", 0L),
            roleCode = json.optString("role_code").trim().lowercase(),
            route = json.optString("route").trim().trim('/'),
            staffGrant = json.optString("staff_grant").trim(),
            leaseExpiresAt = leaseExpiresAt,
            offlineExpiresAt = offlineExpiresAt,
        )

        require(
            result.surface in setOf("pos", "kds", "reservations", "web") &&
                result.destination in setOf("workspace", "staff") &&
                result.username.isNotBlank() &&
                result.roleCode.isNotBlank() &&
                result.route.isNotBlank() &&
                result.staffGrant.isNotBlank() &&
                result.leaseExpiresAt > System.currentTimeMillis() / 1000L &&
                result.offlineExpiresAt > System.currentTimeMillis() / 1000L
        ) {
            "PayMyDine sign-in response is incomplete."
        }

        return result
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
            if (!staffGrant.isNullOrBlank()) {
                setRequestProperty("X-PayMyDine-Staff-Grant", staffGrant)
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
