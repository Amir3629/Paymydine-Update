package com.paymydine.mobile.edge

import com.paymydine.mobile.network.EdgeEndpoint
import com.paymydine.mobile.network.MobileApiException
import com.paymydine.mobile.sync.CommandEnvelope
import org.json.JSONObject
import java.io.IOException
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager

/**
 * HTTPS client for the restaurant LAN authority.
 *
 * Hostnames are intentionally not trusted because NSD returns an IP address.
 * Server identity is the exact SHA-256 certificate fingerprint provisioned by
 * PayMyDine Cloud during pairing/bootstrap.
 */
class EdgeApiClient {
    fun command(
        edge: EdgeEndpoint,
        pinnedFingerprint: String,
        bearerToken: String,
        command: CommandEnvelope,
    ): JSONObject {
        val body = JSONObject()
            .put("command_id", command.commandId)
            .put("idempotency_key", command.idempotencyKey)
            .put("aggregate", command.aggregate)
            .put("aggregate_id", command.aggregateId)
            .put("base_version", command.baseVersion)
            .put("command_type", command.commandType)
            .put(
                "payload",
                runCatching { JSONObject(command.payloadJson) }
                    .getOrElse {
                        throw IOException("Queued command payload is invalid JSON.")
                    },
            )
            .toString()

        return request(
            edge = edge,
            pinnedFingerprint = pinnedFingerprint,
            bearerToken = bearerToken,
            path = "/v1/commands",
            method = "POST",
            body = body,
        )
    }

    fun events(
        edge: EdgeEndpoint,
        pinnedFingerprint: String,
        bearerToken: String,
        after: Long,
        limit: Int = 250,
    ): JSONObject {
        val safeLimit = limit.coerceIn(1, 500)
        return request(
            edge = edge,
            pinnedFingerprint = pinnedFingerprint,
            bearerToken = bearerToken,
            path = "/v1/events?after=${after.coerceAtLeast(0)}&limit=$safeLimit",
            method = "GET",
            body = null,
        )
    }

    fun kdsSnapshot(
        edge: EdgeEndpoint,
        pinnedFingerprint: String,
        bearerToken: String,
        stationSlug: String?,
    ): JSONObject {
        val suffix = stationSlug
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let {
                "?station=" + java.net.URLEncoder.encode(it, "UTF-8")
            }
            .orEmpty()

        return request(
            edge = edge,
            pinnedFingerprint = pinnedFingerprint,
            bearerToken = bearerToken,
            path = "/v1/kds/snapshot$suffix",
            method = "GET",
            body = null,
        )
    }

    fun health(
        edge: EdgeEndpoint,
        pinnedFingerprint: String,
    ): JSONObject = request(
        edge = edge,
        pinnedFingerprint = pinnedFingerprint,
        bearerToken = null,
        path = "/v1/health",
        method = "GET",
        body = null,
    )

    private fun request(
        edge: EdgeEndpoint,
        pinnedFingerprint: String,
        bearerToken: String?,
        path: String,
        method: String,
        body: String?,
    ): JSONObject {
        val fingerprint = normalizeFingerprint(pinnedFingerprint)
        require(fingerprint.length == 64) {
            "Trusted PayMyDine Edge fingerprint is missing."
        }

        val trustManager = FingerprintTrustManager(fingerprint)
        val context = SSLContext.getInstance("TLS").apply {
            init(
                null,
                arrayOf(trustManager),
                SecureRandom(),
            )
        }

        val url = URL(
            "https://${edge.host}:${edge.port}$path",
        )
        val connection = (url.openConnection() as HttpsURLConnection).apply {
            sslSocketFactory = context.socketFactory
            hostnameVerifier = HostnameVerifier { _, _ -> true }
            requestMethod = method
            connectTimeout = 2_500
            readTimeout = 7_500
            useCaches = false
            instanceFollowRedirects = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "PayMyDine-Android-EdgeClient/1")
            setRequestProperty("Connection", "close")
            if (!bearerToken.isNullOrBlank()) {
                setRequestProperty(
                    "Authorization",
                    "Bearer $bearerToken",
                )
            }
            if (body != null) {
                doOutput = true
                setRequestProperty(
                    "Content-Type",
                    "application/json; charset=utf-8",
                )
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
                    statusCode = code,
                    message = message.ifBlank {
                        "PayMyDine Edge returned HTTP $code."
                    },
                )
            }

            return JSONObject(response)
        } finally {
            connection.disconnect()
        }
    }

    private fun normalizeFingerprint(value: String): String =
        value.lowercase().replace(":", "").trim()

    private class FingerprintTrustManager(
        private val expected: String,
    ) : X509TrustManager {
        override fun checkClientTrusted(
            chain: Array<out X509Certificate>?,
            authType: String?,
        ) = Unit

        override fun checkServerTrusted(
            chain: Array<out X509Certificate>?,
            authType: String?,
        ) {
            val certificate = chain?.firstOrNull()
                ?: throw java.security.cert.CertificateException(
                    "PayMyDine Edge did not provide a certificate.",
                )

            val actual = MessageDigest.getInstance("SHA-256")
                .digest(certificate.encoded)
                .joinToString("") { "%02x".format(it) }

            if (!actual.equals(expected, ignoreCase = true)) {
                throw java.security.cert.CertificateException(
                    "PayMyDine Edge certificate fingerprint mismatch.",
                )
            }
        }

        override fun getAcceptedIssuers(): Array<X509Certificate> =
            emptyArray()
    }
}
