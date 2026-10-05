package com.paymydine.mobile.kiosk

import android.os.Build
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.tabledisplay.DisplayTheme
import com.paymydine.mobile.tabledisplay.SecureStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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

        KioskProfile(
            restaurantName = restaurant.optString("name", "PayMyDine"),
            restaurantLogoUrl = absoluteUrl(
                host,
                restaurant.optString("logo", "/brand/paymydine-logo.svg"),
            ),
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
