package com.paymydine.mobile.tabledisplay

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureStore(context: Context) {
    private val prefs =
        context.getSharedPreferences("pmd-table-companion-v1", Context.MODE_PRIVATE)

    fun installationId(): String {
        val existing = prefs.getString("installation_id", null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        prefs.edit().putString("installation_id", created).apply()
        return created
    }

    fun host(): String? = prefs.getString("host", null)
    fun token(): String? = getSecret("device_token")
    fun deviceId(): Long = prefs.getLong("device_id", 0L)

    fun savePairing(
        host: String,
        token: String,
        deviceId: Long,
        centrallyManaged: Boolean = false,
    ) {
        prefs.edit()
            .putString("host", normalizeHost(host))
            .putLong("device_id", deviceId)
            .putBoolean("centrally_managed", centrallyManaged)
            .apply()
        putSecret("device_token", token)
    }

    fun centrallyManaged(): Boolean =
        prefs.getBoolean("centrally_managed", false)

    fun clearPairing() {
        prefs.edit()
            .remove("host")
            .remove("device_id")
            .remove("device_token")
            .remove("centrally_managed")
            .remove("display_snapshot_v1")
            .remove("device_screen_state")
            .remove("device_brightness")
            .apply()
    }

    fun isPaired(): Boolean =
        !host().isNullOrBlank() && !token().isNullOrBlank()

    fun saveDisplaySnapshot(state: DisplayState) {
        val safeEvent =
            if (state.event.type == "table_unavailable") {
                state.event
            } else {
                state.event.copy(
                    type = "idle",
                    key = "idle",
                    headline = "Scan to order",
                    message = "",
                    orderId = 0L,
                    amount = 0.0,
                )
            }

        val json =
            JSONObject()
                .put("restaurant_name", state.restaurantName)
                .put("restaurant_logo", state.restaurantLogoUrl)
                .put(
                    "theme",
                    JSONObject()
                        .put("id", state.theme.id)
                        .put("background", state.theme.background)
                        .put("text", state.theme.text)
                        .put("muted", state.theme.muted)
                        .put("accent", state.theme.accent)
                        .put("surface", state.theme.surface)
                        .put("is_dark", state.theme.isDark),
                )
                .put(
                    "table",
                    JSONObject()
                        .put("id", state.table.id)
                        .put("number", state.table.number)
                        .put("name", state.table.name)
                        .put("menu_url", state.table.menuUrl)
                        .put("enabled", state.table.enabled),
                )
                .put(
                    "event",
                    JSONObject()
                        .put("type", safeEvent.type)
                        .put("key", safeEvent.key)
                        .put("headline", safeEvent.headline)
                        .put("message", safeEvent.message)
                        .put("order_id", safeEvent.orderId)
                        .put("amount", safeEvent.amount)
                        .put("currency", safeEvent.currency),
                )
                .put("server_time", state.serverTime)

        prefs.edit()
            .putString("display_snapshot_v1", json.toString())
            .apply()
    }

    fun displaySnapshot(): DisplayState? {
        val raw = prefs.getString("display_snapshot_v1", null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            val table = json.getJSONObject("table")
            val event = json.getJSONObject("event")
            val theme = json.optJSONObject("theme") ?: JSONObject()
            DisplayState(
                restaurantName = json.optString("restaurant_name", "PayMyDine"),
                restaurantLogoUrl = json.optString(
                    "restaurant_logo",
                    "/brand/paymydine-logo.svg",
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
                    headline = event.optString("headline", "Scan to order"),
                    message = event.optString("message", ""),
                    orderId = event.optLong("order_id"),
                    amount = event.optDouble("amount", 0.0),
                    currency = event.optString("currency", "EUR"),
                ),
                serverTime = json.optString("server_time"),
                theme = DisplayTheme(
                    id = theme.optString(
                        "id",
                        "kazen_japanese",
                    ),
                    background = theme.optString(
                        "background",
                        "#F5F1EB",
                    ),
                    text = theme.optString(
                        "text",
                        "#25231F",
                    ),
                    muted = theme.optString(
                        "muted",
                        "#777168",
                    ),
                    accent = theme.optString(
                        "accent",
                        "#B5413F",
                    ),
                    surface = theme.optString(
                        "surface",
                        "#FBF8F3",
                    ),
                    isDark = theme.optBoolean("is_dark", false),
                ),
            )
        }.getOrNull()
    }

    fun saveDeviceControlState(
        screenState: String,
        brightness: Int,
    ) {
        prefs.edit()
            .putString("device_screen_state", screenState)
            .putInt("device_brightness", brightness.coerceIn(0, 100))
            .apply()
    }

    fun deviceScreenState(): String =
        prefs.getString("device_screen_state", "awake") ?: "awake"

    fun deviceBrightness(): Int =
        prefs.getInt("device_brightness", 80).coerceIn(0, 100)

    companion object {
        private const val KEY_ALIAS = "pmd-table-companion-v1"

        fun normalizeHost(raw: String): String {
            var value = raw.trim().trimEnd('/')
            if (!value.startsWith("https://", ignoreCase = true)) {
                value = "https://$value"
            }
            require(value.startsWith("https://", ignoreCase = true)) {
                "PayMyDine Table Companion requires HTTPS."
            }
            return value
        }
    }

    private fun putSecret(key: String, value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val payload =
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP) +
                "." +
                Base64.encodeToString(
                    cipher.doFinal(value.toByteArray(Charsets.UTF_8)),
                    Base64.NO_WRAP,
                )
        prefs.edit().putString(key, payload).apply()
    }

    private fun getSecret(key: String): String? {
        val payload = prefs.getString(key, null) ?: return null
        val parts = payload.split(".", limit = 2)
        if (parts.size != 2) return null

        return runCatching {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                key(),
                GCMParameterSpec(
                    128,
                    Base64.decode(parts[0], Base64.NO_WRAP),
                ),
            )
            String(
                cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)),
                Charsets.UTF_8,
            )
        }.getOrNull()
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing

        val generator =
            KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                "AndroidKeyStore",
            )
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generator.generateKey()
    }

}
