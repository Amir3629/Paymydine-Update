package com.paymydine.mobile.edge

import com.paymydine.mobile.PayMyDineApplication
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.Closeable
import java.net.SocketTimeoutException
import java.net.URI
import java.nio.charset.StandardCharsets
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLServerSocket
import javax.net.ssl.SSLSocket

/**
 * Tiny bounded HTTPS server for restaurant-LAN sync.
 *
 * It intentionally serves only four JSON routes, closes every connection and
 * never exposes Android files, WebViews, a shell, provider credentials or DB
 * credentials.
 */
class EdgeHttpServer(
    private val app: PayMyDineApplication,
    private val authority: EdgeAuthority,
    private val identity: EdgeTlsIdentity.Identity,
) : Closeable {
    private val acceptor = Executors.newSingleThreadExecutor()
    private val workers = Executors.newFixedThreadPool(6)

    @Volatile
    private var serverSocket: SSLServerSocket? = null

    @Volatile
    var port: Int = 0
        private set

    fun start(preferredPort: Int = DEFAULT_PORT): Int {
        check(serverSocket == null) { "PayMyDine Edge server is already running." }

        var lastError: Throwable? = null
        var socket: SSLServerSocket? = null

        for (candidate in preferredPort..(preferredPort + 10)) {
            try {
                socket = identity.sslContext.serverSocketFactory
                    .createServerSocket(candidate) as SSLServerSocket
                port = candidate
                break
            } catch (error: Throwable) {
                lastError = error
            }
        }

        val bound = socket
            ?: throw IllegalStateException(
                "PayMyDine Edge could not bind a local HTTPS port.",
                lastError,
            )

        bound.reuseAddress = true
        bound.needClientAuth = false
        bound.soTimeout = 1_000
        bound.enabledProtocols = bound.supportedProtocols
            .filter { it == "TLSv1.3" || it == "TLSv1.2" }
            .toTypedArray()

        serverSocket = bound

        acceptor.execute {
            while (!Thread.currentThread().isInterrupted) {
                val active = serverSocket ?: break

                try {
                    val socketClient = active.accept() as SSLSocket
                    socketClient.soTimeout = 10_000
                    workers.execute {
                        socketClient.use(::handle)
                    }
                } catch (_: SocketTimeoutException) {
                    // Wake periodically so stop() is prompt.
                } catch (_: Throwable) {
                    if (serverSocket == null) break
                }
            }
        }

        return port
    }

    override fun close() {
        val socket = serverSocket
        serverSocket = null
        runCatching { socket?.close() }

        acceptor.shutdownNow()
        workers.shutdownNow()
        runCatching {
            workers.awaitTermination(2, TimeUnit.SECONDS)
        }
    }

    private fun handle(socket: SSLSocket) {
        socket.startHandshake()

        val input = BufferedInputStream(socket.inputStream)
        val output = BufferedOutputStream(socket.outputStream)

        try {
            val request = readRequest(input)
            val response = route(request)
            writeResponse(output, response)
        } catch (error: EdgeHttpException) {
            writeResponse(
                output,
                JsonResponse(
                    status = error.statusCode,
                    body = JSONObject()
                        .put("ok", false)
                        .put("error", "edge_request_rejected")
                        .put("message", error.message)
                        .toString(),
                ),
            )
        } catch (error: Throwable) {
            writeResponse(
                output,
                JsonResponse(
                    status = 500,
                    body = JSONObject()
                        .put("ok", false)
                        .put("error", "edge_request_failed")
                        .put(
                            "message",
                            "The restaurant Edge could not process this request.",
                        )
                        .toString(),
                ),
            )
        }
    }

    private fun route(request: HttpRequest): JsonResponse {
        if (request.method == "GET" && request.path == "/v1/health") {
            return JsonResponse(
                status = 200,
                body = JSONObject()
                    .put("ok", true)
                    .put("protocol", "pmd-edge-v1")
                    .put(
                        "location_id",
                        app.bootstrapRepository.locationId()
                            ?: JSONObject.NULL,
                    )
                    .put(
                        "fingerprint_sha256",
                        identity.fingerprintSha256,
                    )
                    .put("port", port)
                    .toString(),
            )
        }

        val bearer = bearerToken(request.headers["authorization"])

        return when {
            request.method == "POST" && request.path == "/v1/commands" -> {
                val body = request.body
                    .takeIf { it.isNotBlank() }
                    ?.let(::JSONObject)
                    ?: throw EdgeHttpException(400, "JSON command body required.")

                val result = authority.execute(bearer, body)

                if (
                    !result.optBoolean("ok", true)
                    && result.optString("error").isNotBlank()
                ) {
                    throw EdgeHttpException(
                        409,
                        result.optString("message")
                            .ifBlank { result.optString("error") },
                    )
                }

                JsonResponse(200, result.toString())
            }

            request.method == "GET" && request.path == "/v1/events" -> {
                val after = request.query["after"]
                    ?.toLongOrNull()
                    ?.coerceAtLeast(0)
                    ?: 0L
                val limit = request.query["limit"]
                    ?.toIntOrNull()
                    ?.coerceIn(1, 500)
                    ?: 250

                JsonResponse(
                    200,
                    authority.events(
                        rawBearer = bearer,
                        after = after,
                        limit = limit,
                    ).toString(),
                )
            }

            request.method == "GET" && request.path == "/v1/kds/snapshot" -> {
                JsonResponse(
                    200,
                    authority.kdsSnapshot(
                        rawBearer = bearer,
                        stationSlug = request.query["station"],
                    ).toString(),
                )
            }

            else -> throw EdgeHttpException(
                404,
                "PayMyDine Edge route not found.",
            )
        }
    }

    private fun readRequest(input: BufferedInputStream): HttpRequest {
        val requestLine = readLine(input, MAX_REQUEST_LINE)
            ?: throw EdgeHttpException(400, "Empty Edge request.")

        val parts = requestLine.split(' ', limit = 3)
        if (parts.size != 3) {
            throw EdgeHttpException(400, "Malformed Edge request line.")
        }

        val method = parts[0].uppercase(Locale.US)
        if (method !in setOf("GET", "POST")) {
            throw EdgeHttpException(405, "Unsupported Edge HTTP method.")
        }

        val target = parts[1]
        if (target.length > MAX_REQUEST_LINE) {
            throw EdgeHttpException(414, "Edge request target is too long.")
        }

        val headers = linkedMapOf<String, String>()
        var headerBytes = 0

        while (true) {
            val line = readLine(input, MAX_HEADER_LINE)
                ?: throw EdgeHttpException(400, "Unexpected end of Edge headers.")
            headerBytes += line.length + 2

            if (headerBytes > MAX_HEADERS_TOTAL) {
                throw EdgeHttpException(431, "Edge request headers are too large.")
            }
            if (line.isEmpty()) break

            val colon = line.indexOf(':')
            if (colon <= 0) {
                throw EdgeHttpException(400, "Malformed Edge request header.")
            }

            val name = line.substring(0, colon)
                .trim()
                .lowercase(Locale.US)
            val value = line.substring(colon + 1).trim()

            if (name.isNotBlank()) {
                headers[name] = value
            }
        }

        val contentLength = headers["content-length"]
            ?.toLongOrNull()
            ?: 0L

        if (contentLength < 0 || contentLength > MAX_BODY_BYTES) {
            throw EdgeHttpException(
                413,
                "Edge request body is too large.",
            )
        }

        val bodyBytes = ByteArray(contentLength.toInt())
        var offset = 0
        while (offset < bodyBytes.size) {
            val read = input.read(
                bodyBytes,
                offset,
                bodyBytes.size - offset,
            )
            if (read < 0) {
                throw EdgeHttpException(
                    400,
                    "Edge request body ended unexpectedly.",
                )
            }
            offset += read
        }

        val uri = try {
            URI(target)
        } catch (_: Throwable) {
            throw EdgeHttpException(400, "Malformed Edge request target.")
        }

        val query = parseQuery(uri.rawQuery)

        return HttpRequest(
            method = method,
            path = uri.path ?: "/",
            query = query,
            headers = headers,
            body = String(bodyBytes, StandardCharsets.UTF_8),
        )
    }

    private fun parseQuery(raw: String?): Map<String, String> {
        if (raw.isNullOrBlank()) return emptyMap()

        return buildMap {
            raw.split('&').take(32).forEach { item ->
                val parts = item.split('=', limit = 2)
                val key = java.net.URLDecoder.decode(
                    parts[0],
                    "UTF-8",
                )
                val value = java.net.URLDecoder.decode(
                    parts.getOrElse(1) { "" },
                    "UTF-8",
                )
                if (key.isNotBlank()) put(key, value)
            }
        }
    }

    private fun bearerToken(value: String?): String {
        val raw = value.orEmpty().trim()
        if (!raw.startsWith("Bearer ", ignoreCase = true)) {
            throw EdgeHttpException(
                401,
                "PayMyDine device bearer token required.",
            )
        }

        val token = raw.substringAfter(' ').trim()
        if (token.isBlank() || token.length > 512) {
            throw EdgeHttpException(
                401,
                "PayMyDine device bearer token is invalid.",
            )
        }

        return token
    }

    private fun readLine(
        input: BufferedInputStream,
        maxBytes: Int,
    ): String? {
        val out = ByteArrayOutputStream()
        var previous = -1

        while (out.size() <= maxBytes) {
            val current = input.read()
            if (current < 0) {
                if (out.size() == 0) return null
                break
            }

            if (previous == '\r'.code && current == '\n'.code) {
                val bytes = out.toByteArray()
                val length = (bytes.size - 1).coerceAtLeast(0)
                return String(
                    bytes,
                    0,
                    length,
                    StandardCharsets.US_ASCII,
                )
            }

            out.write(current)
            previous = current
        }

        if (out.size() > maxBytes) {
            throw EdgeHttpException(
                431,
                "Edge request line/header is too large.",
            )
        }

        return out.toString(StandardCharsets.US_ASCII.name())
    }

    private fun writeResponse(
        output: BufferedOutputStream,
        response: JsonResponse,
    ) {
        val body = response.body
            .toByteArray(StandardCharsets.UTF_8)
        val reason = when (response.status) {
            200 -> "OK"
            400 -> "Bad Request"
            401 -> "Unauthorized"
            403 -> "Forbidden"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            409 -> "Conflict"
            410 -> "Gone"
            413 -> "Payload Too Large"
            414 -> "URI Too Long"
            422 -> "Unprocessable Entity"
            425 -> "Too Early"
            429 -> "Too Many Requests"
            431 -> "Request Header Fields Too Large"
            503 -> "Service Unavailable"
            else -> "Internal Server Error"
        }

        val headers = buildString {
            append("HTTP/1.1 ${response.status} $reason\r\n")
            append("Content-Type: application/json; charset=utf-8\r\n")
            append("Content-Length: ${body.size}\r\n")
            append("Cache-Control: no-store, private\r\n")
            append("Pragma: no-cache\r\n")
            append("X-Content-Type-Options: nosniff\r\n")
            append("Connection: close\r\n")
            append("\r\n")
        }.toByteArray(StandardCharsets.US_ASCII)

        output.write(headers)
        output.write(body)
        output.flush()
    }

    private data class HttpRequest(
        val method: String,
        val path: String,
        val query: Map<String, String>,
        val headers: Map<String, String>,
        val body: String,
    )

    private data class JsonResponse(
        val status: Int,
        val body: String,
    )

    companion object {
        const val DEFAULT_PORT = 8443

        private const val MAX_REQUEST_LINE = 4 * 1024
        private const val MAX_HEADER_LINE = 8 * 1024
        private const val MAX_HEADERS_TOTAL = 32 * 1024
        private const val MAX_BODY_BYTES = 1024L * 1024L
    }
}
