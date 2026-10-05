package com.paymydine.mobile.kiosk

import android.os.Build
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.tabledisplay.DisplayTheme
import com.paymydine.mobile.tabledisplay.SecureStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class KioskPairResult(
    val token: String,
    val deviceId: Long,
    val locationId: Long,
)

data class KioskProfile(
    val restaurantName: String,
    val restaurantLogoUrl: String,
    val theme: DisplayTheme,
    val menuUrl: String,
    val idleTimeoutSeconds: Long,
)

data class KioskLocaleProfile(
    val enabled: List<String>,
    val defaultLocale: String,
)

data class KioskTerminalPaymentResult(
    val ok: Boolean,
    val attemptId: Long,
    val status: String,
    val message: String,
    val paymentRecorded: Boolean,
)

/**
 * PMD_KIOSK_BOOTSTRAP_HANDOFF_V13
 * PMD_KIOSK_MULTI_WARM_BOOTSTRAP_V15
 *
 * The native welcome already downloads the canonical menu bootstrap to choose
 * restaurant photography. V15 keeps the fresh response reusable for its short
 * TTL so both pre-rendered Eat Here / Take Away WebViews can hydrate from the
 * same canonical payload without racing each other or touching the network.
 */
object KioskBootstrapWarmCache {
    private data class Entry(
        val host: String,
        val body: String,
        val savedAtMs: Long,
    )

    @Volatile
    private var entry: Entry? = null

    fun put(
        host: String,
        body: String,
    ) {
        if (body.isBlank()) return
        entry =
            Entry(
                host = SecureStore.normalizeHost(host).lowercase(),
                body = body,
                savedAtMs = System.currentTimeMillis(),
            )
    }

    @Synchronized
    fun peek(host: String): String? {
        val current = entry ?: return null
        val normalized = SecureStore.normalizeHost(host).lowercase()
        val ageMs = System.currentTimeMillis() - current.savedAtMs
        if (current.host != normalized || ageMs !in 0..90_000L) {
            entry = null
            return null
        }

        return current.body
    }

    // Backward-compatible alias for older call sites. V15 deliberately does
    // not consume the snapshot because two service-mode WebViews warm in
    // parallel from the same restaurant bootstrap.
    @Synchronized
    fun consume(host: String): String? = peek(host)
}

class KioskApiClient {
    suspend fun pair(
        host: String,
        code: String,
        installationId: String,
    ): KioskPairResult = withContext(Dispatchers.IO) {
        val body =
            JSONObject()
                .put("code", code.trim())
                .put("installation_id", installationId)
                .put(
                    "device_name",
                    ("PayMyDine Kiosk · " + Build.MANUFACTURER + " " + Build.MODEL).trim(),
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

        val json = request(
            host = host,
            endpoint = "pair",
            method = "POST",
            body = body,
            token = null,
        )

        KioskPairResult(
            token = json.getString("device_token"),
            deviceId = json.getLong("device_id"),
            locationId = json.getLong("location_id"),
        )
    }

    suspend fun state(
        host: String,
        token: String,
    ): KioskProfile = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "state",
            method = "GET",
            body = null,
            token = token,
        )
        val restaurant = json.optJSONObject("restaurant") ?: JSONObject()
        val theme = json.optJSONObject("theme") ?: JSONObject()
        val restaurantLogo = restaurant.optString("logo", "").trim()

        KioskProfile(
            restaurantName = restaurant.optString("name", "PayMyDine"),
            restaurantLogoUrl =
                if (restaurantLogo.isBlank()) {
                    ""
                } else {
                    absoluteUrl(host, restaurantLogo)
                },
            theme = DisplayTheme(
                id = theme.optString("id", "kazen_japanese"),
                background = theme.optString("background", "#F5F1EB"),
                text = theme.optString("text", "#25231F"),
                muted = theme.optString("muted", "#777168"),
                accent = theme.optString("accent", "#B5413F"),
                surface = theme.optString("surface", "#FBF8F3"),
                isDark = theme.optBoolean("is_dark", false),
            ),
            menuUrl = absoluteUrl(
                host,
                json.optString("menu_url", "/"),
            ),
            idleTimeoutSeconds = json.optLong("idle_timeout_seconds", 120L)
                .coerceIn(45L, 600L),
        )
    }


    /**
     * PMD_KIOSK_CARD_PRESENT_PAYMENT_V18
     * Terminal credentials and provider routing stay on the server. Android
     * supplies only its kiosk bearer token, order id and current kiosk session.
     */
    suspend fun terminalPaymentStart(
        host: String,
        token: String,
        orderId: Long,
        kioskSession: String,
    ): KioskTerminalPaymentResult = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "payment/start",
            method = "POST",
            body = JSONObject()
                .put("order_id", orderId)
                .put("kiosk_session", kioskSession),
            token = token,
        )
        parseTerminalPayment(json)
    }

    suspend fun terminalPaymentStatus(
        host: String,
        token: String,
        attemptId: Long,
        kioskSession: String,
    ): KioskTerminalPaymentResult = withContext(Dispatchers.IO) {
        val json = request(
            host = host,
            endpoint = "payment/status",
            method = "POST",
            body = JSONObject()
                .put("attempt_id", attemptId)
                .put("kiosk_session", kioskSession),
            token = token,
        )
        parseTerminalPayment(json)
    }

    private fun parseTerminalPayment(json: JSONObject): KioskTerminalPaymentResult {
        val payment = json.optJSONObject("payment") ?: JSONObject()
        return KioskTerminalPaymentResult(
            ok = json.optBoolean("ok", false) || payment.optBoolean("success", false),
            attemptId = payment.optLong("attempt_id", 0L),
            status = payment.optString("status", "").trim().lowercase(),
            message = payment.optString(
                "message",
                json.optString("message", ""),
            ).trim(),
            paymentRecorded = payment.optBoolean("payment_recorded", false),
        )
    }

    /**
     * PMD_KIOSK_WELCOME_LANGUAGE_V18
     *
     * Reuse the already-warmed customer bootstrap so the native service-mode
     * screen exposes the same enabled languages as the kiosk menu without a
     * second network request.
     */
    suspend fun localeProfile(host: String): KioskLocaleProfile = withContext(Dispatchers.IO) {
        val raw = KioskBootstrapWarmCache.peek(host)
            ?: return@withContext KioskLocaleProfile(listOf("de", "en"), "de")

        val root = runCatching { JSONObject(raw) }.getOrNull()
            ?: return@withContext KioskLocaleProfile(listOf("de", "en"), "de")
        val data = root.optJSONObject("data") ?: JSONObject()
        val settings = unwrapObject(data.optJSONObject("settings"))
        val theme = unwrapObject(data.optJSONObject("theme"))

        fun firstText(vararg keys: String): String {
            for (key in keys) {
                val themeValue = theme.opt(key)
                if (themeValue != null && themeValue !== JSONObject.NULL && themeValue.toString().isNotBlank()) {
                    return themeValue.toString()
                }
                val settingsValue = settings.opt(key)
                if (settingsValue != null && settingsValue !== JSONObject.NULL && settingsValue.toString().isNotBlank()) {
                    return settingsValue.toString()
                }
            }
            return ""
        }

        val rawEnabled = firstText("pmd_v2_enabled_languages", "enabled_languages")
        val enabled = parseLocaleList(rawEnabled).toMutableList()
        val defaultLocale = firstText("default_language", "locale")
            .trim()
            .lowercase()
            .substringBefore('-')
            .ifBlank { "de" }

        if (defaultLocale !in enabled) enabled.add(0, defaultLocale)
        if (enabled.isEmpty()) enabled += listOf("de", "en")

        KioskLocaleProfile(
            enabled = enabled.distinct(),
            defaultLocale = defaultLocale,
        )
    }

    private fun unwrapObject(value: JSONObject?): JSONObject {
        if (value == null) return JSONObject()
        return value.optJSONObject("data") ?: value
    }

    private fun parseLocaleList(raw: String): List<String> {
        val text = raw.trim()
        val values =
            if (text.startsWith("[")) {
                runCatching {
                    val array = JSONArray(text)
                    (0 until array.length()).map { array.optString(it) }
                }.getOrDefault(emptyList())
            } else {
                text.split(',')
            }

        return values
            .map { it.trim().lowercase().substringBefore('-') }
            .filter { it.matches(Regex("^[a-z]{2,3}$")) }
            .distinct()
    }

    /**
     * PMD_KIOSK_PREMIUM_WELCOME_V11
     * Reuse the restaurant's existing menu photography for the native welcome
     * hero. This is intentionally read-only and best-effort; the kiosk still
     * works when the public bootstrap or an image is temporarily unavailable.
     */
    suspend fun heroImages(host: String): List<String> = withContext(Dispatchers.IO) {
        val normalized = SecureStore.normalizeHost(host)
        val connection =
            (URL(normalized + "/api/v1/frontend-bootstrap-batch-r1").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8_000
                readTimeout = 8_000
                useCaches = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-PayMyDine-Kiosk", "1")
            }

        try {
            if (connection.responseCode !in 200..299) return@withContext emptyList()

            val text = connection.inputStream.bufferedReader().use { it.readText() }
            KioskBootstrapWarmCache.put(host, text)
            val json = runCatching { JSONObject(text) }.getOrNull() ?: return@withContext emptyList()
            val menu = json.optJSONObject("data")?.opt("menu") ?: return@withContext emptyList()
            val raw = linkedSetOf<String>()
            collectHeroImageCandidates(menu, raw, "")

            raw.asSequence()
                .map { absoluteAssetUrl(host, it) }
                .filter { it.isNotBlank() }
                .distinct()
                .take(3)
                .toList()
        } catch (_: Throwable) {
            emptyList()
        } finally {
            connection.disconnect()
        }
    }

    private fun collectHeroImageCandidates(
        value: Any?,
        output: LinkedHashSet<String>,
        keyHint: String,
    ) {
        if (output.size >= 8 || value == null || value === JSONObject.NULL) return

        when (value) {
            is JSONObject -> {
                val keys = value.keys()
                while (keys.hasNext() && output.size < 8) {
                    val key = keys.next()
                    collectHeroImageCandidates(value.opt(key), output, key)
                }
            }

            is JSONArray -> {
                for (index in 0 until value.length()) {
                    if (output.size >= 8) break
                    collectHeroImageCandidates(value.opt(index), output, keyHint)
                }
            }

            is String -> {
                val key = keyHint.lowercase()
                val candidate = value.trim()
                val imageKey =
                    key.contains("image") ||
                        key == "src" ||
                        key == "path" ||
                        key == "thumbnail" ||
                        key == "photo"
                if (
                    imageKey &&
                    candidate.isNotBlank() &&
                    !candidate.startsWith("data:", ignoreCase = true)
                ) {
                    output += candidate
                }
            }
        }
    }

    private fun absoluteAssetUrl(
        host: String,
        value: String,
    ): String {
        val raw = value.trim()
        if (raw.isBlank()) return ""
        if (raw.startsWith("https://", ignoreCase = true)) return raw
        if (raw.startsWith("http://", ignoreCase = true)) return raw

        val normalized = SecureStore.normalizeHost(host)
        if (raw.startsWith("/")) return normalized + raw

        val clean = raw.trimStart('/')
        return when {
            clean.startsWith("api/media/") ||
                clean.startsWith("assets/media/") ||
                clean.startsWith("storage/") ||
                clean.startsWith("brand/") -> normalized + "/" + clean

            clean.startsWith("uploads/") -> normalized + "/assets/media/" + clean
            clean.startsWith("images/") -> normalized + "/api/media/" + clean.removePrefix("images/")
            else -> normalized + "/api/media/" + clean
        }
    }

    private fun request(
        host: String,
        endpoint: String,
        method: String,
        body: JSONObject?,
        token: String?,
    ): JSONObject {
        val normalized = SecureStore.normalizeHost(host)
        val url = URL(
            normalized +
                BuildConfig.KIOSK_API_PATH +
                "/" +
                endpoint.trim('/'),
        )
        val connection =
            (url.openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 12_000
                readTimeout = 12_000
                useCaches = false
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-PayMyDine-Kiosk", "1")
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
            val json = runCatching { JSONObject(text) }.getOrElse {
                JSONObject()
                    .put("ok", false)
                    .put("message", "PayMyDine returned an invalid kiosk response.")
            }

            if (status !in 200..299 || !json.optBoolean("ok", false)) {
                throw IllegalStateException(
                    json.optString(
                        "message",
                        "PayMyDine Kiosk request failed (" + status + ").",
                    ),
                )
            }

            return json
        } finally {
            connection.disconnect()
        }
    }

    private fun absoluteUrl(
        host: String,
        value: String,
    ): String {
        val raw = value.trim()
        if (raw.startsWith("https://", ignoreCase = true)) return raw
        if (raw.startsWith("http://", ignoreCase = true)) return raw

        val normalized = SecureStore.normalizeHost(host)
        return if (raw.isBlank() || raw == "/") {
            normalized + "/"
        } else {
            normalized + "/" + raw.trimStart('/')
        }
    }
}
